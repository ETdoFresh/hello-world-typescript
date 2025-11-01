import { Router } from 'express';
import { z } from 'zod';
import { AppConfig, paths } from './config.js';
import { getDatabase } from './database.js';
import { ensureWorkspace, deleteWorkspace } from './workspace-manager.js';
import { getCodexService } from './codex-client.js';
import path from 'path';

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).default('New Session')
});

const messageSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  metadata: z.record(z.unknown()).optional()
});

export const createApiRouter = (config: AppConfig) => {
  const router = Router();
  const db = getDatabase(config);
  const codex = getCodexService(config);

  router.get('/health', async (_req, res) => {
    const codexStatus = codex.describeStatus();
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      databasePath: path.relative(paths.projectRoot, config.databasePath),
      codex: codexStatus
    });
  });

  router.get('/sessions', (_req, res) => {
    const sessions = db.listSessions();
    res.json({ sessions });
  });

  router.post('/sessions', (req, res) => {
    const parseResult = createSessionSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(422).json({ error: parseResult.error.flatten() });
      return;
    }

    const session = db.createSession(parseResult.data.title, config.workspaceRoot);
    ensureWorkspace(session);
    res.status(201).json({ session });
  });

  router.get('/sessions/:sessionId', (req, res) => {
    const session = db.getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const messages = db.listMessages(session.id);
    res.json({ session, messages });
  });

  router.delete('/sessions/:sessionId', (req, res) => {
    const session = db.getSession(req.params.sessionId);
    if (!session) {
      res.status(204).end();
      return;
    }
    deleteWorkspace(session);
    db.deleteSession(session.id);
    res.status(204).end();
  });

  router.post('/sessions/:sessionId/messages', async (req, res) => {
    const session = db.getSession(req.params.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const parseResult = messageSchema.safeParse(req.body ?? {});
    if (!parseResult.success) {
      res.status(422).json({ error: parseResult.error.flatten() });
      return;
    }

    try {
      ensureWorkspace(session);
      const userMessage = db.saveMessage(session.id, 'user', parseResult.data.prompt);
      const codexResult = await codex.runWorkspaceTask({
        prompt: parseResult.data.prompt,
        workspacePath: session.workspacePath,
        metadata: parseResult.data.metadata
      });
      const assistantMessage = db.saveMessage(session.id, 'assistant', codexResult.outputText);
      res.status(201).json({ userMessage, assistantMessage });
    } catch (error) {
      res.status(502).json({ error: error instanceof Error ? error.message : 'Codex request failed' });
    }
  });

  return router;
};
