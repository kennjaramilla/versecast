// CLI entry: start the VerseCast sync server standalone (npm start / npm run dev:server).

import { startServer } from './app.mjs';

const PORT = Number(process.env.PORT) || 4321;

startServer({ port: PORT }).then(({ port, lan }) => {
  console.log('\n  VerseCast server running:');
  console.log(`    Control:  http://localhost:${port}/`);
  console.log(`    Display:  http://localhost:${port}/display   <-- OBS Browser Source URL`);
  if (lan) {
    console.log(`    LAN:      http://${lan}:${port}/   (control from another device on the same WiFi)`);
  }
  console.log('');
});
