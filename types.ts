export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface TheHiveAlert {
  id: string;
  sourceRef: string; // usually an ID or reference
  title: string;
  description: string;
  severity: Severity;
  sourceIp: string; // Extracted artifact
  timestamp: number;
}

export interface GeoCoords {
  lat: number;
  lng: number;
}

// Data structure for the Globe Arc
export interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  name: string; // Alert title
  severity: Severity;
}

// Data structure for the Rings (Impact points)
export interface RingData {
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: string;
}
