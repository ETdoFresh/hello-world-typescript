import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..', '..');

export type NodeEnvironment = 'development' | 'production' | 'test';

export interface AppConfig {
  env: NodeEnvironment;
  port: number;
  host: string;
  databasePath: string;
  workspaceRoot: string;
  codexBinary: string | null;
  apiKey: string | null;
}

const resolvePort = (): number => {
  const fromEnv = Number(process.env.PORT ?? '');
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 3000;
};

const resolveHost = (): string => process.env.HOST ?? '0.0.0.0';

const ensureDirectory = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const locateCodexBinary = (): string | null => {
  if (process.env.CODEX_PATH) {
    return process.env.CODEX_PATH;
  }

  const candidates = process.platform === 'win32' ? ['where codex.exe', 'where codex'] : ['which codex'];

  for (const command of candidates) {
    try {
      const output = execSync(command, { stdio: 'pipe', encoding: 'utf-8' }).trim();
      if (output) {
        const firstLine = output.split(/\r?\n/)[0];
        process.env.CODEX_PATH = firstLine;
        return firstLine;
      }
    } catch {
      // proceed to next strategy
    }
  }

  return null;
};

export const loadConfig = (): AppConfig => {
  const env = (process.env.NODE_ENV as NodeEnvironment) ?? 'development';
  const varDir = path.resolve(projectRoot, 'var');
  const workspaceRoot = path.resolve(projectRoot, 'workspaces');
  ensureDirectory(varDir);
  ensureDirectory(workspaceRoot);

  const databasePath = path.resolve(varDir, 'chat.db');
  const codexBinary = locateCodexBinary();
  const apiKey = process.env.CODEX_API_KEY ?? process.env.OPENAI_API_KEY ?? null;

  return {
    env,
    port: resolvePort(),
    host: resolveHost(),
    databasePath,
    workspaceRoot,
    codexBinary,
    apiKey
  };
};

export const paths = {
  projectRoot,
  varDir: path.resolve(projectRoot, 'var')
};
