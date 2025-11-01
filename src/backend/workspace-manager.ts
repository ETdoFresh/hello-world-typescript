import fs from 'fs';
import path from 'path';
import { SessionRecord } from './database.js';

export const ensureWorkspace = (session: SessionRecord) => {
  if (!fs.existsSync(session.workspacePath)) {
    fs.mkdirSync(session.workspacePath, { recursive: true });
  }
};

export const deleteWorkspace = (session: SessionRecord) => {
  if (!fs.existsSync(session.workspacePath)) {
    return;
  }

  const removeRecursively = (target: string) => {
    if (fs.statSync(target).isDirectory()) {
      for (const entry of fs.readdirSync(target)) {
        removeRecursively(path.join(target, entry));
      }
      fs.rmdirSync(target);
    } else {
      fs.unlinkSync(target);
    }
  };

  removeRecursively(session.workspacePath);
};
