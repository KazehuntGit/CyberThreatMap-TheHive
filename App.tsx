import React, { useState, useEffect, useCallback, useRef } from 'react';
import CyberGlobe from './components/CyberGlobe';
import HUD from './components/HUD';
import ConfigPanel from './components/ConfigPanel';
import { fetchTheHiveAlerts, ipToGeo } from './services/theHiveService';
import { TheHiveAlert, ArcData, Severity } from './types';

const SOC_COORDS = {
  lat: -6.2088,
  lng: 106.8456
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff0000', 
  high: '#ef4444',     
  medium: '#f97316',   
  low: '#3b82f6'       
};

interface AppConfig {
  host: string;
  key: string;
}

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [alerts, setAlerts] = useState<TheHiveAlert[]>([]);
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  
  // Refs to manage the loop without stale closures
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Load from LocalStorage on mount
  useEffect(() => {
    const savedHost = localStorage.getItem('thehive_host');
    const savedKey = localStorage.getItem('thehive_key');
    
    if (savedHost && savedKey) {
      setConfig({ host: savedHost, key: savedKey });
    }
    
    return () => { isMountedRef.current = false; };
  }, []);

  // Save config and trigger state update
  const handleConfigSubmit = (host: string, key: string) => {
    localStorage.setItem('thehive_host', host);
    localStorage.setItem('thehive_key', key);
    setConfig({ host, key });
    setConnectionStatus('connecting');
  };

  // Reset config (Logout)
  const handleResetConfig = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem('thehive_host');
    localStorage.removeItem('thehive_key');
    setConfig(null);
    setConnectionStatus('connecting');
    setAlerts([]);
    setArcs([]);
  };

  // The main data fetching loop
  const runDataLoop = useCallback(async (currentConfig: AppConfig) => {
    if (!isMountedRef.current) return;

    try {
      // Fetch Data
      const newAlerts = await fetchTheHiveAlerts(currentConfig.host, currentConfig.key);
      
      if (isMountedRef.current) {
        setConnectionStatus('connected');
        
        if (newAlerts.length > 0) {
          setAlerts(prev => {
            const existingIds = new Set(prev.map(a => a.id));
            const uniqueNewAlerts = newAlerts.filter(a => !existingIds.has(a.id));
            if (uniqueNewAlerts.length === 0) return prev;
            
            const combined = [...prev, ...uniqueNewAlerts];
            combined.sort((a, b) => b.timestamp - a.timestamp);
            return combined.slice(0, 20); 
          });

          // Process Arcs
          processArcs(newAlerts);
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        console.error("Data Loop Error (Retrying...):", e);
        setConnectionStatus('error');
      }
    } finally {
      // SUSTAINED CONNECTION LOGIC:
      // Schedule next run regardless of success/fail. 
      // Using setTimeout ensures we don't overlap requests if the network is slow.
      if (isMountedRef.current) {
        timerRef.current = setTimeout(() => {
          runDataLoop(currentConfig);
        }, 10000); // 10 seconds interval
      }
    }
  }, []);

  const processArcs = async (newAlerts: TheHiveAlert[]) => {
    const arcPromises = newAlerts.map(async (alert) => {
      if (!alert.sourceIp || alert.sourceIp === "0.0.0.0") return null;
      // Note: In a real high-volume app, we might cache these Geo lookups
      const sourceGeo = await ipToGeo(alert.sourceIp);
      if (!sourceGeo) return null;

      return {
        startLat: sourceGeo.lat,
        startLng: sourceGeo.lng,
        endLat: SOC_COORDS.lat,
        endLng: SOC_COORDS.lng,
        color: SEVERITY_COLORS[alert.severity],
        name: alert.title,
        severity: alert.severity
      } as ArcData;
    });

    const resolvedArcs = await Promise.all(arcPromises);
    const validArcs = resolvedArcs.filter((arc): arc is ArcData => arc !== null);

    if (validArcs.length > 0 && isMountedRef.current) {
      setArcs(prev => {
        const combined = [...prev, ...validArcs];
        return combined.slice(-30);
      });
    }
  };

  // Effect to start/stop the loop when config changes
  useEffect(() => {
    if (config) {
      // Stop any existing timer
      if (timerRef.current) clearTimeout(timerRef.current);
      
      // Start the loop immediately
      runDataLoop(config);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [config, runDataLoop]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Globe Layer */}
      <div className="absolute inset-0 z-0">
        <CyberGlobe arcs={arcs} />
      </div>

      {/* Configuration Modal - Only shows if not configured */}
      {!config && (
        <ConfigPanel onConnect={handleConfigSubmit} />
      )}

      {/* HUD - Only shows if configured */}
      {config && (
        <HUD 
          alerts={alerts} 
          status={connectionStatus} 
          onReset={handleResetConfig}
        />
      )}
      
      {/* Background Noise Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>
    </div>
  );
}

export default App;