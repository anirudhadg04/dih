export const PAYMENT_UPI_ID = 'fcbizdgbveu@freecharge';

const TRANSACTION_ID_PATTERN = /(?<!\d)\d{12}(?!\d)/g;
const EXPLICIT_UTR_PATTERN = /(?:^|\n)\s*utr\s*[:#-]?\s*(\d{12})(?!\d)/gim;
const EXPLICIT_UPI_TRANSACTION_PATTERN = /(?:^|\n)\s*upi\s+transaction\s+id\s*[:#-]?\s*(\d{12})(?!\d)/gim;
const EXCLUDED_TRANSACTION_LABEL_PATTERN = /google\s+transaction\s+id|transaction\s+id\s*\(google\)|bank\s+(?:reference|transaction)\s+number/i;

export function extractTransactionIds(ocrText: string): string[] {
  const explicitUtr = Array.from(ocrText.matchAll(EXPLICIT_UTR_PATTERN), (match) => match[1]);
  if (explicitUtr.length) return Array.from(new Set(explicitUtr));
  const explicitUpiTransaction = Array.from(ocrText.matchAll(EXPLICIT_UPI_TRANSACTION_PATTERN), (match) => match[1]);
  if (explicitUpiTransaction.length) return Array.from(new Set(explicitUpiTransaction));

  const lines = ocrText.split(/\r?\n/);
  return Array.from(new Set(lines
    .filter((line) => !EXCLUDED_TRANSACTION_LABEL_PATTERN.test(line))
    .flatMap((line) => line.match(TRANSACTION_ID_PATTERN) || [])));
}

export function ocrContainsTransactionId(ocrText: string, transactionId: string): boolean {
  return extractTransactionIds(ocrText).some((candidate) => candidate === transactionId);
}
