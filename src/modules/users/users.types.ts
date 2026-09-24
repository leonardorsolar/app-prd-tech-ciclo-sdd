export type UserStatus = 'ativo' | 'inativo';
export type SortField = 'nome' | 'email' | 'criadoEm';
export type SortOrder = 'asc' | 'desc';

export interface ListUsersParams {
  page: number;
  limit: number;
  q?: string;
  status?: UserStatus;
  sort: SortField;
  order: SortOrder;
}

export interface UserDto {
  id: number;
  nome: string;
  email: string;
  status: UserStatus;
  criadoEm: string;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListUsersResult {
  data: UserDto[];
  meta: ListMeta;
}
