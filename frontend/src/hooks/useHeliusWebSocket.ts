import { useEffect, useState, useCallback, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import { heliusWebSocket, WebSocketEventType, WebSocketEvent } from '@/services/helius-websocket';

export interface UseHeliusWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnError?: boolean;
  enableAccountTracking?: boolean;
  enableTransactionTracking?: boolean;
  enableSlotTracking?: boolean;
}

export interface WebSocketStatus {
  isConnected: boolean;
  endpoint: string;
  subscriptions: {
    accounts: number;
    transactions: number;
    programs: number;
  };
}

export interface TransactionStatus {
  signature: string;
  status: 'pending' | 'confirmed' | 'failed';
  details?: Record<string, unknown>;
  timestamp: number;
}

export function useHeliusWebSocket(options: UseHeliusWebSocketOptions = {}) {
  const [status, setStatus] = useState<WebSocketStatus | null>(null);
  const [transactionStatuses, setTransactionStatuses] = useState<Map<string, TransactionStatus>>(new Map());
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [accountUpdates, setAccountUpdates] = useState<Map<string, Record<string, unknown>>>(new Map());
  
  const subscriptionsRef = useRef<Map<string, string>>(new Map());
  const eventListenersRef = useRef<Map<WebSocketEventType, (event: WebSocketEvent) => void>>(new Map());

  /**
   * Update WebSocket status
   */
  const updateStatus = useCallback(() => {
    const wsStatus = heliusWebSocket.getConnectionStatus();
    setStatus(wsStatus);
  }, []);

  /**
   * Subscribe to account changes
   */
  const subscribeToAccount = useCallback(async (
    publicKey: PublicKey,
    callback?: (accountInfo: Record<string, unknown>) => void
  ): Promise<string | null> => {
    try {
      const subscriptionKey = await heliusWebSocket.subscribeToAccount(
        publicKey,
        (accountInfo, context) => {
          const update = {
            publicKey: publicKey.toString(),
            accountInfo,
            context,
            balance: accountInfo?.lamports || 0,
            timestamp: Date.now()
          };
          
          setAccountUpdates(prev => new Map(prev.set(publicKey.toString(), update)));
          callback?.(update);
        }
      );
      
      subscriptionsRef.current.set(`account-${publicKey.toString()}`, subscriptionKey);
      updateStatus();
      return subscriptionKey;
    } catch (error) {
      console.error('Failed to subscribe to account:', error);
      return null;
    }
  }, [updateStatus]);

  /**
   * Unsubscribe from account changes
   */
  const unsubscribeFromAccount = useCallback(async (publicKey: PublicKey) => {
    const key = `account-${publicKey.toString()}`;
    const subscriptionKey = subscriptionsRef.current.get(key);
    
    if (subscriptionKey) {
      await heliusWebSocket.unsubscribeFromAccount(subscriptionKey);
      subscriptionsRef.current.delete(key);
      setAccountUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(publicKey.toString());
        return newMap;
      });
      updateStatus();
    }
  }, [updateStatus]);

  /**
   * Monitor transaction confirmation
   */
  const monitorTransaction = useCallback(async (
    signature: string,
    onUpdate?: (status: TransactionStatus) => void
  ): Promise<boolean> => {
    try {
      const initialStatus: TransactionStatus = {
        signature,
        status: 'pending',
        timestamp: Date.now()
      };
      
      setTransactionStatuses(prev => new Map(prev.set(signature, initialStatus)));
      onUpdate?.(initialStatus);

      const subscriptionKey = await heliusWebSocket.subscribeToTransaction(
        signature,
        (confirmation: unknown) => {
          const confirmationData = confirmation as Record<string, unknown>;
          const newStatus: TransactionStatus = {
            signature,
            status: (confirmationData.result as Record<string, unknown>)?.err ? 'failed' : 'confirmed',
            details: confirmationData,
            timestamp: Date.now()
          };
          
          setTransactionStatuses(prev => new Map(prev.set(signature, newStatus)));
          onUpdate?.(newStatus);
          
          setTimeout(() => {
            setTransactionStatuses(prev => {
              const newMap = new Map(prev);
              newMap.delete(signature);
              return newMap;
            });
          }, 5000);
        }
      );
      
      subscriptionsRef.current.set(`transaction-${signature}`, subscriptionKey);
      updateStatus();
      return true;
    } catch (error) {
      const errorStatus: TransactionStatus = {
        signature,
        status: 'failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: Date.now()
      };
      
      setTransactionStatuses(prev => new Map(prev.set(signature, errorStatus)));
      onUpdate?.(errorStatus);
      return false;
    }
  }, [updateStatus]);

  /**
   * Subscribe to slot changes
   */
  const subscribeToSlots = useCallback(async (
    callback?: (slot: number) => void
  ): Promise<string | null> => {
    try {
      const subscriptionKey = await heliusWebSocket.subscribeToSlotChanges((slotInfo) => {
        let slot: number;
        if (typeof slotInfo === 'object' && slotInfo !== null && 'slot' in slotInfo) {
          slot = (slotInfo as { slot: number }).slot;
        } else if (typeof slotInfo === 'number') {
          slot = slotInfo;
        } else {
          console.warn('Unexpected slot info format:', slotInfo);
          return;
        }
        
        setCurrentSlot(slot);
        callback?.(slot);
      });
      
      if (subscriptionKey && subscriptionKey !== 'slot-change-disabled') {
        subscriptionsRef.current.set('slot-changes', subscriptionKey);
      }
      updateStatus();
      return subscriptionKey;
    } catch (error) {
      console.error('Failed to subscribe to slots:', error);
      return null;
    }
  }, [updateStatus]);

  /**
   * Add global event listener
   */
  const addEventListener = useCallback((
    eventType: WebSocketEventType,
    listener: (event: WebSocketEvent) => void
  ) => {
    heliusWebSocket.addEventListener(eventType, listener);
    eventListenersRef.current.set(eventType, listener);
  }, []);

  /**
   * Remove global event listener
   */
  const removeEventListener = useCallback((
    eventType: WebSocketEventType
  ) => {
    const listener = eventListenersRef.current.get(eventType);
    if (listener) {
      heliusWebSocket.removeEventListener(eventType, listener);
      eventListenersRef.current.delete(eventType);
    }
  }, []);

  /**
   * Cleanup all subscriptions
   */
  const cleanup = useCallback(async () => {
    const subscriptions = Array.from(subscriptionsRef.current.entries());
    for (const [key, subscriptionKey] of subscriptions) {
      if (key.startsWith('account-')) {
        await heliusWebSocket.unsubscribeFromAccount(subscriptionKey);
      } else if (key.startsWith('transaction-')) {
        await heliusWebSocket.unsubscribeFromTransaction(subscriptionKey);
      }
    }
    
    const listeners = Array.from(eventListenersRef.current.keys());
    for (const eventType of listeners) {
      removeEventListener(eventType);
    }
    
    subscriptionsRef.current.clear();
    setAccountUpdates(new Map());
    setTransactionStatuses(new Map());
    updateStatus();
  }, [removeEventListener, updateStatus]);

  useEffect(() => {
    updateStatus();
    
    if (options.enableSlotTracking) {
      subscribeToSlots().catch((error) => {
        console.warn('Could not enable slot tracking:', error);
      });
    }
    
    return () => {
      cleanup();
    };
  }, [options.enableSlotTracking, subscribeToSlots, cleanup, updateStatus]);

  useEffect(() => {
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, [updateStatus]);

  return {
    status,
    currentSlot,
    accountUpdates: Object.fromEntries(accountUpdates),
    transactionStatuses: Object.fromEntries(transactionStatuses),
    
    subscribeToAccount,
    unsubscribeFromAccount,
    monitorTransaction,
    subscribeToSlots,
    addEventListener,
    removeEventListener,
    cleanup,
    
    isConnected: status?.isConnected || false,
    totalSubscriptions: status ? status.subscriptions.accounts + status.subscriptions.transactions + status.subscriptions.programs : 0
  };
} 