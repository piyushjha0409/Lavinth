import { useEffect, useRef, useState, useCallback } from 'react';

export interface AlertEvent {
  alertId: string;
  walletAddress: string;
  severity: string;
  title: string;
}

interface UseAlertStreamOptions {
  onAlert?: (alert: AlertEvent) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export function useAlertStream(options: UseAlertStreamOptions = {}) {
  const { onAlert } = options;
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    // Close existing connection
    eventSourceRef.current?.close();

    setStatus('connecting');
    // Connect through the Next.js proxy route — no API key in URL.
    // Auth is handled server-side via the wallet_address cookie.
    const es = new EventSource('/api/alerts/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
    };

    es.addEventListener('alert', (event) => {
      try {
        const data: AlertEvent = JSON.parse(event.data);
        setAlerts((prev) => [data, ...prev].slice(0, 100));
        onAlert?.(data);
      } catch {
        // ignore malformed events
      }
    });

    es.onerror = () => {
      setStatus('error');
      es.close();
      // Auto-reconnect after 5s
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, [onAlert]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { alerts, status, connect, disconnect };
}
