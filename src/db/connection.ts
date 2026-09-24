import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

export type Db = Database.Database;

export function openDatabase(dbPath: string): Db {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schemaSql);
  return db;
}
