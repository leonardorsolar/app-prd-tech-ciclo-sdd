import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/db/connection';

describe('schema', () => {
  it('IT-031: aplica o schema duas vezes sem erro e rejeita status inválido via CHECK', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-'));
    const file = path.join(dir, 'app.db');
    const first = openDatabase(file);
    first.close();
    const db = openDatabase(file);
    const insert = (status: string) =>
      db
        .prepare(
          "INSERT INTO users (nome, email, senha_hash, status, criado_em) VALUES ('A','a@x.com','h',?, '2026-01-01T00:00:00.000Z')",
        )
        .run(status);
    expect(() => insert('banido')).toThrow(/CHECK/);
    expect(() => insert('ativo')).not.toThrow();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
