"use client";

import { useState } from "react";

type SiteLogoProps = {
  className?: string;
};

export function SiteLogo({ className = "" }: SiteLogoProps) {
  const [src, setSrc] = useState("/logo_neorise.png");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="NeoRise logo"
      onError={() => {
        if (src === "/logo_neorise.png") setSrc("/logo.png");
        else if (src === "/logo.png") setSrc("/logo.svg");
      }}
      className={`h-9 w-auto object-contain [filter:drop-shadow(0_0_8px_rgba(255,122,26,0.3))] ${className}`}
    />
  );
}
