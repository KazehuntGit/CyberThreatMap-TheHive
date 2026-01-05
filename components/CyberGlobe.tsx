import React, { useEffect, useRef, useState } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import { ArcData, RingData, Severity } from '../types';

interface CyberGlobeProps {
  arcs: ArcData[];
}

const CyberGlobe: React.FC<CyberGlobeProps> = ({ arcs }) => {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [rings, setRings] = useState<RingData[]>([]);

  // Update rings based on arcs (impact effect at destination)
  useEffect(() => {
    const newRings: RingData[] = arcs.map(arc => ({
      lat: arc.endLat,
      lng: arc.endLng,
      maxR: 2,
      propagationSpeed: 2,
      repeatPeriod: 1000,
      color: arc.color
    }));
    setRings(newRings);
  }, [arcs]);

  useEffect(() => {
    // Auto-rotate the globe slowly
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ lat: 20, lng: 106, altitude: 2.5 });
    }
  }, []);

  return (
    <Globe
      ref={globeEl}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      backgroundColor="#000000"
      
      // Atmosphere
      atmosphereColor="#3a86ff"
      atmosphereAltitude={0.15}

      // Arcs (The attacks)
      arcsData={arcs}
      arcColor="color"
      arcDashLength={() => Math.random()}
      arcDashGap={() => Math.random()}
      arcDashAnimateTime={() => Math.random() * 4000 + 500} // Speed varies
      arcStroke={0.5}
      
      // Rings (The Impact)
      ringsData={rings}
      ringColor="color"
      ringMaxRadius="maxR"
      ringPropagationSpeed="propagationSpeed"
      ringRepeatPeriod="repeatPeriod"

      // Labels (Optional source labeling)
      labelsData={arcs}
      labelLat="startLat"
      labelLng="startLng"
      labelText="name"
      labelSize={0.5}
      labelDotRadius={0.3}
      labelColor={() => "rgba(255, 255, 255, 0.75)"}
      labelResolution={2}
    />
  );
};

export default CyberGlobe;
