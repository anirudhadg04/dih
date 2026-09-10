export const PAYMENT_UPI_ID = 'fcbizdgbveu@freecharge';

const UPI_PATTERN = /([^\s@,;:()[\]{}]+)\s*@\s*([a-z0-9]+)(?![a-z0-9])/giu;
const ALPHANUMERIC_RUN = /[a-z0-9]+/giu;
const TRANSACTION_ID_PATTERN = /(?<!\d)\d{12}(?!\d)/g;
const KSSEM_TOKEN_PATTERN = /(?<![a-z0-9])kssem(?![a-z0-9])/i;

export function extractTransactionIds(ocrText: string): string[] {
  return ocrText.match(TRANSACTION_ID_PATTERN) || [];
}

export function ocrContainsTransactionId(ocrText: string, transactionId: string): boolean {
  return extractTransactionIds(ocrText).some((candidate) => candidate === transactionId);
}

export function ocrContainsKssemRecipient(ocrText: string): boolean {
  return KSSEM_TOKEN_PATTERN.test(ocrText);
}

function normalizeCandidate(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function visibleObservations(value: string): string[] {
  const observations: string[] = [];
  for (const run of value.match(ALPHANUMERIC_RUN) || []) {
    let visible = '';
    let index = 0;
    while (index < run.length) {
      let end = index + 1;
      while (end < run.length && run[end].toLocaleLowerCase() === run[index].toLocaleLowerCase()) end += 1;
      if (end - index === 1) visible += run[index];
      else if (visible) {
        observations.push(visible);
        visible = '';
      }
      index = end;
    }
    if (visible) observations.push(visible);
  }
  return observations;
}

function matchesMaskedLocalPart(candidateLocal: string, expectedLocal: string): boolean {
  const observations = visibleObservations(candidateLocal);
  const visibleCharacterCount = observations.reduce((total, observation) => total + observation.length, 0);

  // A redaction-only candidate has no reliable evidence for the payee.
  if (visibleCharacterCount < 4) return false;

  // Each visible OCR run must be an in-order contiguous observation of the
  // configured local part. Non-alphanumeric runs are unknown/redacted text.
  let searchFrom = 0;
  for (const observation of observations) {
    const position = expectedLocal.indexOf(observation, searchFrom);
    if (position === -1) return false;
    searchFrom = position + observation.length;
  }

  return true;
}

export function ocrContainsExpectedUpi(ocrText: string, expectedUpi = PAYMENT_UPI_ID): boolean {
  const normalizedExpected = normalizeCandidate(expectedUpi);
  const separatorIndex = normalizedExpected.indexOf('@');
  if (separatorIndex <= 0 || separatorIndex === normalizedExpected.length - 1) return false;

  const expectedLocal = normalizedExpected.slice(0, separatorIndex);
  const expectedDomain = normalizedExpected.slice(separatorIndex + 1);
  const candidates = ocrText.match(UPI_PATTERN) || [];

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeCandidate(candidate);
    const candidateSeparatorIndex = normalizedCandidate.indexOf('@');
    if (candidateSeparatorIndex <= 0 || candidateSeparatorIndex === normalizedCandidate.length - 1) return false;

    const candidateLocal = normalizedCandidate.slice(0, candidateSeparatorIndex);
    const candidateDomain = normalizedCandidate.slice(candidateSeparatorIndex + 1);
    return candidateDomain === expectedDomain && matchesMaskedLocalPart(candidateLocal, expectedLocal);
  });
}
