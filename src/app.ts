import express, { type Express } from 'express';
import pino, { type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { createUsersRouter } from './modules/users/users.routes';
import type { UsersService } from './modules/users/users.service';
import { errorHandler, notFound } from './shared/middlewares';

const KNOWN_QUERY_KEYS = new Set(['page', 'limit', 'q', 'status', 'sort', 'order']);

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
          const keys = [...new URLSearchParams(query).keys()];
          return {
            id: req.id,
            method: req.method,
            path,
            // Só nomes conhecidos; o resto vira contagem para não registrar texto arbitrário do cliente.
            queryKeys: keys.filter((key) => KNOWN_QUERY_KEYS.has(key)),
            unknownQueryKeys: keys.filter((key) => !KNOWN_QUERY_KEYS.has(key)).length,
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
