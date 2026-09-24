import { describe, expect, it } from 'vitest';
import { seedDatabase } from '../../scripts/seed';
import { buildApp } from '../helpers/app';

describe('seed', () => {
  it('IT-032: popula usuários e a listagem os retorna com os cinco campos públicos', async () => {
    const { db, http } = buildApp();
    expect(seedDatabase(db, 30)).toBe(30);
    const res = await http.get('/users?limit=100');
    expect(res.body.data).toHaveLength(30);
    for (const item of res.body.data) {
      expect(Object.keys(item).sort()).toEqual(['criadoEm', 'email', 'id', 'nome', 'status']);
    }
    expect(seedDatabase(db, 30)).toBe(0);
  });
});
