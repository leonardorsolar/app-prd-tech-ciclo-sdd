import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/shared/errors';
import { parseListUsersQuery } from '../../src/modules/users/users.schema';

function detailsOf(query: Record<string, unknown>) {
  try {
    parseListUsersQuery(query);
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    return (err as ValidationError).details;
  }
  throw new Error('esperava ValidationError');
}

describe('parseListUsersQuery', () => {
  it('UT-001 (happy): aplica os padrões', () => {
    expect(parseListUsersQuery({})).toEqual({
      page: 1,
      limit: 20,
      sort: 'nome',
      order: 'asc',
      q: undefined,
      status: undefined,
    });
  });

  it('UT-002 (happy): converte todos os parâmetros', () => {
    expect(
      parseListUsersQuery({
        page: '2',
        limit: '50',
        q: 'maria',
        status: 'ativo',
        sort: 'criadoEm',
        order: 'desc',
      }),
    ).toEqual({ page: 2, limit: 50, q: 'maria', status: 'ativo', sort: 'criadoEm', order: 'desc' });
  });

  it('UT-003 (boundary): aceita limit=100', () => {
    expect(parseListUsersQuery({ limit: '100' }).limit).toBe(100);
  });

  it('UT-004 (error): rejeita limit=101', () => {
    expect(detailsOf({ limit: '101' })).toEqual([
      { param: 'limit', message: 'deve ser um inteiro entre 1 e 100' },
    ]);
  });

  it.each([
    ['UT-005', { page: '0' }, 'page'],
    ['UT-006', { page: '-1' }, 'page'],
    ['UT-007', { page: 'abc' }, 'page'],
    ['UT-008', { limit: '1.5' }, 'limit'],
    ['UT-009', { limit: '0' }, 'limit'],
  ])('%s (error): rejeita %j', (_id, query, param) => {
    expect(detailsOf(query).map((d) => d.param)).toEqual([param]);
  });

  it('UT-010 (boundary): aceita page=2147483647', () => {
    expect(parseListUsersQuery({ page: '2147483647' }).page).toBe(2147483647);
  });

  it('UT-011 (boundary): rejeita page=2147483648', () => {
    expect(detailsOf({ page: '2147483648' }).map((d) => d.param)).toEqual(['page']);
  });

  it('UT-012 (boundary): q em branco vira ausente', () => {
    expect(parseListUsersQuery({ q: '   ' }).q).toBeUndefined();
  });

  it('UT-013 (happy): q é aparado', () => {
    expect(parseListUsersQuery({ q: '  maria ' }).q).toBe('maria');
  });

  it('UT-014 (boundary): rejeita q com 101 caracteres', () => {
    const [detail] = detailsOf({ q: 'a'.repeat(101) });
    expect(detail?.param).toBe('q');
    expect(detail?.message).toContain('100');
  });

  it('UT-015 (boundary): aceita q com 100 caracteres', () => {
    expect(parseListUsersQuery({ q: 'a'.repeat(100) }).q).toHaveLength(100);
  });

  it('UT-016 (error): rejeita q com U+FFFD', () => {
    expect(detailsOf({ q: 'ab�' }).map((d) => d.param)).toEqual(['q']);
  });

  it('UT-017 (happy): mantém caracteres especiais literais', () => {
    const q = "100%_\\';--";
    expect(parseListUsersQuery({ q }).q).toBe(q);
  });

  it('UT-018 (boundary): status em branco vira ausente', () => {
    expect(parseListUsersQuery({ status: '' }).status).toBeUndefined();
  });

  it('UT-019 (error): rejeita status desconhecido listando os aceitos', () => {
    const [detail] = detailsOf({ status: 'banido' });
    expect(detail?.param).toBe('status');
    expect(detail?.message).toContain('ativo');
    expect(detail?.message).toContain('inativo');
  });

  it('UT-020 (error): rejeita status=ATIVO (sensível a maiúsculas)', () => {
    expect(detailsOf({ status: 'ATIVO' }).map((d) => d.param)).toEqual(['status']);
  });

  it('UT-021 (error): rejeita status repetido', () => {
    expect(detailsOf({ status: ['ativo', 'inativo'] })).toEqual([
      { param: 'status', message: 'só um valor é aceito' },
    ]);
  });

  it('UT-022 (error): rejeita sort fora da lista', () => {
    const [detail] = detailsOf({ sort: 'senha' });
    expect(detail?.param).toBe('sort');
    for (const field of ['nome', 'email', 'criadoEm']) expect(detail?.message).toContain(field);
  });

  it('UT-023 (error): rejeita order inválido', () => {
    const [detail] = detailsOf({ order: 'up' });
    expect(detail?.param).toBe('order');
    expect(detail?.message).toContain('asc');
    expect(detail?.message).toContain('desc');
  });

  it('UT-024 (error): rejeita injeção em sort', () => {
    expect(detailsOf({ sort: 'nome; DROP TABLE users' }).map((d) => d.param)).toEqual(['sort']);
  });

  it('UT-025 (error): rejeita parâmetro desconhecido', () => {
    expect(detailsOf({ foo: '1' })).toEqual([{ param: 'foo', message: 'parâmetro desconhecido' }]);
  });

  it('UT-026 (error): rejeita page repetido', () => {
    expect(detailsOf({ page: ['1', '2'] })).toEqual([
      { param: 'page', message: 'só um valor é aceito' },
    ]);
  });

  it('UT-027 (error): agrega vários erros', () => {
    expect(detailsOf({ page: '0', limit: '500', status: 'x' }).map((d) => d.param)).toEqual([
      'page',
      'limit',
      'status',
    ]);
  });

  it('UT-028 (error): rejeita page em branco', () => {
    expect(detailsOf({ page: '' }).map((d) => d.param)).toEqual(['page']);
  });

  it('UT-029 (error): rejeita sort em branco', () => {
    expect(detailsOf({ sort: '' }).map((d) => d.param)).toEqual(['sort']);
  });

  it('UT-030 (error): rejeita order em branco', () => {
    expect(detailsOf({ order: '' }).map((d) => d.param)).toEqual(['order']);
  });
});

describe('parseListUsersQuery — revisão 1', () => {
  it('UT-046 (error): rejeita q com NUL ou caractere de controle', () => {
    for (const q of ['\u0000', 'ab\u0001cd', 'a\u007Fb']) {
      expect(detailsOf({ q }).map((d) => d.param)).toEqual(['q']);
    }
  });

  it('UT-047 (boundary): o limite de q conta caracteres Unicode, não unidades UTF-16', () => {
    expect(parseListUsersQuery({ q: '😀'.repeat(60) }).q).toHaveLength(120);
    expect(detailsOf({ q: '😀'.repeat(101) }).map((d) => d.param)).toEqual(['q']);
  });

  it('UT-048 (error): parâmetro de nome vazio gera rótulo legível', () => {
    expect(detailsOf({ '': '1' })).toEqual([{ param: '(nome vazio)', message: 'parâmetro desconhecido' }]);
  });
});
