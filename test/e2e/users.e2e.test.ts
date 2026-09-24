import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type RunningServer } from './harness';

interface User {
  id: number;
  nome: string;
  email: string;
  status: string;
  criadoEm: string;
}
interface ListBody {
  data: User[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

async function list(server: RunningServer, query = ''): Promise<{ status: number; body: any; text: string }> {
  const res = await fetch(`${server.baseUrl}/users${query}`);
  const text = await res.text();
  return { status: res.status, body: JSON.parse(text), text };
}

describe('E2E-001: varredura completa paginada e ordenada (US-001, US-002, US-005)', () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(45);
  });
  afterAll(() => server.stop());

  it('percorre 3 páginas com 45 usuários distintos em ordem crescente de nome', async () => {
    const all: User[] = [];
    for (const page of [1, 2, 3]) {
      const { status, body } = await list(server, `?sort=nome&order=asc&limit=20&page=${page}`);
      expect(status).toBe(200);
      expect((body as ListBody).meta.totalPages).toBe(3);
      all.push(...(body as ListBody).data);
    }
    expect(all).toHaveLength(45);
    expect(new Set(all.map((u) => u.id)).size).toBe(45);
    const names = all.map((u) => u.nome.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });
});

describe('E2E-002: busca com filtro e ordenação (US-003, US-004, US-005)', () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(45);
  });
  afterAll(() => server.stop());

  it('retorna só ativos que contêm "silva", do mais recente ao mais antigo', async () => {
    const everyone = (await list(server, '?limit=100')).body as ListBody;
    const expected = everyone.data.filter(
      (u) => u.status === 'ativo' && `${u.nome} ${u.email}`.toLowerCase().includes('silva'),
    );
    expect(expected.length).toBeGreaterThan(0);

    const { status, body } = await list(server, '?q=silva&status=ativo&sort=criadoEm&order=desc');
    const result = body as ListBody;
    expect(status).toBe(200);
    expect(result.meta.total).toBe(expected.length);
    expect(result.data.every((u) => u.status === 'ativo')).toBe(true);
    const dates = result.data.map((u) => u.criadoEm);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('E2E-003: erro e correção (US-006)', () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(5);
  });
  afterAll(() => server.stop());

  it('recebe 400 com dois detalhes e depois 200 com a chamada corrigida', async () => {
    const bad = await list(server, '?limit=500&foo=1');
    expect(bad.status).toBe(400);
    expect(bad.body.error.details.map((d: { param: string }) => d.param).sort()).toEqual(['foo', 'limit']);
    const good = await list(server, '?limit=100');
    expect(good.status).toBe(200);
  });
});

describe('E2E-004: limites e privacidade (US-007)', () => {
  let server: RunningServer;
  beforeAll(async () => {
    server = await startServer(150);
  });
  afterAll(() => server.stop());

  it('limita a 100 itens e nunca expõe credenciais', async () => {
    const ok = await list(server, '?limit=100');
    expect(ok.status).toBe(200);
    expect((ok.body as ListBody).data).toHaveLength(100);
    expect(ok.text.toLowerCase()).not.toContain('senha');
    expect(ok.text.toLowerCase()).not.toContain('hash');
    const tooMany = await list(server, '?limit=101');
    expect(tooMany.status).toBe(400);
  });
});
