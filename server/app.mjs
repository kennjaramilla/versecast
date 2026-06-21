// VerseCast sync server, as a reusable module.
//
// Holds the single live "what's on screen" state and broadcasts it over a
// WebSocket to every connected client. The control panel pushes updates; the
// display (OBS Browser Source) and any other controls receive them instantly.
//
// Serves the built client (client/dist) when present so the whole app is one
// process the Electron wrapper can launch. Binds to 0.0.0.0 so a second device
// on the same office WiFi/LAN can open the control panel.

import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const blankPane = (versionId) => ({
  versionId,
  ref: null, // { nr, chapter, verse }
  text: '',
  bookName: '',
  reference: '',
  versionLabel: '',
  visible: false,
});

function defaultState() {
  return {
    layout: 1, // 1 | 2 | 3 | 4 visible panes
    linked: false, // linked mode: all panes share one reference, keep own version
    blackout: false, // clear the screen without losing the loaded verses
    panes: [blankPane('kjv'), blankPane('adb'), blankPane('kjv'), blankPane('adb')],
    style: {
      fontFamily: 'Inter',
      fontScale: 1,
      textColor: '#ffffff',
      accentColor: '#ffd34d',
      background: 'transparent', // transparent | dark | gradient
      showReference: true,
      showVersionLabel: true,
      uppercaseReference: false,
      transitionMs: 450,
      textAlign: 'center',
    },
    rev: 0,
  };
}

export function lanAddress() {
  const lan = Object.values(networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal);
  return lan ? lan.address : null;
}

/** Start the server. Resolves once it is listening. */
export function startServer({ port = 4321, clientDist } = {}) {
  const dist = clientDist || join(__dirname, '..', 'client', 'dist');
  let state = defaultState();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, rev: state.rev }));
  app.get('/api/state', (_req, res) => res.json(state));

  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')));
  }

  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  const broadcast = () => {
    const msg = JSON.stringify({ type: 'state', state });
    for (const client of wss.clients) if (client.readyState === 1) client.send(msg);
  };

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'state', state }));
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === 'set' && msg.state) {
        state = { ...msg.state, rev: state.rev + 1 };
        broadcast();
      } else if (msg.type === 'patch' && msg.patch) {
        state = { ...state, ...msg.patch, rev: state.rev + 1 };
        broadcast();
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '0.0.0.0', () => resolve({ server, port, lan: lanAddress() }));
  });
}
