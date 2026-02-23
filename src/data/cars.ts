export type CarStatus = "active" | "hidden" | "sold";
export type FuelType = "Petrol" | "Diesel" | "Hybrid" | "EV";
export type TransmissionType = "Automatic" | "Manual";

export type CarRecord = {
  id: string;
  title: string;
  price: number;
  currency: "USD";
  year: number;
  mileage: number;
  fuel: FuelType;
  transmission: TransmissionType;
  status: CarStatus;
  location: string;
  videoUrl?: string;
  images: string[];
  specs: Record<string, string>;
};

export const carsData: CarRecord[] = [
  {
    id: "NR-1001",
    title: "Toyota Corolla 1.8 Hybrid",
    price: 12800,
    currency: "USD",
    year: 2021,
    mileage: 42300,
    fuel: "Hybrid",
    transmission: "Automatic",
    status: "active",
    location: "Tianjin, China",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    images: ["/globe.svg", "/window.svg", "/file.svg"],
    specs: {
      Engine: "1.8L Hybrid",
      Drive: "FWD",
      Color: "Pearl White",
      Doors: "4",
    },
  },
  {
    id: "NR-1002",
    title: "Nissan X-Trail 2.0",
    price: 15300,
    currency: "USD",
    year: 2020,
    mileage: 55100,
    fuel: "Petrol",
    transmission: "Automatic",
    status: "active",
    location: "Shanghai, China",
    videoUrl: "https://player.vimeo.com/video/76979871",
    images: ["/window.svg", "/next.svg", "/globe.svg"],
    specs: {
      Engine: "2.0L",
      Drive: "AWD",
      Color: "Black",
      Doors: "5",
    },
  },
  {
    id: "NR-1003",
    title: "BYD Qin Plus EV",
    price: 17200,
    currency: "USD",
    year: 2022,
    mileage: 21800,
    fuel: "EV",
    transmission: "Automatic",
    status: "active",
    location: "Guangzhou, China",
    videoUrl: "https://www.youtube.com/embed/aqz-KE-bpKQ",
    images: ["/next.svg", "/globe.svg", "/file.svg"],
    specs: {
      Battery: "57 kWh",
      Range: "500 km",
      Color: "Silver",
      Seats: "5",
    },
  },
  {
    id: "NR-1004",
    title: "Mazda 3 1.5 Skyactiv",
    price: 9900,
    currency: "USD",
    year: 2019,
    mileage: 67800,
    fuel: "Petrol",
    transmission: "Manual",
    status: "active",
    location: "Ningbo, China",
    images: ["/file.svg", "/window.svg", "/next.svg"],
    specs: {
      Engine: "1.5L",
      Drive: "FWD",
      Color: "Red",
      Doors: "4",
    },
  },
  {
    id: "NR-1005",
    title: "Isuzu D-Max 3.0 Diesel",
    price: 18600,
    currency: "USD",
    year: 2021,
    mileage: 60300,
    fuel: "Diesel",
    transmission: "Manual",
    status: "active",
    location: "Qingdao, China",
    images: ["/globe.svg", "/file.svg", "/window.svg"],
    specs: {
      Engine: "3.0L Turbo Diesel",
      Drive: "4WD",
      Color: "Gray",
      Seats: "5",
    },
  },
];

export function getActiveCars(): CarRecord[] {
  return carsData.filter((car) => car.status === "active");
}

export function getCarById(id: string): CarRecord | undefined {
  return carsData.find((car) => car.id === id);
}
