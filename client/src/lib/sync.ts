// WebSocket sync to the VerseCast server. Both the control panel and the OBS
// display use this. The control panel calls `publish` to push new state; the
// display is read-only and just consumes `state`.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveState } from '../shared/types';

function serverURL(): string {
  const { protocol, hostname, port } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  // In dev the client runs on Vite (5173) but the server is on 4321.
  const serverPort = port === '5173' ? '4321' : port || (protocol === 'https:' ? '443' : '80');
  return `${wsProto}//${hostname}:${serverPort}`;
}

export function useSync() {
  const [state, setState] = useState<LiveState | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<LiveState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    let closed = false;
    let retry: ReturnType<typeof setTimeout>;

    const connect = () => {
      const ws = new WebSocket(serverURL());
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 800);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'state') setState(msg.state);
        } catch {
          /* ignore */
        }
      };
    };
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      wsRef.current?.close();
    };
  }, []);

  // Push a full new state. Optimistically applies locally for a snappy UI.
  const publish = useCallback((next: LiveState) => {
    setState(next);
    const ws = wsRef.current;
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'set', state: next }));
    }
  }, []);

  // Convenience: update from the latest state via a producer fn.
  const update = useCallback(
    (fn: (s: LiveState) => LiveState) => {
      const cur = stateRef.current;
      if (!cur) return;
      publish(fn(cur));
    },
    [publish],
  );

  return { state, connected, publish, update };
}
