import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, isRegressionAfterFix } from '../src/version.js';

test('compares numeric versions', () => {
  assert.equal(compareVersions('2.5.18', '2.5.17'), 1);
  assert.equal(compareVersions('2.5.18', '2.5.18'), 0);
  assert.equal(compareVersions('2.5.9', '2.5.10'), -1);
});

test('ignores surrounding whitespace', () => {
  assert.equal(compareVersions(' 2.1.12.1', '2.1.12'), 1);
  assert.equal(compareVersions('2.1.12.1 ', ' 2.1.12.1 '), 0);
});

test('only reports a regression when the applicable version contains the fix', () => {
  assert.equal(isRegressionAfterFix('unauthorized', 'Não homologada', '2.1.12.3'), false);
  assert.equal(isRegressionAfterFix('authorized', '2.1.12.2', '2.1.12.3'), false);
  assert.equal(isRegressionAfterFix('authorized', '2.1.12.3', '2.1.12.3'), true);
  assert.equal(isRegressionAfterFix('version_mismatch', '2.1.12.4', '2.1.12.3'), true);
});
