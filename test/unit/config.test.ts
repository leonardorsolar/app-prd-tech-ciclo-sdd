import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  it('UT-044 (happy): usa PORT 3000 e DATABASE_PATH ./data/app.db por padrão', () => {
    expect(loadConfig({})).toEqual({ port: 3000, databasePath: './data/app.db' });
  });

  it('UT-045 (error): lança erro para PORT inválida', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
