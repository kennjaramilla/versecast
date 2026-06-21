// Electron main process: makes VerseCast a double-click Mac app.
//
// Starts the sync server in-process (so the packaged app is self-contained and
// needs no separate Node install) and opens the control panel in a window. OBS
// points its Browser Source at http://localhost:4321/display on the same Mac,
// or another device on the WiFi can open the control panel via the LAN URL.

import { app, BrowserWindow, shell, Menu, clipboard, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { startServer, lanAddress } from '../server/app.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 4321;
const DISPLAY_URL = `http://localhost:${PORT}/display`;

let win;

async function boot() {
  // In a packaged app the client build lives next to the app resources.
  const clientDist = app.isPackaged
    ? join(process.resourcesPath, 'client', 'dist')
    : join(__dirname, '..', 'client', 'dist');

  await startServer({ port: PORT, clientDist });

  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0b0d12',
    title: 'VerseCast',
    webPreferences: { contextIsolation: true },
  });
  win.loadURL(`http://localhost:${PORT}/`);

  buildMenu();
}

function buildMenu() {
  const lan = lanAddress();
  const template = [
    { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
    {
      label: 'OBS',
      submenu: [
        {
          label: 'Copy Display URL (for OBS Browser Source)',
          click: () => clipboard.writeText(DISPLAY_URL),
        },
        { label: 'Open Display in browser', click: () => shell.openExternal(DISPLAY_URL) },
        {
          label: 'Show connection info',
          click: () =>
            dialog.showMessageBox(win, {
              type: 'info',
              title: 'VerseCast connection info',
              message: 'Add a Browser Source in OBS with this URL:',
              detail:
                `${DISPLAY_URL}\n\n` +
                `Set width/height to your canvas (e.g. 1920×1080).\n\n` +
                (lan
                  ? `To control from another device on the same WiFi, open:\nhttp://${lan}:${PORT}/`
                  : ''),
            }),
        },
      ],
    },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(boot);

app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) boot();
});
