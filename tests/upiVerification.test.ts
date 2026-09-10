import assert from 'node:assert/strict';
import test from 'node:test';
import { extractTransactionIds, ocrContainsTransactionId } from '../src/utils/upiVerification';

test('matches the exact entered 12-digit transaction ID', () => {
  const ocr = 'UPI transaction ID\n129346921001\nTo: KSSEM';
  assert.deepEqual(extractTransactionIds(ocr), ['129346921001']);
  assert.equal(ocrContainsTransactionId(ocr, '129346921001'), true);
});

test('rejects non-exact transaction IDs', () => {
  assert.equal(ocrContainsTransactionId('129346921000', '129346921001'), false);
  assert.equal(ocrContainsTransactionId('1293469210012', '129346921001'), false);
  assert.equal(ocrContainsTransactionId('12934692101', '129346921001'), false);
});

test('prefers labeled UTR values and ignores Google transaction IDs', () => {
  const ocr = 'Google transaction ID\n304219207040\nUTR: 129346921001\nUPI transaction ID 304219207041';
  assert.deepEqual(extractTransactionIds(ocr), ['129346921001']);
  assert.equal(ocrContainsTransactionId(ocr, '129346921001'), true);
  assert.equal(ocrContainsTransactionId(ocr, '304219207040'), false);
});

test('supports the Google Pay UPI transaction ID format', () => {
  assert.deepEqual(extractTransactionIds('UPI transaction ID 129346921001'), ['129346921001']);
});
