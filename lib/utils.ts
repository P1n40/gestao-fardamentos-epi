import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a name to Title Case and removes excess whitespace.
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => {
      // Small words that usually stay lowercase in PT-BR names
      const lowercaseExceptions = ["de", "da", "do", "das", "dos", "e"];
      if (lowercaseExceptions.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Removes non-numeric characters from a string (useful for CPF/Matricula).
 */
export function normalizeNumeric(value: string): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}
