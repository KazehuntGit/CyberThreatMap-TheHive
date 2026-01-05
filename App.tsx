import React, { useState, useEffect } from 'react';
import CyberGlobe from './components/CyberGlobe';
import HUD from './components/HUD';
import { fetchTheHiveAlerts, ipToGeo } from './services/theHiveService';
import { TheHiveAlert, ArcData, Severity } from './types';

// ==========================================
// CONFIG: SOC LOCATION (Target)
// Default: Jakarta, Indonesia
// ==========================================
const SOC_COORDS = {
  lat: -6.2088,
  lng: 106.8456
};

// Map Severity to Color Codes
const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#ff0000', // Bright Red
  high: '#ef4444',     // Red
  medium: '#f97316',   // Orange
  low: '#3b82f6'       // Blue
};

function App() {
  const [alerts, setAlerts] = useState<TheHiveAlert[]>([]);
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch
    handleFetch();

    // Set up polling interval (10 seconds for real API to respect rate limits)
    const intervalId = setInterval(() => {
      handleFetch();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleFetch = async () => {
    if (isLoading) return; // Prevent overlapping fetches
    setIsLoading(true);

    try {
      const newAlerts = await fetchTheHiveAlerts();
      
      if (newAlerts.length === 0) {
        setIsLoading(false);
        return;
      }

      // Filter out alerts we already have (simple dedup based on ID)
      // Note: In a real stream, you might want a more robust buffer.
      setAlerts(prev => {
        const existingIds = new Set(prev.map(a => a.id));
        const uniqueNewAlerts = newAlerts.filter(a => !existingIds.has(a.id));
        
        if (uniqueNewAlerts.length === 0) return prev;

        const combined = [...prev, ...uniqueNewAlerts];
        // Sort by timestamp descending
        combined.sort((a, b) => b.timestamp - a.timestamp);
        return combined.slice(0, 20); // Keep max 20 latest
      });

      // Resolve Geolocation for new alerts (Async)
      // We only create arcs for alerts that successfully resolve to a location
      const arcPromises = newAlerts.map(async (alert) => {
        // Skip if IP is clearly invalid or private (handled inside ipToGeo but good to check)
        if (!alert.sourceIp || alert.sourceIp === "0.0.0.0") return null;

        const sourceGeo = await ipToGeo(alert.sourceIp);
        
        if (!sourceGeo) return null; // Could not resolve location

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
          return combined.slice(-30); // Keep last 30 arcs
        });
      }

    } catch (e) {
      console.error("Main Loop Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* 3D Globe Layer */}
      <div className="absolute inset-0 z-0">
        <CyberGlobe arcs={arcs} />
      </div>

      {/* UI Overlay Layer */}
      <HUD alerts={alerts} />
      
      {/* Background Grid Effect (CSS Overlay) */}
      <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>
    </div>
  );
}

export default App;
