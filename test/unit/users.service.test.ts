import { describe, expect, it } from 'vitest';
import type { UserRow, UsersRepository } from '../../src/modules/users/users.repository';
import { createUsersService } from '../../src/modules/users/users.service';
import type { ListUsersParams } from '../../src/modules/users/users.types';

const params = (over: Partial<ListUsersParams> = {}): ListUsersParams => ({
  page: 1,
  limit: 20,
  sort: 'nome',
  order: 'asc',
  ...over,
});

const row = (id: number): UserRow => ({
  id,
  nome: `U${id}`,
  email: `u${id}@x.com`,
  status: 'ativo',
  criado_em: '2026-01-01T00:00:00.000Z',
});

const fakeRepo = (rows: UserRow[], total: number): UsersRepository => ({
  list: () => ({ rows, total }),
});

describe('createUsersService', () => {
  it('UT-035 (happy): calcula meta com total 45 e limit 20', () => {
    const svc = createUsersService(fakeRepo(Array.from({ length: 20 }, (_, i) => row(i + 1)), 45));
    const result = svc.listUsers(params());
    expect(result.data).toHaveLength(20);
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
  });

  it('UT-036 (boundary): total 0 gera totalPages 0', () => {
    const result = createUsersService(fakeRepo([], 0)).listUsers(params());
    expect(result.data).toEqual([]);
    expect(result.meta.totalPages).toBe(0);
  });

  it('UT-037 (boundary): página além da última mantém meta correto', () => {
    const result = createUsersService(fakeRepo([], 45)).listUsers(params({ page: 9 }));
    expect(result.data).toEqual([]);
    expect(result.meta).toEqual({ page: 9, limit: 20, total: 45, totalPages: 3 });
  });

  it('UT-038 (happy): DTO tem exatamente os cinco campos públicos', () => {
    const leaky = { ...row(1), senha_hash: 'x' } as UserRow;
    const [dto] = createUsersService(fakeRepo([leaky], 1)).listUsers(params()).data;
    expect(Object.keys(dto ?? {}).sort()).toEqual(['criadoEm', 'email', 'id', 'nome', 'status']);
    expect(dto?.criadoEm).toBe('2026-01-01T00:00:00.000Z');
  });

  it('UT-039 (error): propaga erro do repository', () => {
    const repo: UsersRepository = {
      list: () => {
        throw new Error('db closed');
      },
    };
    expect(() => createUsersService(repo).listUsers(params())).toThrow('db closed');
  });
});
