import type { RequestHandler } from 'express';
import { parseListUsersQuery } from './users.schema';
import type { UsersService } from './users.service';

export function createUsersController(service: UsersService): { list: RequestHandler } {
  return {
    list(req, res) {
      const params = parseListUsersQuery(req.query as Record<string, unknown>);
      res.status(200).json(service.listUsers(params));
    },
  };
}
