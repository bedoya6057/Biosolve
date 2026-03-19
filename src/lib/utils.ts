import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// UUID v4 generator with graceful fallback for older mobile browsers.
export function createId() {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;

  // Modern browsers
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }

  // crypto.getRandomValues fallback
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    // Per RFC4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort fallback (not cryptographically strong)
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
