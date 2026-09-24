import { loadConfig } from '../src/config';
import { openDatabase, type Db } from '../src/db/connection';

const FIRST_NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabriela', 'Hugo'];
const LAST_NAMES = ['Silva', 'Souza', 'Lima', 'Costa', 'Pereira'];

/** Insere `count` usuários determinísticos (1 em cada 4 inativo). Reexecutar não duplica e-mails. */
export function seedDatabase(db: Db, count: number): number {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO users (nome, email, senha_hash, status, criado_em)
     VALUES (@nome, @email, @senhaHash, @status, @criadoEm)`,
  );
  const base = Date.UTC(2026, 0, 1);
  let inserted = 0;
  db.transaction(() => {
    for (let i = 0; i < count; i++) {
      const first = FIRST_NAMES[i % FIRST_NAMES.length];
      const last = LAST_NAMES[(i * 3) % LAST_NAMES.length];
      const result = insert.run({
        nome: `${first} ${last} ${i + 1}`,
        email: `usuario${i + 1}@example.com`,
        senhaHash: 'seed-hash',
        status: i % 4 === 3 ? 'inativo' : 'ativo',
        criadoEm: new Date(base + i * 60_000).toISOString(),
      });
      inserted += result.changes;
    }
  })();
  return inserted;
}

if (require.main === module) {
  const count = Number(process.argv[2] ?? 50);
  if (!Number.isInteger(count) || count < 1) {
    console.error('Uso: npm run seed -- <quantidade inteira >= 1>');
    process.exit(1);
  }
  const { databasePath } = loadConfig(process.env);
  const db = openDatabase(databasePath);
  console.log(`${seedDatabase(db, count)} usuários inseridos em ${databasePath}`);
  db.close();
}
