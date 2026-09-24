import { openDatabase, type Db } from '../../src/db/connection';

export interface UserFixture {
  nome: string;
  email: string;
  status: 'ativo' | 'inativo';
  criadoEm: string;
  senhaHash: string;
}

let counter = 0;

export function makeUser(overrides: Partial<UserFixture> = {}): UserFixture {
  counter += 1;
  return {
    nome: `Usuario ${counter}`,
    email: `usuario${counter}@example.com`,
    status: 'ativo',
    criadoEm: new Date(Date.UTC(2026, 0, 1, 0, 0, counter)).toISOString(),
    senhaHash: 'hash-secreto',
    ...overrides,
  };
}

export function createTestDb(): Db {
  return openDatabase(':memory:');
}

export function insertUsers(db: Db, users: UserFixture[]): void {
  const stmt = db.prepare(
    'INSERT INTO users (nome, email, senha_hash, status, criado_em) VALUES (?, ?, ?, ?, ?)',
  );
  db.transaction(() => {
    for (const u of users) stmt.run(u.nome, u.email, u.senhaHash, u.status, u.criadoEm);
  })();
}

export function seedUsers(db: Db, n: number, overrides: Partial<UserFixture> = {}): UserFixture[] {
  const users = Array.from({ length: n }, () => makeUser(overrides));
  insertUsers(db, users);
  return users;
}
