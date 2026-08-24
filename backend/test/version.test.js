import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from '../src/version.js';

test('compares numeric versions', () => {
  assert.equal(compareVersions('2.5.18', '2.5.17'), 1);
  assert.equal(compareVersions('2.5.18', '2.5.18'), 0);
  assert.equal(compareVersions('2.5.9', '2.5.10'), -1);
});

test('ignores surrounding whitespace', () => {
  assert.equal(compareVersions(' 2.1.12.1', '2.1.12'), 1);
  assert.equal(compareVersions('2.1.12.1 ', ' 2.1.12.1 '), 0);
});
