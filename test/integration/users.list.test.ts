import { describe, expect, it } from 'vitest';
import { buildApp } from '../helpers/app';
import { insertUsers, makeUser, seedUsers } from '../helpers/db';

const PUBLIC_KEYS = ['criadoEm', 'email', 'id', 'nome', 'status'];

describe('GET /users — listagem, paginação e limites', () => {
  it('IT-001: 45 usuários, sem credenciais, retorna 20 itens e meta', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 45);
    const res = await http.get('/users');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  it('IT-002: expõe exatamente id, nome, email, status, criadoEm', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 3, { senhaHash: 'segredo-super-secreto' });
    const res = await http.get('/users');
    for (const item of res.body.data) expect(Object.keys(item).sort()).toEqual(PUBLIC_KEYS);
    expect(JSON.stringify(res.body)).not.toContain('senha');
    expect(JSON.stringify(res.body)).not.toContain('segredo');
  });

  it('IT-003: ordenação padrão por nome sem distinção de caixa', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [
      makeUser({ nome: 'bruno' }),
      makeUser({ nome: 'Ana' }),
      makeUser({ nome: 'carla' }),
    ]);
    const res = await http.get('/users');
    expect(res.body.data.map((u: { nome: string }) => u.nome)).toEqual(['Ana', 'bruno', 'carla']);
  });

  it('IT-004: base vazia', async () => {
    const { http } = buildApp();
    const res = await http.get('/users');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
    expect(res.body.meta.totalPages).toBe(0);
  });

  it('IT-005: page=3&limit=20 retorna 5 itens', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 45);
    const res = await http.get('/users?page=3&limit=20');
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta.page).toBe(3);
  });

  it('IT-006: percorrer as páginas retorna cada usuário exatamente uma vez', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 45);
    const ids: number[] = [];
    for (const page of [1, 2, 3]) {
      const res = await http.get(`/users?page=${page}&limit=20`);
      ids.push(...res.body.data.map((u: { id: number }) => u.id));
    }
    expect(ids).toHaveLength(45);
    expect(new Set(ids).size).toBe(45);
  });

  it('IT-007: limit=100 retorna exatamente 100 itens com 150 usuários', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 150);
    const res = await http.get('/users?limit=100');
    expect(res.body.data).toHaveLength(100);
  });

  it('IT-008: limit=101 retorna 400 no parâmetro limit', async () => {
    const { http } = buildApp();
    const res = await http.get('/users?limit=101');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].param).toBe('limit');
  });

  it('IT-009: página além da última retorna lista vazia com meta', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 45);
    for (const page of ['99', '2147483647']) {
      const res = await http.get(`/users?page=${page}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(45);
    }
  });
});

describe('GET /users — busca, filtro e ordenação', () => {
  const people = () => [
    makeUser({ nome: 'Maria Silva', email: 'maria@x.com' }),
    makeUser({ nome: 'João', email: 'joao@y.com' }),
  ];

  it('IT-010: q busca por nome e e-mail sem distinção de caixa', async () => {
    const { db, http } = buildApp();
    insertUsers(db, people());
    for (const q of ['maria', 'SILVA', '@x.com']) {
      const res = await http.get('/users').query({ q });
      expect(res.body.data.map((u: { nome: string }) => u.nome)).toEqual(['Maria Silva']);
      expect(res.body.meta.total).toBe(1);
    }
  });

  it('IT-011: q sem correspondência retorna vazio', async () => {
    const { db, http } = buildApp();
    insertUsers(db, people());
    const res = await http.get('/users?q=zzzz');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.total).toBe(0);
  });

  it('IT-012: q em branco equivale a sem filtro', async () => {
    const { db, http } = buildApp();
    insertUsers(db, people());
    const res = await http.get('/users?q=%20%20');
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
  });

  it('IT-013: %, _ e aspas são literais e não alteram a consulta', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [
      makeUser({ nome: '100% Real' }),
      makeUser({ nome: 'Ana_B' }),
      makeUser({ nome: 'Carlos' }),
    ]);
    const pct = await http.get('/users').query({ q: '%' });
    expect(pct.body.data.map((u: { nome: string }) => u.nome)).toEqual(['100% Real']);
    const underscore = await http.get('/users').query({ q: '_' });
    expect(underscore.body.data.map((u: { nome: string }) => u.nome)).toEqual(['Ana_B']);
    const injection = await http.get('/users').query({ q: "'; DROP TABLE users;--" });
    expect(injection.status).toBe(200);
    expect(injection.body.data).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 3 });
  });

  it('IT-014: acentos exigem correspondência exata; caixa é ignorada', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [makeUser({ nome: 'José' })]);
    expect((await http.get('/users').query({ q: 'jose' })).body.data).toEqual([]);
    expect((await http.get('/users').query({ q: 'José' })).body.data).toHaveLength(1);
    expect((await http.get('/users').query({ q: 'JOS' })).body.data).toHaveLength(1);
  });

  it('IT-015: filtro por status', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [
      ...Array.from({ length: 3 }, () => makeUser({ status: 'ativo' })),
      ...Array.from({ length: 2 }, () => makeUser({ status: 'inativo' })),
    ]);
    expect((await http.get('/users?status=ativo')).body.meta.total).toBe(3);
    expect((await http.get('/users?status=inativo')).body.meta.total).toBe(2);
    expect((await http.get('/users?status=')).body.meta.total).toBe(5);
    expect((await http.get('/users')).body.meta.total).toBe(5);
  });

  it('IT-016: q e status combinam por E lógico', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [
      makeUser({ nome: 'Maria', status: 'ativo' }),
      makeUser({ nome: 'Mariana', status: 'inativo' }),
      makeUser({ nome: 'João', status: 'ativo' }),
    ]);
    const res = await http.get('/users?q=maria&status=ativo');
    expect(res.body.data.map((u: { nome: string }) => u.nome)).toEqual(['Maria']);
    expect(res.body.meta.total).toBe(1);
  });

  it('IT-017: sort por criadoEm desc, por e-mail e order padrão asc', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [
      makeUser({ nome: 'A', email: 'c@x.com', criadoEm: '2026-01-01T00:00:00.000Z' }),
      makeUser({ nome: 'B', email: 'a@x.com', criadoEm: '2026-03-01T00:00:00.000Z' }),
      makeUser({ nome: 'C', email: 'b@x.com', criadoEm: '2026-02-01T00:00:00.000Z' }),
    ]);
    const names = (body: { data: { nome: string }[] }) => body.data.map((u) => u.nome);
    expect(names((await http.get('/users?sort=criadoEm&order=desc')).body)).toEqual(['B', 'C', 'A']);
    expect(names((await http.get('/users?sort=email')).body)).toEqual(['B', 'C', 'A']);
    expect(names((await http.get('/users?sort=criadoEm')).body)).toEqual(['A', 'C', 'B']);
  });

  it('IT-018: nomes iguais desempatam por id, de forma estável', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 5, { nome: 'Igual' });
    const first = await http.get('/users?sort=nome');
    const second = await http.get('/users?sort=nome');
    const ids = first.body.data.map((u: { id: number }) => u.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(second.body.data.map((u: { id: number }) => u.id)).toEqual(ids);
  });

  it('IT-019: sort fora da lista ou com injeção retorna 400 e preserva a tabela', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 2);
    for (const sort of ['senha', 'nome;DROP TABLE users']) {
      const res = await http.get('/users').query({ sort });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].param).toBe('sort');
    }
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 2 });
  });
});

describe('GET /users — validação e erros', () => {
  it('IT-020: parâmetro desconhecido retorna 400', async () => {
    const res = await buildApp().http.get('/users?foo=1');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].param).toBe('foo');
  });

  it('IT-021: parâmetro repetido retorna 400', async () => {
    const res = await buildApp().http.get('/users?page=1&page=2');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].param).toBe('page');
  });

  it('IT-022: encoding malformado retorna 400 (nunca 500)', async () => {
    const res = await buildApp().http.get('/users?q=%E0%A4%A');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].param).toBe('q');
  });

  it('IT-023: vários erros são listados de uma vez', async () => {
    const res = await buildApp().http.get('/users?page=0&limit=500&status=x&order=up');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details.map((d: { param: string }) => d.param)).toEqual([
      'page',
      'limit',
      'status',
      'order',
    ]);
  });

  it('IT-024: métodos diferentes de leitura retornam 405 com Allow', async () => {
    const { http } = buildApp();
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const res = await http[method]('/users');
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe('GET, HEAD');
      expect(res.body.error.code).toBe('method_not_allowed');
    }
  });

  it('IT-025: falha do banco retorna 500 genérico sem vazar detalhes', async () => {
    const { db, http } = buildApp();
    db.close();
    const res = await http.get('/users');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
    expect(res.body.error.message).toBe('Erro interno');
    expect(res.text).not.toMatch(/sqlite|database|stack|at /i);
  });

  it('IT-030: rota inexistente retorna 404', async () => {
    const res = await buildApp().http.get('/rota-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});

describe('GET /users — revisão 1', () => {
  it('IT-033: q com NUL retorna 400 e não vira busca vazia', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 3);
    const res = await http.get('/users?q=%00');
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].param).toBe('q');
  });
});

describe('GET /users — concorrência, repetição e escala', () => {
  it('IT-026: inserção entre chamadas mantém total coerente em cada resposta', async () => {
    const { db, http } = buildApp();
    seedUsers(db, 30);
    const first = await http.get('/users?limit=20');
    insertUsers(db, [makeUser()]);
    const second = await http.get('/users?limit=20');
    expect(first.body.meta.total).toBe(30);
    expect(second.body.meta.total).toBe(31);
    expect(second.body.data).toHaveLength(20);
  });

  it('IT-027: mesma chamada repetida retorna a mesma resposta sem efeito colateral', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [makeUser({ nome: 'Maria' }), makeUser({ nome: 'João' })]);
    const a = await http.get('/users?q=maria');
    const b = await http.get('/users?q=maria');
    expect(b.body).toEqual(a.body);
    expect(db.prepare('SELECT COUNT(*) AS n FROM users').get()).toEqual({ n: 2 });
  });

  it('IT-028: usuário inativo é listado com status inativo', async () => {
    const { db, http } = buildApp();
    insertUsers(db, [makeUser({ status: 'inativo' })]);
    const res = await http.get('/users');
    expect(res.body.data[0].status).toBe('inativo');
  });

  it('IT-029: 100 mil usuários continuam paginados', async () => {
    const { db, http } = buildApp();
    insertUsers(
      db,
      Array.from({ length: 100_000 }, (_, i) =>
        makeUser({ nome: `user${i}`, email: `user${i}@x.com` }),
      ),
    );
    // Teto folgado (varredura linear esperada); estourar indica hora de avaliar FTS5 (ADR-004).
    const MAX_MS = 2000;
    const t0 = performance.now();
    const res = await http.get('/users');
    const listMs = performance.now() - t0;
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta.total).toBe(100_000);
    const t1 = performance.now();
    const search = await http.get('/users?q=user99999&limit=100');
    const searchMs = performance.now() - t1;
    expect(listMs).toBeLessThan(MAX_MS);
    expect(searchMs).toBeLessThan(MAX_MS);
    expect(search.body.data.length).toBeLessThanOrEqual(100);
    expect(search.body.data).toHaveLength(1);
  });
});
