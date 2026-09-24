export interface AppConfig {
  port: number;
  databasePath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const rawPort = env.PORT ?? '3000';
  if (!/^\d+$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new Error(`PORT inválida: "${rawPort}"`);
  }
  return {
    port: Number(rawPort),
    databasePath: env.DATABASE_PATH ?? './data/app.db',
  };
}
