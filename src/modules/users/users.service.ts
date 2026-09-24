import type { UserRow, UsersRepository } from './users.repository';
import type { ListUsersParams, ListUsersResult, UserDto } from './users.types';

export interface UsersService {
  listUsers(params: ListUsersParams): ListUsersResult;
}

function toDto(row: UserRow): UserDto {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    status: row.status,
    criadoEm: row.criado_em,
  };
}

export function createUsersService(repo: UsersRepository): UsersService {
  return {
    listUsers(params) {
      const { rows, total } = repo.list(params);
      return {
        data: rows.map(toDto),
        meta: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / params.limit),
        },
      };
    },
  };
}
