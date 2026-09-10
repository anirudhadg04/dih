import assert from 'node:assert/strict';
import test from 'node:test';
import { ocrContainsExpectedUpi, extractTransactionIds, ocrContainsTransactionId, ocrContainsKssemRecipient } from '../src/utils/upiVerification';

test('matches the exact entered 12-digit transaction ID and KSSEM recipient', () => {
  const ocr = 'UPI transaction ID\n129346921001\nTo: KSSEM\nCompleted ₹2';
  assert.deepEqual(extractTransactionIds(ocr), ['129346921001']);
  assert.equal(ocrContainsTransactionId(ocr, '129346921001'), true);
  assert.equal(ocrContainsKssemRecipient(ocr), true);
});

test('rejects non-exact transaction IDs and non-standalone KSSEM text', () => {
  assert.equal(ocrContainsTransactionId('129346921000', '129346921001'), false);
  assert.equal(ocrContainsTransactionId('1293469210012', '129346921001'), false);
  assert.equal(ocrContainsTransactionId('12934692101', '129346921001'), false);
  assert.equal(ocrContainsKssemRecipient('payment to KSSEMart'), false);
  assert.equal(ocrContainsKssemRecipient('payment completed'), false);
});

test('accepts full, symbol-masked, positional, and spaced expected UPI IDs', () => {
  for (const value of [
    'fcbizdgbveu@freecharge',
    'fcbizdgb***@freecharge',
    'fcbiz****@freecharge',
    'fcbiz••••@freecharge',
    'fcbizxxxx@freecharge',
    'XXXXbveu@freecharge',
    '••••bveu@freecharge',
    '****bveu@freecharge',
    '....bveu@freecharge',
    'bveu@freecharge',
    'fcbizdgbveu @ freecharge',
    'fcb••dgbveu @ freecharge',
    'fcbiz••••bveu@freecharge',
    'fcbiz....bveu@freecharge'
  ]) {
    assert.equal(ocrContainsExpectedUpi(value), true, value);
  }
});

test('rejects wrong visible characters, wrong domains, and ambiguous IDs', () => {
  for (const value of [
    'kgsoumya1605' + '@okicici',
    'fcbizdgbveu@okicici',
    'fcbizxxxx@okicici',
    'differentuser@freecharge',
    'fcbiz@otherbank',
    'fcbizqgbveu@freecharge',
    'fcbizdgbvex@freecharge',
    'bve@freecharge',
    'cveu@freecharge',
    '••••••••••@freecharge',
    '••••••@freecharge',
    '@freecharge',
    'payment completed on freecharge',
    'payer@example.com and @freecharge'
  ]) {
    assert.equal(ocrContainsExpectedUpi(value), false, value);
  }
});
