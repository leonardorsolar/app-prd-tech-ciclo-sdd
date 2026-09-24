import express, { type Express } from 'express';
import pino, { type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { createUsersRouter } from './modules/users/users.routes';
import type { UsersService } from './modules/users/users.service';
import { errorHandler, notFound } from './shared/middlewares';

export interface AppDeps {
  usersService: UsersService;
  logger?: Logger;
}

export function createApp({ usersService, logger = pino() }: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  // 'simple' usa o parser nativo do Node: sem aninhamento (a[b]=1); repetições viram array.
  app.set('query parser', 'simple');

  app.use(
    pinoHttp({
      logger,
      serializers: {
        // Não registra valores de query (podem conter termos de busca com dados pessoais).
        req: (req) => {
          const [path = '', query = ''] = String(req.url).split('?');
          return {
            id: req.id,
            method: req.method,
            path,
            queryKeys: [...new URLSearchParams(query).keys()],
          };
        },
      },
    }),
  );

  app.use(createUsersRouter(usersService));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
