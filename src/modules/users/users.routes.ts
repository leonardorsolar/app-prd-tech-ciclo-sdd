import { Router } from 'express';
import { methodNotAllowed } from '../../shared/middlewares';
import { createUsersController } from './users.controller';
import type { UsersService } from './users.service';

export function createUsersRouter(service: UsersService): Router {
  const router = Router();
  const controller = createUsersController(service);
  router.get('/users', controller.list);
  router.all('/users', methodNotAllowed);
  return router;
}
