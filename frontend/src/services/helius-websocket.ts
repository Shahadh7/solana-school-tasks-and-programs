import { Connection, PublicKey, AccountInfo, Context, GetProgramAccountsFilter } from '@solana/web3.js';
import { createOptimizedConnection, isUsingHelius, getWebSocketEndpoint, isUsingDedicatedWebSocket } from '@/lib/rpc-config';

export interface HeliusWebSocketConfig {
  endpoint: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export interface AccountSubscription {
  id: string;
  publicKey: PublicKey;
  callback: (accountInfo: AccountInfo<Buffer> | null, context: Context) => void;
}

export interface TransactionSubscription {
  id: string;
  signature: string;
  callback: (confirmation: unknown) => void;
}

export interface ProgramSubscription {
  id: string;
  programId: PublicKey;
  callback: (accountInfo: AccountInfo<Buffer> | null, context: Context) => void;
}

export type WebSocketEventType = 
  | 'account-change'
  | 'transaction-confirmation'
  | 'program-account-change'
  | 'slot-change'
  | 'connection-change';

export interface WebSocketEvent {
  type: WebSocketEventType;
  data: unknown;
  timestamp: number;
}

class HeliusWebSocketService {
  private connection: Connection;
  private wsEndpoint: string;
  private isConnected: boolean = false;
  private eventListeners: Map<WebSocketEventType, Set<(event: WebSocketEvent) => void>> = new Map();
  
  private accountSubscriptions: Map<string, number> = new Map();
  private transactionSubscriptions: Map<string, number> = new Map();
  private programSubscriptions: Map<string, number> = new Map();
  
  constructor() {
    this.connection = createOptimizedConnection();
    this.wsEndpoint = this.getWebSocketEndpoint();
    this.initializeEventListeners();
    
    if (isUsingHelius()) {
      if (isUsingDedicatedWebSocket()) {
        console.log('🔌 Helius WebSocket Service initialized with dedicated WebSocket URL');
      } else {
        console.log('🔌 Helius WebSocket Service initialized with converted WebSocket URL');
      }
      console.log('🌐 WebSocket endpoint:', this.wsEndpoint);
    } else {
      console.log('🔌 WebSocket Service initialized with standard Solana RPC');
    }

    this.initializeConnectionCheck().catch((error) => {
      console.warn('Failed to initialize connection status check:', error);
    });
  }

  private getWebSocketEndpoint(): string {
    return getWebSocketEndpoint();
  }

  private initializeEventListeners(): void {
    const eventTypes: WebSocketEventType[] = [
      'account-change',
      'transaction-confirmation',
      'program-account-change',
      'slot-change',
      'connection-change'
    ];
    
    eventTypes.forEach(type => {
      this.eventListeners.set(type, new Set());
    });
  }

  private hasMethod(methodName: string): boolean {
    return typeof ((this.connection as unknown) as Record<string, unknown>)[methodName] === 'function';
  }

  async subscribeToAccount(
    publicKey: PublicKey,
    callback: (accountInfo: AccountInfo<Buffer> | null, context: Context) => void,
    commitment: 'confirmed' | 'finalized' = 'confirmed'
  ): Promise<string> {
    try {
      if (!this.hasMethod('onAccountChange')) {
        throw new Error('onAccountChange method not available in this Solana web3.js version');
      }

      const subscriptionId = await this.connection.onAccountChange(
        publicKey,
        (accountInfo, context) => {
          this.emitEvent('account-change', {
            publicKey: publicKey.toString(),
            accountInfo,
            context
          });
          
          callback(accountInfo, context);
        },
        commitment
      );

      const subscriptionKey = `account-${publicKey.toString()}`;
      this.accountSubscriptions.set(subscriptionKey, subscriptionId);

      console.log(`🔔 Subscribed to account changes: ${publicKey.toString()}`);
      return subscriptionKey;
    } catch (error) {
      console.error('Failed to subscribe to account changes:', error);
      throw error;
    }
  }

