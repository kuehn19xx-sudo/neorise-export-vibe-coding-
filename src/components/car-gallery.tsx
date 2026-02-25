"use client";

import { useState } from "react";

import { CarImage } from "./car-image";

type CarGalleryProps = {
  images: string[];
  title: string;
};

export function CarGallery({ images, title }: CarGalleryProps) {
  const safeImages = images.length > 0 ? images : ["/placeholder-car.jpg"];
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = safeImages[activeIndex] ?? safeImages[0];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        <CarImage
          src={activeSrc}
          alt={`${title} main image`}
          width={1200}
          height={720}
          className="aspect-[16/10] h-auto w-full object-cover"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {safeImages.map((image, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-lg border transition ${
                isActive ? "border-[#ff7a1a]" : "border-slate-200 hover:border-slate-400"
              }`}
              aria-label={`Show image ${index + 1}`}
            >
              <CarImage
                src={image}
                alt={`${title} thumbnail ${index + 1}`}
                width={180}
                height={120}
                className="aspect-[4/3] h-auto w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
