import DatabaseConstructor, { Database as SQLiteDatabase } from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import { AppConfig } from './config.js';

export interface SessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workspacePath: string;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

class Database {
  private readonly db: SQLiteDatabase;

  constructor(config: AppConfig) {
    this.db = new DatabaseConstructor(config.databasePath);
    this.db.pragma('journal_mode = WAL');
    this.prepareSchema();
  }

  private prepareSchema() {
    const migrateSessions = `
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        workspace_path TEXT NOT NULL
      );
    `;

    const migrateMessages = `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
    `;

    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(migrateSessions);
    this.db.exec(migrateMessages);
  }

  public createSession(title: string, workspaceRoot: string): SessionRecord {
    const id = randomUUID();
    const now = new Date().toISOString();
    const workspacePath = path.join(workspaceRoot, id);

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, title, created_at, updated_at, workspace_path)
      VALUES (@id, @title, @createdAt, @updatedAt, @workspacePath);
    `);

    stmt.run({ id, title, createdAt: now, updatedAt: now, workspacePath });

    return {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      workspacePath
    };
  }

  public listSessions(): SessionRecord[] {
    const stmt = this.db.prepare<unknown, SessionRecord>(`
      SELECT id, title, created_at AS createdAt, updated_at AS updatedAt, workspace_path AS workspacePath
      FROM sessions
      ORDER BY updated_at DESC;
    `);
    return stmt.all();
  }

  public getSession(id: string): SessionRecord | null {
    const stmt = this.db.prepare<unknown, SessionRecord>(`
      SELECT id, title, created_at AS createdAt, updated_at AS updatedAt, workspace_path AS workspacePath
      FROM sessions
      WHERE id = ?;
    `);
    const record = stmt.get(id);
    return record ?? null;
  }

  public saveMessage(sessionId: string, role: MessageRecord['role'], content: string): MessageRecord {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, role, content, created_at)
      VALUES (@id, @sessionId, @role, @content, @createdAt);
    `);

    stmt.run({ id, sessionId, role, content, createdAt });

    const sessionUpdate = this.db.prepare(`
      UPDATE sessions SET updated_at = @updatedAt WHERE id = @sessionId;
    `);
    sessionUpdate.run({ sessionId, updatedAt: createdAt });

    return { id, sessionId, role, content, createdAt };
  }

  public listMessages(sessionId: string): MessageRecord[] {
    const stmt = this.db.prepare<unknown, MessageRecord>(`
      SELECT id, session_id AS sessionId, role, content, created_at AS createdAt
      FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC;
    `);
    return stmt.all(sessionId);
  }

  public deleteSession(id: string) {
    const stmt = this.db.prepare(`DELETE FROM sessions WHERE id = ?;`);
    stmt.run(id);
  }
}

let dbInstance: Database | null = null;

export const getDatabase = (config: AppConfig): Database => {
  if (!dbInstance) {
    dbInstance = new Database(config);
  }
  return dbInstance;
};