  async subscribeToTransaction(
    signature: string,
    callback: (confirmation: unknown) => void,
    commitment: 'confirmed' | 'finalized' = 'confirmed'
  ): Promise<string> {
    try {
      if (!this.hasMethod('onSignature')) {
        throw new Error('onSignature method not available in this Solana web3.js version');
      }

      let subscriptionId: number | null = null;
      
      try {
        subscriptionId = await this.connection.onSignature(
          signature,
          (result, context) => {
            this.emitEvent('transaction-confirmation', {
              signature,
              result,
              context
            });
            
            callback({ signature, result, context });
          },
          commitment
        );
      } catch (error) {
        console.warn('onSignature failed, falling back to polling:', error);
        
        this.pollTransactionStatus(signature, callback, commitment);
        return `poll-${signature}`;
      }

      const subscriptionKey = `transaction-${signature}`;
      this.transactionSubscriptions.set(subscriptionKey, subscriptionId);

      console.log(`🔔 Subscribed to transaction confirmation: ${signature}`);
      return subscriptionKey;
    } catch (error) {
      console.error('Failed to subscribe to transaction confirmation:', error);
      throw error;
    }
  }

  async subscribeToProgramAccounts(
    programId: PublicKey,
    callback: (accountInfo: AccountInfo<Buffer> | null, context: Context) => void,
    filters?: GetProgramAccountsFilter[], 
    commitment: 'confirmed' | 'finalized' = 'confirmed'
  ): Promise<string> {
    try {
      if (!this.hasMethod('onProgramAccountChange')) {
        throw new Error('onProgramAccountChange method not available in this Solana web3.js version');
      }

      const subscriptionId = await this.connection.onProgramAccountChange(
        programId,
        (keyedAccountInfo, context) => {
          this.emitEvent('program-account-change', {
            programId: programId.toString(),
            accountId: keyedAccountInfo.accountId.toString(),
            accountInfo: keyedAccountInfo.accountInfo,
            context
          });
          
          callback(keyedAccountInfo.accountInfo, context);
        },
        commitment,
        filters
      );

      const subscriptionKey = `program-${programId.toString()}`;
      this.programSubscriptions.set(subscriptionKey, subscriptionId);

      console.log(`🔔 Subscribed to program account changes: ${programId.toString()}`);
      return subscriptionKey;
    } catch (error) {
      console.error('Failed to subscribe to program account changes:', error);
      throw error;
    }
  }

  async subscribeToSlotChanges(
    callback: (slotInfo: unknown) => void
  ): Promise<string> {
    try {
      if (!this.hasMethod('onSlotChange')) {
        console.warn('⚠️ onSlotChange not supported in this Solana web3.js version');
        
        if (this.hasMethod('onSlotUpdate')) {
          const subscriptionId = await (this.connection as Connection & { onSlotUpdate: (callback: (slotInfo: unknown) => void) => Promise<number> }).onSlotUpdate((slotInfo: unknown) => {
            this.emitEvent('slot-change', slotInfo);
            
            callback(slotInfo);
          });
          console.log('🔔 Subscribed to slot updates (fallback)');
          return `slot-change-${subscriptionId}`;
        } else {
          throw new Error('Slot subscription not supported in this web3.js version');
        }
      }

      const subscriptionId = await (this.connection as Connection & { onSlotChange: (callback: (slotInfo: unknown) => void) => Promise<number> }).onSlotChange((slotInfo: unknown) => {
        this.emitEvent('slot-change', slotInfo);
        
        callback(slotInfo);
      });

      console.log('🔔 Subscribed to slot changes');
      return `slot-change-${subscriptionId}`;
    } catch (error) {
      console.error('Failed to subscribe to slot changes:', error);
      console.warn('💡 Slot subscription disabled - continuing without real-time slot updates');
      return 'slot-change-disabled';
    }
  }

  async unsubscribeFromAccount(subscriptionKey: string): Promise<void> {
    const subscriptionId = this.accountSubscriptions.get(subscriptionKey);
    if (subscriptionId !== undefined) {
      if (this.hasMethod('removeAccountChangeListener')) {
        await this.connection.removeAccountChangeListener(subscriptionId);
      }
      this.accountSubscriptions.delete(subscriptionKey);
      console.log(`🔕 Unsubscribed from account: ${subscriptionKey}`);
    }
  }

