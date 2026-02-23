"use client";

import { useState, useRef, useEffect } from "react";
import ReactCountryFlag from "react-country-flag";
import { useRouter, usePathname } from "next/navigation";

const languages = [
  { code: "en", label: "English", country: "US" },
  { code: "zh", label: "中文", country: "CN" },
  { code: "fr", label: "Français", country: "FR" },
  { code: "ar", label: "العربية", country: "SA" },
  { code: "es", label: "Español", country: "ES" },
  { code: "ru", label: "Русский", country: "RU" },
];

export default function LanguageDropdown({ currentLang }: { currentLang: string }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (lang: string) => {
    const segments = pathname.split("/");
    segments[1] = lang;
    router.push(segments.join("/"));
    setOpen(false);
  };

  const current = languages.find(l => l.code === currentLang);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 border rounded-md bg-white hover:bg-gray-100"
      >
        <ReactCountryFlag
          countryCode={current?.country || "US"}
          svg
          style={{ width: "18px", height: "18px" }}
        />
        <span className="text-sm font-medium uppercase">{currentLang}</span>
      </button>

      {open && (
        <ul className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          {languages.map(lang => (
            <li
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 cursor-pointer"
            >
              <ReactCountryFlag
                countryCode={lang.country}
                svg
                style={{ width: "18px", height: "18px" }}
              />
              {lang.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}