/**
 * Normalizes a US phone number to E.164 (e.g. "+15551234567").
 * Returns null when the input doesn't contain enough digits to be a valid number.
 * Use this everywhere we store or look up SMS recipients so the same number in
 * different formats ((555) 123-4567 vs 5551234567) maps to one canonical record.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (trimmed.startsWith('+') && digits.length >= 10) return `+${digits}`;
  return null;
}
