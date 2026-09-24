import { z } from 'zod';
import { ValidationError, type ErrorDetail } from '../../shared/errors';
import type { ListUsersParams, SortField, SortOrder, UserStatus } from './users.types';

export const MAX_LIMIT = 100;
export const DEFAULT_LIMIT = 20;
export const MAX_PAGE = 2147483647;
export const MAX_Q_LENGTH = 100;

const STATUSES = ['ativo', 'inativo'] as const;
const SORT_FIELDS = ['nome', 'email', 'criadoEm'] as const;
const ORDERS = ['asc', 'desc'] as const;
const KNOWN_PARAMS = ['page', 'limit', 'q', 'status', 'sort', 'order'] as const;

const intInRange = (max: number) =>
  z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(max));

const pageSchema = intInRange(MAX_PAGE);
const limitSchema = intInRange(MAX_LIMIT);
const statusSchema = z.enum(STATUSES);
const sortSchema = z.enum(SORT_FIELDS);
const orderSchema = z.enum(ORDERS);
const qSchema = z
  .string()
  .trim()
  .max(MAX_Q_LENGTH)
  .refine((value) => !value.includes('�'));

const list = (values: readonly string[]) => values.join(', ');

export function parseListUsersQuery(query: Record<string, unknown>): ListUsersParams {
  const details: ErrorDetail[] = [];
  const fail = (param: string, message: string) => details.push({ param, message });

  for (const key of Object.keys(query)) {
    if (!(KNOWN_PARAMS as readonly string[]).includes(key)) {
      fail(key, 'parâmetro desconhecido');
    }
  }

  const raw: Record<string, string | undefined> = {};
  for (const param of KNOWN_PARAMS) {
    const value = query[param];
    if (Array.isArray(value)) {
      fail(param, 'só um valor é aceito');
    } else if (value !== undefined && typeof value !== 'string') {
      fail(param, 'valor inválido');
    } else {
      raw[param] = value;
    }
  }

  let page = 1;
  if (raw.page !== undefined) {
    const parsed = pageSchema.safeParse(raw.page);
    if (parsed.success) page = parsed.data;
    else fail('page', `deve ser um inteiro entre 1 e ${MAX_PAGE}`);
  }

  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const parsed = limitSchema.safeParse(raw.limit);
    if (parsed.success) limit = parsed.data;
    else fail('limit', `deve ser um inteiro entre 1 e ${MAX_LIMIT}`);
  }

  let q: string | undefined;
  if (raw.q !== undefined) {
    const trimmed = raw.q.trim();
    if (trimmed.length > MAX_Q_LENGTH) {
      fail('q', `deve ter no máximo ${MAX_Q_LENGTH} caracteres`);
    } else if (raw.q.includes('�')) {
      fail('q', 'contém encoding inválido');
    } else if (trimmed !== '') {
      q = trimmed;
    }
  }

  let status: UserStatus | undefined;
  if (raw.status !== undefined && raw.status !== '') {
    const parsed = statusSchema.safeParse(raw.status);
    if (parsed.success) status = parsed.data;
    else fail('status', `deve ser um de: ${list(STATUSES)}`);
  }

  let sort: SortField = 'nome';
  if (raw.sort !== undefined) {
    const parsed = sortSchema.safeParse(raw.sort);
    if (parsed.success) sort = parsed.data;
    else fail('sort', `deve ser um de: ${list(SORT_FIELDS)}`);
  }

  let order: SortOrder = 'asc';
  if (raw.order !== undefined) {
    const parsed = orderSchema.safeParse(raw.order);
    if (parsed.success) order = parsed.data;
    else fail('order', `deve ser um de: ${list(ORDERS)}`);
  }

  if (details.length > 0) throw new ValidationError(details);

  return { page, limit, q, status, sort, order };
}
