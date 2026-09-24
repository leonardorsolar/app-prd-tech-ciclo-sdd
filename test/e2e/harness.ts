import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const TSX = path.join(ROOT, 'node_modules', '.bin', 'tsx');

export interface RunningServer {
  baseUrl: string;
  stop(): Promise<void>;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitUntilUp(baseUrl: string, child: ChildProcess): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('servidor terminou antes de responder');
    try {
      await fetch(`${baseUrl}/users?limit=1`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('servidor não respondeu a tempo');
}

/** Sobe o servidor real (processo separado) com um arquivo SQLite temporário semeado. */
export async function startServer(seedCount: number): Promise<RunningServer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'listar-usuarios-e2e-'));
  const env = { ...process.env, DATABASE_PATH: path.join(dir, 'app.db'), PORT: String(await freePort()) };

  const seed = spawnSync(TSX, ['scripts/seed.ts', String(seedCount)], { cwd: ROOT, env });
  if (seed.status !== 0) throw new Error(`seed falhou: ${seed.stderr.toString()}`);

  const child = spawn(TSX, ['src/server.ts'], { cwd: ROOT, env, stdio: 'ignore' });
  const baseUrl = `http://127.0.0.1:${env.PORT}`;
  try {
    await waitUntilUp(baseUrl, child);
  } catch (err) {
    child.kill('SIGKILL');
    fs.rmSync(dir, { recursive: true, force: true });
    throw err;
  }

  return {
    baseUrl,
    async stop() {
      if (child.exitCode === null) {
        const exited = new Promise((resolve) => child.once('exit', resolve));
        child.kill('SIGTERM');
        await exited;
      }
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}
