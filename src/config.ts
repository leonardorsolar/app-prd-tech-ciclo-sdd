export interface AppConfig {
  port: number;
  databasePath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const rawPort = env.PORT ?? '3000';
  if (!/^\d+$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new Error(`PORT inválida: "${rawPort}"`);
  }
  // Vazio viraria banco temporario descartavel no better-sqlite3; falha em vez de perder dados.
  const databasePath = env.DATABASE_PATH ?? './data/app.db';
  if (databasePath.trim() === '') {
    throw new Error('DATABASE_PATH inválido: valor vazio');
  }
  return { port: Number(rawPort), databasePath };
}
