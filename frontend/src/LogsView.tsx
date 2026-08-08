import React, { useEffect, useState, useRef } from 'react';
import './index.css';

export function LogsView() {
  const [assettoLogs, setAssettoLogs] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  
  const assettoEndRef = useRef<HTMLDivElement>(null);
  const auditEndRef = useRef<HTMLDivElement>(null);
  const backendEndRef = useRef<HTMLDivElement>(null);

  const setupWebSocket = (endpoint: string, setLogs: React.Dispatch<React.SetStateAction<string[]>>) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${endpoint}`;
    
    let ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      setLogs(prev => {
        const newLogs = [...prev, event.data];
        if (newLogs.length > 500) return newLogs.slice(newLogs.length - 500);
        return newLogs;
      });
    };
    
    ws.onerror = (err) => {
      console.error(`WebSocket error for ${endpoint}:`, err);
    };

    return ws;
  };

  useEffect(() => {
    const wsAssetto = setupWebSocket('/api/logs/assettoserver', setAssettoLogs);
    const wsAudit = setupWebSocket('/api/logs/audit', setAuditLogs);
    const wsBackend = setupWebSocket('/api/logs/backend', setBackendLogs);

    return () => {
      wsAssetto.close();
      wsAudit.close();
      wsBackend.close();
    };
  }, []);

  useEffect(() => {
    assettoEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assettoLogs]);

  useEffect(() => {
    auditEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [auditLogs]);

  useEffect(() => {
    backendEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [backendLogs]);

  return (
    <div className="card" style={{ maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>Global Logs Dashboard</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* AssettoServer Box */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--primary-color)' }}>AssettoServer</h3>
          <div className="console-widget" style={{ margin: 0, height: '400px', width: '100%', boxSizing: 'border-box' }}>
            {assettoLogs.map((log, i) => (
              <p key={i} className="console-line">{log}</p>
            ))}
            <div ref={assettoEndRef} />
          </div>
        </div>

        {/* Audit Box */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--primary-color)' }}>Audit (Action History)</h3>
          <div className="console-widget" style={{ margin: 0, height: '400px', width: '100%', boxSizing: 'border-box' }}>
            {auditLogs.map((log, i) => (
              <p key={i} className="console-line" style={{ color: '#ffb86c' }}>{log}</p>
            ))}
            <div ref={auditEndRef} />
          </div>
        </div>

        {/* Backend Web GUI Box */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--primary-color)' }}>Web GUI (Backend & Frontend)</h3>
          <div className="console-widget" style={{ margin: 0, height: '400px', width: '100%', boxSizing: 'border-box' }}>
            {backendLogs.map((log, i) => (
              <p key={i} className="console-line">{log}</p>
            ))}
            <div ref={backendEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}
