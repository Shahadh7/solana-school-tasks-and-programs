'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Wifi, WifiOff, Users, FileText, Monitor } from 'lucide-react';
import { useHeliusWebSocket } from '@/hooks/useHeliusWebSocket';
import { isUsingHelius, getWebSocketInfo, isUsingDedicatedWebSocket } from '@/lib/rpc-config';

interface WebSocketStatusProps {
  showDetailed?: boolean;
  className?: string;
}

export function WebSocketStatus({ showDetailed = false, className = '' }: WebSocketStatusProps) {
  const {
    status,
    currentSlot,
    isConnected,
    totalSubscriptions,
    accountUpdates,
    transactionStatuses
  } = useHeliusWebSocket({
    enableSlotTracking: true
  });

  const [recentActivity, setRecentActivity] = useState<number>(0);
  const [wsInfo, setWsInfo] = useState<ReturnType<typeof getWebSocketInfo> | null>(null);

  useEffect(() => {
    setWsInfo(getWebSocketInfo());
  }, []);

  useEffect(() => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    let activityCount = 0;
    
    Object.values(accountUpdates).forEach((update: unknown) => {
      if (update && typeof update === 'object' && 'timestamp' in update) {
        if ((update as { timestamp: number }).timestamp > fiveMinutesAgo) {
          activityCount++;
        }
      }
    });
    
    Object.values(transactionStatuses).forEach((status: unknown) => {
      if (status && typeof status === 'object' && 'timestamp' in status) {
        if ((status as { timestamp: number }).timestamp > fiveMinutesAgo) {
          activityCount++;
        }
      }
    });
    
    setRecentActivity(activityCount);
  }, [accountUpdates, transactionStatuses]);

  if (!showDetailed && !isUsingHelius()) {
    return null;
  }

  const ConnectionIcon = isConnected ? Wifi : WifiOff;
  const connectionColor = isConnected ? 'text-green-500' : 'text-red-500';
  const connectionStatus = isConnected ? 'Connected' : 'Disconnected';

  if (!showDetailed) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <ConnectionIcon className={`h-4 w-4 ${connectionColor}`} />
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {connectionStatus}
        </span>
        <span className="px-2 py-1 rounded border text-xs font-medium bg-gray-50 text-gray-700">
          {isUsingHelius() ? 'Helius' : 'Standard RPC'}
          {isUsingDedicatedWebSocket() && ' (Dedicated WS)'}
        </span>
        {totalSubscriptions > 0 && (
          <span className="px-2 py-1 rounded border text-xs font-medium bg-blue-50 text-blue-700">
            {totalSubscriptions} active
          </span>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4" />
          WebSocket Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ConnectionIcon className={`h-4 w-4 ${connectionColor}`} />
            <span className="text-sm font-medium">{connectionStatus}</span>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {connectionStatus}
            </span>
            <span className="px-2 py-1 rounded border text-xs font-medium bg-gray-50 text-gray-700">
              {isUsingHelius() ? 'Helius RPC' : 'Standard RPC'}
              {isUsingDedicatedWebSocket() && ' (Dedicated WS)'}
            </span>
          </div>
        </div>

        {wsInfo && (
          <div className="space-y-2">
            <div className="text-sm font-medium">WebSocket Configuration</div>
            <div className="text-xs text-gray-600 space-y-1">
              <div>
                <span className="font-medium">Type:</span>{' '}
                {wsInfo.isDedicated ? 'Dedicated WebSocket URL' : 'Converted from HTTP'}
              </div>
              <div className="truncate" title={wsInfo.endpoint}>
                <span className="font-medium">WS:</span> {wsInfo.endpoint}
              </div>
              <div className="truncate" title={wsInfo.httpEndpoint}>
                <span className="font-medium">HTTP:</span> {wsInfo.httpEndpoint}
              </div>
            </div>
          </div>
        )}

        {currentSlot && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Slot:</span>
            <span className="font-mono">{currentSlot.toLocaleString()}</span>
          </div>
        )}

        {status && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Active Subscriptions</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{status.subscriptions.accounts}</span>
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{status.subscriptions.transactions}</span>
              </div>
              <div className="flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                <span>{status.subscriptions.programs}</span>
              </div>
            </div>
          </div>
        )}

        {recentActivity > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Recent Activity:</span>
            <span className="px-2 py-1 rounded border text-xs font-medium bg-gray-50 text-gray-700">
              {recentActivity} updates (5m)
            </span>
          </div>
        )}

        {isUsingHelius() && (
          <div className={`text-xs rounded p-2 ${
            isConnected ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'
          }`}>
            {isConnected ? (
              <>
                🚀 Enhanced performance with Helius WebSocket
                {isUsingDedicatedWebSocket() && (
                  <div className="mt-1 text-green-700">
                    ⚡ Using dedicated WebSocket endpoint for optimal speed
                  </div>
                )}
              </>
            ) : (
              <>
                🔧 Helius WebSocket configured but not connected
                <div className="mt-1 text-yellow-700">
                  💡 Connect your wallet or make a transaction to activate WebSocket features
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 