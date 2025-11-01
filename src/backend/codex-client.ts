import type { CodexClient, CodexResult } from '@openai/codex-sdk';
import { AppConfig } from './config.js';

const fallbackResponse = `Codex is not configured. Configure CODEX_API_KEY or install the codex CLI, then restart the server.`;

class CodexService {
  private client: CodexClient | null = null;
  private initError: unknown = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly config: AppConfig) {}

  private async loadClient() {
    if (this.client || this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const sdkModule = (await import('@openai/codex-sdk')) as typeof import('@openai/codex-sdk');
        if (typeof sdkModule.CodexClient !== 'function') {
          throw new Error('CodexClient export missing');
        }

        this.client = new sdkModule.CodexClient({
          apiKey: this.config.apiKey ?? undefined,
          binaryPath: this.config.codexBinary ?? undefined
        });
      } catch (error) {
        this.initError = error;
        this.client = null;
      }
    })();

    return this.initPromise;
  }

  public async runWorkspaceTask(params: {
    prompt: string;
    workspacePath: string;
    metadata?: Record<string, unknown>;
  }): Promise<CodexResult> {
    await this.loadClient();

    if (!this.client) {
      return { outputText: fallbackResponse };
    }

    try {
      return await this.client.runTask({
        prompt: params.prompt,
        workspacePath: params.workspacePath,
        metadata: params.metadata
      });
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to execute Codex task'
      );
    }
  }

  public describeStatus() {
    if (this.client) {
      return { ok: true, message: 'Codex ready' };
    }
    if (this.initError) {
      return { ok: false, message: `Codex unavailable: ${String(this.initError)}` };
    }
    if (this.config.apiKey) {
      return { ok: false, message: 'Codex client initializing' };
    }
    return { ok: false, message: 'Codex credentials missing' };
  }
}

let serviceInstance: CodexService | null = null;

export const getCodexService = (config: AppConfig) => {
  if (!serviceInstance) {
    serviceInstance = new CodexService(config);
  }
  return serviceInstance;
};
