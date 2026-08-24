import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../src/db.js';

test('creates release artifact and event log columns', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'central-atualizacao-'));
  const db = openDatabase(path.join(directory, 'test.db'));
  t.after(() => {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  const releaseColumns = db.prepare('PRAGMA table_info(release)').all().map(item => item.name);
  const eventColumns = db.prepare('PRAGMA table_info(terminal_event)').all().map(item => item.name);

  assert.ok(releaseColumns.includes('artifact_type'));
  assert.ok(releaseColumns.includes('original_name'));
  assert.ok(releaseColumns.includes('deadline_at'));
  assert.ok(eventColumns.includes('release_id'));
  assert.ok(releaseColumns.includes('blocked'));
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_user'").get());
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_product'").get());
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_channel'").get());
});
