export const PAYMENT_UPI_ID = 'fcbizdgbveu@freecharge';

const UPI_PATTERN = /([^\s@,;:()[\]{}]+)\s*@\s*([a-z0-9]+)(?![a-z0-9])/giu;

function normalizeCandidate(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function isRepeatedRedactionRun(value: string, start: number): boolean {
  const character = value[start]?.toLocaleLowerCase();
  if (!character || /[^a-z0-9]/u.test(character)) return true;
  return value[start + 1]?.toLocaleLowerCase() === character;
}

function matchesMaskedLocalPart(candidateLocal: string, expectedLocal: string): boolean {
  let pattern = '^';
  let visibleCharacterCount = 0;
  let index = 0;

  while (index < candidateLocal.length) {
    const character = candidateLocal[index];
    if (isRepeatedRedactionRun(candidateLocal, index)) {
      let end = index + 1;
      while (end < candidateLocal.length && candidateLocal[end].toLocaleLowerCase() === character.toLocaleLowerCase()) end += 1;
      pattern += '[a-z0-9]+';
      index = end;
      continue;
    }

    if (!/[a-z0-9]/iu.test(character)) {
      pattern += '[a-z0-9]+';
      index += 1;
      continue;
    }

    visibleCharacterCount += 1;
    pattern += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    index += 1;
  }

  // A heavily obscured local part is not enough evidence to identify the payee.
  if (visibleCharacterCount < 4) return false;
  pattern += '$';
  return new RegExp(pattern, 'i').test(expectedLocal);
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
