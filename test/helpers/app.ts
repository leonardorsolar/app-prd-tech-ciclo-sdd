import pino from 'pino';
import request from 'supertest';
import { createApp } from '../../src/app';
import type { Db } from '../../src/db/connection';
import { createUsersRepository } from '../../src/modules/users/users.repository';
import { createUsersService } from '../../src/modules/users/users.service';
import { createTestDb } from './db';

export function buildApp(db: Db = createTestDb()) {
  const usersService = createUsersService(createUsersRepository(db));
  const app = createApp({ usersService, logger: pino({ level: 'silent' }) });
  return { db, app, http: request(app) };
}
