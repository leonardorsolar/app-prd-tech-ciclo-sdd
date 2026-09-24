import { describe, expect, it } from 'vitest';
import { buildOrderBy, escapeLike } from '../../src/modules/users/users.repository';
import type { SortField } from '../../src/modules/users/users.types';

describe('funções puras do repository', () => {
  it('UT-031 (happy): escapeLike escapa \\, % e _', () => {
    expect(escapeLike('100%_\\')).toBe('100\\%\\_\\\\');
  });

  it('UT-032 (happy): buildOrderBy nome asc', () => {
    expect(buildOrderBy('nome', 'asc')).toBe('nome COLLATE NOCASE ASC, id ASC');
  });

  it('UT-033 (happy): buildOrderBy criadoEm desc', () => {
    expect(buildOrderBy('criadoEm', 'desc')).toBe('criado_em DESC, id ASC');
  });

  it('UT-034 (error): buildOrderBy rejeita sort fora da whitelist', () => {
    expect(() => buildOrderBy('senha' as SortField, 'asc')).toThrow();
    expect(() => buildOrderBy('constructor' as SortField, 'asc')).toThrow();
  });
});
