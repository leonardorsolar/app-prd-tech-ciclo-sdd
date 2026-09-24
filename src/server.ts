import pino from 'pino';
import { createApp } from './app';
import { loadConfig } from './config';
import { openDatabase } from './db/connection';
import { createUsersRepository } from './modules/users/users.repository';
import { createUsersService } from './modules/users/users.service';

const logger = pino();
const config = loadConfig(process.env);
const db = openDatabase(config.databasePath);
const app = createApp({ usersService: createUsersService(createUsersRepository(db)), logger });

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, databasePath: config.databasePath }, 'servidor iniciado');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'encerrando');
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
