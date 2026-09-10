import assert from 'node:assert/strict';
import test from 'node:test';
import { ocrContainsExpectedUpi } from '../src/utils/upiVerification';

test('accepts full, symbol-masked, positional, and spaced expected UPI IDs', () => {
  for (const value of [
    'fcbizdgbveu@freecharge',
    'fcbizdgb***@freecharge',
    'fcbiz****@freecharge',
    'fcbiz••••@freecharge',
    'fcbizxxxx@freecharge',
    'XXXXbveu@freecharge',
    '••••bveu@freecharge',
    'fcbizdgbveu @ freecharge',
    'fcb••dgbveu @ freecharge'
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
    '••••••••••@freecharge',
    '••••••@freecharge',
    '@freecharge',
    'payment completed on freecharge',
    'payer@example.com and @freecharge'
  ]) {
    assert.equal(ocrContainsExpectedUpi(value), false, value);
  }
});
