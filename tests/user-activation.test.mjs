import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseActivationDate, hasJoinedBy } from '../src/utils/userActivation.mjs';

test('hasJoinedBy returns true when activationDate is absent/null/undefined, regardless of asOfDate', () => {
  const asOfDate = new Date(2026, 0, 1);
  assert.equal(hasJoinedBy({}, asOfDate), true);
  assert.equal(hasJoinedBy({ activationDate: null }, asOfDate), true);
  assert.equal(hasJoinedBy({ activationDate: undefined }, asOfDate), true);
  assert.equal(hasJoinedBy(undefined, asOfDate), true);
  assert.equal(hasJoinedBy(null, asOfDate), true);
});

test('hasJoinedBy returns true when asOfDate is null (all-time), regardless of activationDate', () => {
  assert.equal(hasJoinedBy({ activationDate: '2026-06-01' }, null), true);
  assert.equal(hasJoinedBy({ activationDate: '2099-01-01' }, undefined), true);
  assert.equal(hasJoinedBy({}, null), true);
});

test('hasJoinedBy returns true when activationDate is before asOfDate', () => {
  const asOfDate = new Date(2026, 5, 15);
  assert.equal(hasJoinedBy({ activationDate: '2026-01-01' }, asOfDate), true);
});

test('hasJoinedBy returns true when activationDate equals asOfDate exactly (inclusive boundary)', () => {
  const asOfDate = new Date(2026, 5, 15);
  assert.equal(hasJoinedBy({ activationDate: '2026-06-15' }, asOfDate), true);
});

test('hasJoinedBy returns false when activationDate is after asOfDate', () => {
  const asOfDate = new Date(2026, 5, 15);
  assert.equal(hasJoinedBy({ activationDate: '2026-06-16' }, asOfDate), false);
});

test('parseActivationDate returns null for empty string, null, undefined, and a garbage string', () => {
  assert.equal(parseActivationDate(''), null);
  assert.equal(parseActivationDate(null), null);
  assert.equal(parseActivationDate(undefined), null);
  assert.equal(parseActivationDate('not-a-date'), null);
});

test('parseActivationDate returns a local-midnight Date matching the input Y/M/D (no UTC off-by-one)', () => {
  const d = parseActivationDate('2026-03-15');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 2);
  assert.equal(d.getDate(), 15);
});
