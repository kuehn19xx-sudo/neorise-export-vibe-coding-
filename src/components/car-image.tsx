"use client";

import { useEffect, useState } from "react";

type CarImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
};

export function CarImage({ src, alt, width, height, className }: CarImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setCurrentSrc("/placeholder-car.jpg")}
    />
  );
}
