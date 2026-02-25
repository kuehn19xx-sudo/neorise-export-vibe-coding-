#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ quiet: true });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qqpowupqupbtlowugldh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET_CAR_IMAGES = process.env.SUPABASE_BUCKET_CAR_IMAGES || 'car-images';
const SUPABASE_CAR_IMAGES_PREFIX = process.env.SUPABASE_CAR_IMAGES_PREFIX || 'car';

const SUPPORTED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const REQUIRED_FIELDS = ['brand', 'model', 'title', 'price', 'year', 'mileage', 'engine', 'trans', 'fuel', 'status', 'stock_no'];
const NUMERIC_FIELDS = new Set(['price', 'year', 'mileage']);

function usage() {
  console.error('Usage: node scripts/ingest-car.mjs <folder-path>');
  console.error('Example: node scripts/ingest-car.mjs incoming/NR-0001');
}

function parseInteger(rawValue, key) {
  const digits = String(rawValue).replace(/[^\d-]/g, '');
  if (!digits || digits === '-' || Number.isNaN(Number(digits))) {
    throw new Error(`Invalid numeric value for ${key}: ${rawValue}`);
  }
  return Number.parseInt(digits, 10);
}

function parseCarTxt(content) {
  const result = {};
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const sepIndex = line.indexOf(':');
    if (sepIndex < 0) {
      throw new Error(`Invalid line ${lineNo}: expected "key: value"`);
    }

    const key = line.slice(0, sepIndex).trim();
    const value = line.slice(sepIndex + 1).trim();

    if (!key) {
      throw new Error(`Invalid line ${lineNo}: empty key`);
    }

    if (!value) {
      throw new Error(`Invalid line ${lineNo}: empty value for key ${key}`);
    }

    result[key] = value;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) {
      throw new Error(`Missing required field in car.txt: ${field}`);
    }
  }

  for (const field of NUMERIC_FIELDS) {
    result[field] = parseInteger(result[field], field);
  }

  return result;
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function main() {
  const targetDirArg = process.argv[2];
  if (!targetDirArg) {
    usage();
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const targetDir = path.resolve(process.cwd(), targetDirArg);
  const carTxtPath = path.join(targetDir, 'car.txt');

  const carTxtContent = await fs.readFile(carTxtPath, 'utf8');
  const carData = parseCarTxt(carTxtContent);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: createdCar, error: carInsertError } = await supabase
    .from('cars')
    .insert({
      brand: carData.brand,
      model: carData.model,
      title: carData.title,
      price: carData.price,
      year: carData.year,
      mileage: carData.mileage,
      engine: carData.engine,
      trans: carData.trans,
      fuel: carData.fuel,
      status: carData.status,
      stock_no: carData.stock_no,
    })
    .select('*')
    .single();

  if (carInsertError) {
    throw new Error(`Failed to insert into public.cars: ${carInsertError.message}`);
  }

  const carId = createdCar?.car_id ?? createdCar?.id;
  if (!carId) {
    throw new Error('Insert succeeded but no car_id/id was returned from public.cars');
  }

  console.log(`Created car id: ${carId}`);

  const dirEntries = await fs.readdir(targetDir, { withFileTypes: true });
  const imageFiles = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => SUPPORTED_IMAGE_EXTS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const uploaded = [];
  for (const fileName of imageFiles) {
    const filePath = path.join(targetDir, fileName);
    const fileBuffer = await fs.readFile(filePath);
    const storagePath = `${SUPABASE_CAR_IMAGES_PREFIX}/${carId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_BUCKET_CAR_IMAGES)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(fileName),
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(SUPABASE_BUCKET_CAR_IMAGES)
      .getPublicUrl(storagePath);

    if (!publicData?.publicUrl) {
      throw new Error(`Failed to create public URL for ${fileName}`);
    }

    uploaded.push({
      fileName,
      image_url: publicData.publicUrl,
    });
  }

  let insertedRows = 0;

  if (uploaded.length > 0) {
    const { data: existingRows, error: existingError } = await supabase
      .from('car_images')
      .select('image_url')
      .eq('car_id', carId);

    if (existingError) {
      throw new Error(`Failed to read existing public.car_images: ${existingError.message}`);
    }

    const existingUrls = new Set((existingRows || []).map((row) => row.image_url));

    const rowsToInsert = uploaded
      .filter((item) => !existingUrls.has(item.image_url))
      .map((item, idx) => ({
        car_id: carId,
        image_url: item.image_url,
        sort_order: idx,
      }));

    if (rowsToInsert.length > 0) {
      const { error: imageInsertError } = await supabase
        .from('car_images')
        .insert(rowsToInsert);

      if (imageInsertError) {
        throw new Error(`Failed to insert into public.car_images: ${imageInsertError.message}`);
      }

      insertedRows = rowsToInsert.length;
    }
  }

  console.log(`Inserted ${insertedRows} car_images rows`);
  console.log('DONE');
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`ERROR: ${message}`);
  process.exit(1);
});