  private async pollTransactionStatus(
    signature: string,
    callback: (confirmation: unknown) => void,
    commitment: 'confirmed' | 'finalized' = 'confirmed'
  ): Promise<void> {
    const maxAttempts = 30; 
    let attempts = 0;

    const poll = async () => {
      try {
        const status = await this.connection.getSignatureStatus(signature, {
          searchTransactionHistory: true
        });

        if (status.value?.confirmationStatus === commitment || 
            status.value?.confirmationStatus === 'finalized') {
          callback({
            signature,
            result: { err: status.value.err },
            context: { slot: 0 }
          });
          return;
        }

        if (status.value?.err) {
          callback({
            signature,
            result: { err: status.value.err },
            context: { slot: 0 }
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); 
        } else {
          callback({
            signature,
            result: { err: 'Transaction confirmation timeout' },
            context: { slot: 0 }
          });
        }
      } catch (error) {
        console.error('Error polling transaction status:', error);
        callback({
          signature,
          result: { err: `Polling error: ${error}` },
          context: { slot: 0 }
        });
      }
    };

    poll();
  }

  async unsubscribeFromTransaction(subscriptionKey: string): Promise<void> {
    const subscriptionId = this.transactionSubscriptions.get(subscriptionKey);
    if (subscriptionId !== undefined) {
      if (this.hasMethod('removeSignatureListener')) {
        await this.connection.removeSignatureListener(subscriptionId);
      }
      this.transactionSubscriptions.delete(subscriptionKey);
      console.log(`🔕 Unsubscribed from transaction: ${subscriptionKey}`);
    }
  }

  async unsubscribeFromProgramAccounts(subscriptionKey: string): Promise<void> {
    const subscriptionId = this.programSubscriptions.get(subscriptionKey);
    if (subscriptionId !== undefined) {
      if (this.hasMethod('removeProgramAccountChangeListener')) {
        await this.connection.removeProgramAccountChangeListener(subscriptionId);
      }
      this.programSubscriptions.delete(subscriptionKey);
      console.log(`🔕 Unsubscribed from program: ${subscriptionKey}`);
    }
  }


  addEventListener(
    eventType: WebSocketEventType,
    listener: (event: WebSocketEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(listener);
    }
  }

  removeEventListener(
    eventType: WebSocketEventType,
    listener: (event: WebSocketEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emitEvent(eventType: WebSocketEventType, data: unknown): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const event: WebSocketEvent = {
        type: eventType,
        data,
        timestamp: Date.now()
      };
      
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, error);
        }
      });
    }
  }

  getConnectionStatus(): {
    isConnected: boolean;
    endpoint: string;
    subscriptions: {
      accounts: number;
      transactions: number;
      programs: number;
    };
  } {
    const hasActiveSubscriptions = this.accountSubscriptions.size > 0 || 
                                  this.transactionSubscriptions.size > 0 || 
                                  this.programSubscriptions.size > 0;
    
    const connectionStatus = hasActiveSubscriptions || !!this.connection;
    
    return {
      isConnected: connectionStatus,
      endpoint: this.wsEndpoint,
      subscriptions: {
        accounts: this.accountSubscriptions.size,
        transactions: this.transactionSubscriptions.size,
        programs: this.programSubscriptions.size,
      }
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.connection.getLatestBlockhash();
      this.isConnected = !!result;
      return this.isConnected;
    } catch (error) {
      console.warn('WebSocket connection test failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  private async initializeConnectionCheck(): Promise<void> {
    await this.testConnection();
    
    setInterval(async () => {
      await this.testConnection();
    }, 30000); 
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up WebSocket subscriptions...');
    
    const accountKeys = Array.from(this.accountSubscriptions.keys());
    for (const key of accountKeys) {
      await this.unsubscribeFromAccount(key);
    }

    const transactionKeys = Array.from(this.transactionSubscriptions.keys());
    for (const key of transactionKeys) {
      await this.unsubscribeFromTransaction(key);
    }

    const programKeys = Array.from(this.programSubscriptions.keys());
    for (const key of programKeys) {
      await this.unsubscribeFromProgramAccounts(key);
    }

    console.log('✅ WebSocket cleanup completed');
  }
}

export const heliusWebSocket = new HeliusWebSocketService();

export default heliusWebSocket; 