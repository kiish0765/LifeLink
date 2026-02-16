import { useEffect, useRef } from 'react';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const ping = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    };
    const interval = setInterval(ping, 45000);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'blood_request') {
          window.dispatchEvent(new CustomEvent('lifelink:blood_request', { detail: msg }));
        }
      } catch {
        // ignore
      }
    };

    return () => {
      clearInterval(interval);
      ws.close();
      wsRef.current = null;
    };
  }, []);

  return wsRef;
}
