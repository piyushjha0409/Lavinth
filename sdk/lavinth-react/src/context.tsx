/**
 * Lavinth React Context
 * Provides Lavinth SDK instance throughout the React app
 */

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import {
  Lavinth,
  LavinthConfig,
  SecurityAlert,
  LavinthEvent,
} from '@lavinth/sdk';

// Context Types
export interface LavinthContextValue {
  sdk: Lavinth | null;
  isInitialized: boolean;
  alerts: SecurityAlert[];
  clearAlerts: () => void;
}

// Create context
const LavinthContext = createContext<LavinthContextValue | null>(null);

// Provider Props
export interface LavinthProviderProps {
  config: LavinthConfig;
  children: React.ReactNode;
  onEvent?: (event: LavinthEvent) => void;
}

/**
 * Lavinth Provider Component
 *
 * Wrap your app with this provider to access Lavinth functionality
 *
 * @example
 * ```tsx
 * <LavinthProvider config={{ apiKey: 'your-api-key' }}>
 *   <App />
 * </LavinthProvider>
 * ```
 */
export function LavinthProvider({
  config,
  children,
  onEvent,
}: LavinthProviderProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create SDK instance
  const sdk = useMemo(() => {
    try {
      const instance = new Lavinth({
        ...config,
        onAlert: (alert) => {
          setAlerts((prev) => [...prev, alert]);
          config.onAlert?.(alert);
        },
      });
      return instance;
    } catch (error) {
      console.error('Failed to initialize Lavinth:', error);
      return null;
    }
  }, [config.apiKey, config.apiUrl, config.environment]);

  // Subscribe to events
  useEffect(() => {
    if (!sdk) return;

    const unsubscribe = sdk.on((event) => {
      onEvent?.(event);

      // Handle alerts
      if (event.type === 'alert') {
        setAlerts((prev) => [...prev, event.data]);
      }
    });

    setIsInitialized(true);

    return unsubscribe;
  }, [sdk, onEvent]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Context value
  const value = useMemo<LavinthContextValue>(
    () => ({
      sdk,
      isInitialized,
      alerts,
      clearAlerts,
    }),
    [sdk, isInitialized, alerts, clearAlerts]
  );

  return (
    <LavinthContext.Provider value={value}>
      {children}
    </LavinthContext.Provider>
  );
}

/**
 * Hook to access Lavinth context
 *
 * @throws Error if used outside LavinthProvider
 */
export function useLavinthContext(): LavinthContextValue {
  const context = useContext(LavinthContext);

  if (!context) {
    throw new Error(
      'useLavinthContext must be used within a LavinthProvider'
    );
  }

  return context;
}

/**
 * Hook to get Lavinth SDK instance
 *
 * @throws Error if SDK is not initialized
 */
export function useLavinth(): Lavinth {
  const { sdk, isInitialized } = useLavinthContext();

  if (!sdk) {
    throw new Error('Lavinth SDK is not initialized');
  }

  return sdk;
}

// Export context for advanced usage
export { LavinthContext };
