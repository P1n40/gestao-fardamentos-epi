/**
 * Standardizes a string for comparison:
 * - Removes accents/diacritics
 * - Trims whitespace
 * - Converts to lowercase
 * - Replaces multiple spaces with a single space
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return "";

  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Normalizes a CPF to contain only digits
 */
export function normalizeCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";
  return cpf.replace(/\D/g, "");
}

/**
 * Validates if a string looks like a valid CPF (length check)
 */
export function isValidCPFFormat(cpf: string): boolean {
  return cpf.length === 11;
}

/**
 * Normalizes name to Title Case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * cleans and standardizes numeric values that might come as strings
 */
export function cleanNumericString(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[^\d]/g, "");
}
