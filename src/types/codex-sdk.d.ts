declare module '@openai/codex-sdk' {
  export interface CodexRunOptions {
    prompt: string;
    workspacePath?: string;
    metadata?: Record<string, unknown>;
  }

  export interface CodexResult {
    outputText: string;
    raw?: unknown;
  }

  export interface CodexClientOptions {
    apiKey?: string;
    binaryPath?: string;
  }

  export class CodexClient {
    constructor(options?: CodexClientOptions);
    runTask(options: CodexRunOptions): Promise<CodexResult>;
  }
}
