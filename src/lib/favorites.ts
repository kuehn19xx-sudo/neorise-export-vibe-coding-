const FAVORITES_KEY = "neorise_favorites";
const FAVORITES_EVENT = "neorise:favorites-updated";
const EMPTY_FAVORITES: string[] = [];
let cachedRaw: string | null | undefined;
let cachedParsed: string[] = EMPTY_FAVORITES;

function parseFavorites(raw: string | null): string[] {
  if (!raw) return EMPTY_FAVORITES;
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.filter((item) => typeof item === "string") : EMPTY_FAVORITES;
  } catch {
    return EMPTY_FAVORITES;
  }
}

export function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;
  const raw = window.localStorage.getItem(FAVORITES_KEY);
  if (raw === cachedRaw) {
    return cachedParsed;
  }

  cachedRaw = raw;
  cachedParsed = parseFavorites(raw);
  return cachedParsed;
}

export function isFavorite(carId: string): boolean {
  return getFavoriteIds().includes(carId);
}

export function setFavoriteIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set(ids));
  const serialized = JSON.stringify(next);
  window.localStorage.setItem(FAVORITES_KEY, serialized);
  cachedRaw = serialized;
  cachedParsed = next;
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function toggleFavorite(carId: string): boolean {
  const current = getFavoriteIds();
  if (current.includes(carId)) {
    setFavoriteIds(current.filter((id) => id !== carId));
    return false;
  }
  setFavoriteIds([...current, carId]);
  return true;
}

export function subscribeFavorites(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(FAVORITES_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(FAVORITES_EVENT, handler);
  };
}

export function getServerFavoriteIds(): string[] {
  return EMPTY_FAVORITES;
}
