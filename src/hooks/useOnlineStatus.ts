import { useState, useEffect, useCallback, useRef } from 'react';
import { Network } from '@capacitor/network';

/**
 * Stable network status hook using Capacitor's Network plugin.
 * 
 * Uses the OS-level network status (via Capacitor) which only triggers
 * when the device actually loses/gains connectivity. Falls back to
 * browser online/offline events if Capacitor is not available.
 * 
 * This replaces the previous aggressive polling approach that caused
 * false positives (flipping to offline when Supabase was slow).
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  const isOnlineRef = useRef(navigator.onLine);
  const isInitializedRef = useRef(false);
  const usingCapacitorRef = useRef(false);

  const setOnlineState = useCallback((next: boolean) => {
    if (isOnlineRef.current !== next) {
      // Going offline: track that we were offline (for sync trigger later)
      if (!next && isInitializedRef.current && isOnlineRef.current) {
        setWasOffline(true);
      }

      isOnlineRef.current = next;
      setIsOnline(next);

      console.log(`[Network] Status changed: ${next ? 'ONLINE' : 'OFFLINE'}`);
    }
  }, []);

  const clearWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  useEffect(() => {
    let networkListenerHandle: any = null;
    let usingBrowserFallback = false;

    // Browser fallback handlers
    const handleOnline = () => {
      console.log('[Network] Browser online event');
      setOnlineState(true);
    };
    const handleOffline = () => {
      console.log('[Network] Browser offline event');
      setOnlineState(false);
    };

    const setup = async () => {
      try {
        // Try to use Capacitor Network plugin (native, reliable)
        const status = await Network.getStatus();
        setOnlineState(status.connected);
        usingCapacitorRef.current = true;

        console.log(`[Network] Capacitor initial status: ${status.connected ? 'connected' : 'disconnected'} (${status.connectionType})`);

        // Listen for native network changes
        networkListenerHandle = await Network.addListener('networkStatusChange', (status) => {
          console.log(`[Network] Capacitor status change: ${status.connected ? 'connected' : 'disconnected'} (${status.connectionType})`);
          setOnlineState(status.connected);
        });
      } catch (error) {
        // Capacitor not available (running in browser without native shell)
        // Fall back to browser events which are still reliable for actual connectivity loss
        console.log('[Network] Capacitor not available, using browser events fallback');
        usingBrowserFallback = true;

        setOnlineState(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
      }

      // Mark as initialized after a short delay (prevents popup on first load)
      setTimeout(() => {
        isInitializedRef.current = true;
      }, 3000);
    };

    setup();

    return () => {
      if (networkListenerHandle) {
        networkListenerHandle.remove();
      }
      if (usingBrowserFallback) {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [setOnlineState]);

  return { isOnline, wasOffline, clearWasOffline };
}
