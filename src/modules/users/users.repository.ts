import type { Db } from '../../db/connection';
import type { ListUsersParams, SortField, SortOrder, UserStatus } from './users.types';

export interface UserRow {
  id: number;
  nome: string;
  email: string;
  status: UserStatus;
  criado_em: string;
}

export interface UsersRepository {
  list(params: ListUsersParams): { rows: UserRow[]; total: number };
}

const SORT_COLUMNS: Record<SortField, string> = {
  nome: 'nome COLLATE NOCASE',
  email: 'email COLLATE NOCASE',
  criadoEm: 'criado_em',
};

const ORDER_DIRECTIONS: Record<SortOrder, string> = { asc: 'ASC', desc: 'DESC' };

export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function buildOrderBy(sort: SortField, order: SortOrder): string {
  const column = Object.hasOwn(SORT_COLUMNS, sort) ? SORT_COLUMNS[sort] : undefined;
  const direction = Object.hasOwn(ORDER_DIRECTIONS, order) ? ORDER_DIRECTIONS[order] : undefined;
  if (!column || !direction) {
    throw new Error(`Ordenação não permitida: sort=${String(sort)} order=${String(order)}`);
  }
  return `${column} ${direction}, id ASC`;
}

export function createUsersRepository(db: Db): UsersRepository {
  return {
    list(params) {
      const conditions: string[] = [];
      const bindings: Record<string, string> = {};
      if (params.q !== undefined) {
        conditions.push("(nome LIKE :pattern ESCAPE '\\' OR email LIKE :pattern ESCAPE '\\')");
        bindings.pattern = `%${escapeLike(params.q)}%`;
      }
      if (params.status !== undefined) {
        conditions.push('status = :status');
        bindings.status = params.status;
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderBy = buildOrderBy(params.sort, params.order);
      const offset = BigInt(params.page - 1) * BigInt(params.limit);

      const read = db.transaction(() => {
        const { total } = db
          .prepare(`SELECT COUNT(*) AS total FROM users ${where}`)
          .get(bindings) as { total: number };
        const rows = db
          .prepare(
            `SELECT id, nome, email, status, criado_em FROM users ${where} ORDER BY ${orderBy} LIMIT :limit OFFSET :offset`,
          )
          .all({ ...bindings, limit: params.limit, offset }) as UserRow[];
        return { rows, total };
      });
      return read.deferred();
    },
  };
}
