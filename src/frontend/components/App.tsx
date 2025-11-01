import React, { useEffect, useMemo, useState } from 'react';

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

const api = async <T,>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
};

const formatTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const loadSessions = async () => {
    const data = await api<{ sessions: Session[] }>('/api/sessions');
    setSessions(data.sessions);
    if (!selectedSessionId && data.sessions.length > 0) {
      setSelectedSessionId(data.sessions[0].id);
    }
  };

  const loadMessages = async (sessionId: string) => {
    const data = await api<{ session: Session; messages: Message[] }>(
      '/api/sessions/' + sessionId
    );
    setMessages(data.messages);
    setSessions((current) => {
      const exists = current.some((session) => session.id === data.session.id);
      if (!exists) {
        return [...current, data.session];
      }
      return current.map((session) => (session.id === data.session.id ? data.session : session));
    });
  };

  useEffect(() => {
    loadSessions().catch((error) => setStatus(error.message));
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedSessionId).catch((error) => setStatus(error.message));
  }, [selectedSessionId]);

  const handleCreateSession = async () => {
    try {
      const data = await api<{ session: Session }>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: 'Session ' + new Date().toLocaleTimeString() })
      });
      await loadSessions();
      setSelectedSessionId(data.session.id);
      setStatus(`Session "${data.session.title}" created`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await api<void>(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      await loadSessions();
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setMessages([]);
      }
      setStatus('Session deleted');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to delete session');
    }
  };

  const handleSendPrompt = async () => {
    if (!selectedSession) {
      setStatus('Select or create a session first');
      return;
    }
    if (!prompt.trim()) {
      return;
    }

    setPending(true);
    setStatus('Sending...');

    try {
      const data = await api<{ userMessage: Message; assistantMessage: Message }>(
        `/api/sessions/${selectedSession.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt })
        }
      );
      setMessages((current) => [...current, data.userMessage, data.assistantMessage]);
      await loadSessions();
      setPrompt('');
      setStatus('Response received');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to send prompt');
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleSendPrompt();
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Codex Sessions</h1>
        <button onClick={handleCreateSession}>New Session</button>
        <div className="session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${session.id === selectedSessionId ? 'active' : ''}`}
              onClick={() => setSelectedSessionId(session.id)}
            >
              <span>{session.title}</span>
              <button onClick={(event) => {
                event.stopPropagation();
                handleDeleteSession(session.id);
              }}>×</button>
            </div>
          ))}
          {sessions.length === 0 && <p>No sessions yet. Create one to begin.</p>}
        </div>
      </aside>
      <main className="main-pane">
        <header>
          {selectedSession ? (
            <h2>
              {selectedSession.title}{' '}
              <small>Updated {formatTimestamp(selectedSession.updatedAt)}</small>
            </h2>
          ) : (
            <h2>Select or create a session</h2>
          )}
        </header>
        <section className="chat-window">
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <strong>{message.role === 'user' ? 'You' : 'Codex'}</strong>
              <div>{message.content}</div>
              <footer>{formatTimestamp(message.createdAt)}</footer>
            </article>
          ))}
          {messages.length === 0 && selectedSession && (
            <p>No messages yet. Send a prompt to Codex to get started.</p>
          )}
        </section>
        <section className="composer">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the change you want Codex to make..."
          />
          <button onClick={handleSendPrompt} disabled={pending}>
            {pending ? 'Sending…' : 'Send'}
          </button>
        </section>
        {status && <div className="status-bar">{status}</div>}
      </main>
    </div>
  );
};
