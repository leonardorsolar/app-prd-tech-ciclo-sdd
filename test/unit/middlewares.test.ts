import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../src/shared/errors';
import { errorHandler, methodNotAllowed, notFound } from '../../src/shared/middlewares';

function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    set(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
  };
  return res;
}

const asRes = (r: ReturnType<typeof fakeRes>) => r as unknown as Response;
const req = {} as Request;
const next = vi.fn();

describe('middlewares', () => {
  it('UT-040 (error): errorHandler traduz ValidationError em 400 com details', () => {
    const res = fakeRes();
    errorHandler(new ValidationError([{ param: 'page', message: 'x' }]), req, asRes(res), next);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'validation_error',
        message: 'Parâmetros inválidos',
        details: [{ param: 'page', message: 'x' }],
      },
    });
  });

  it('UT-041 (error): errorHandler transforma erro desconhecido em 500 genérico', () => {
    const res = fakeRes();
    const log = { error: vi.fn() };
    errorHandler(new Error('sqlite exploded'), { log } as unknown as Request, asRes(res), next);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: { code: 'internal_error', message: 'Erro interno' } });
    expect(JSON.stringify(res.body)).not.toContain('sqlite exploded');
    expect(log.error).toHaveBeenCalled();
  });

  it('UT-042 (error): methodNotAllowed responde 405 com Allow', () => {
    const res = fakeRes();
    methodNotAllowed({ method: 'POST' } as Request, asRes(res), next);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, HEAD');
    expect((res.body as { error: { code: string } }).error.code).toBe('method_not_allowed');
  });

  it('UT-043 (error): notFound responde 404 not_found', () => {
    const res = fakeRes();
    notFound(req, asRes(res), next);
    expect(res.statusCode).toBe(404);
    expect((res.body as { error: { code: string } }).error.code).toBe('not_found');
  });
});
