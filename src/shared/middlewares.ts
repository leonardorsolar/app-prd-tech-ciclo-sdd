import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from './errors';

interface LoggerLike {
  error(obj: object, msg?: string): void;
}

export const methodNotAllowed: RequestHandler = (_req, res) => {
  res.set('Allow', 'GET, HEAD');
  res.status(405).json({
    error: { code: 'method_not_allowed', message: 'Método não permitido' },
  });
};

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({
    error: { code: 'not_found', message: 'Rota não encontrada' },
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details.length > 0 ? { details: err.details } : {}),
      },
    });
    return;
  }
  const logger = (req as { log?: LoggerLike }).log;
  if (logger) logger.error({ err }, 'erro interno');
  else console.error(err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Erro interno' },
  });
};
