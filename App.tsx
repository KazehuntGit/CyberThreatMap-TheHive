import React, { useState, useEffect } from 'react';
import CyberGlobe from './components/CyberGlobe';
import HUD from './components/HUD';
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

function App() {
  const [alerts, setAlerts] = useState<TheHiveAlert[]>([]);
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');

  useEffect(() => {
    handleFetch();
    const intervalId = setInterval(() => {
      handleFetch();
    }, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const handleFetch = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const newAlerts = await fetchTheHiveAlerts();
      setConnectionStatus('connected');
      
      if (newAlerts.length === 0) {
        setIsLoading(false);
        return;
      }

      setAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const uniqueNewAlerts = newAlerts.filter(a => !existingIds.has(a.id));
        
        if (uniqueNewAlerts.length === 0) return prev;

        const combined = [...prev, ...uniqueNewAlerts];
        combined.sort((a, b) => b.timestamp - a.timestamp);
        return combined.slice(0, 20); 
      });

      const arcPromises = newAlerts.map(async (alert) => {
        if (!alert.sourceIp || alert.sourceIp === "0.0.0.0") return null;
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

      if (validArcs.length > 0) {
        setArcs(prev => {
          const combined = [...prev, ...validArcs];
          return combined.slice(-30);
        });
      }

    } catch (e) {
      console.error("Connection Failed:", e);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 z-0">
        <CyberGlobe arcs={arcs} />
      </div>

      <HUD alerts={alerts} status={connectionStatus} />
      
      <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>
    </div>
  );
}

export default App;