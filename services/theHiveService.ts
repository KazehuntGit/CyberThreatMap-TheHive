import { TheHiveAlert, GeoCoords, Severity } from '../types';

// ============================================================================
// REAL CONFIGURATION AREA
// ============================================================================
// WARNING: Ensure CORS is enabled on your TheHive instance or use a Proxy.
const THEHIVE_API_URL = "http://192.168.13.202:9000/api/v1/query"; 
const THEHIVE_API_KEY = "7UV19Oj+fgu9MwZ5aragqGiumwI89kal";

// Using a public GeoIP service (Rate limits apply). 
// In high-traffic production, replace with a local MaxMind DB or paid service.
const GEO_API_URL = "https://ipapi.co"; 
// ============================================================================

/**
 * REAL: Fetches Lat/Lng from a public GeoIP API.
 * Returns null if lookup fails (to filter out bad IPs).
 */
export const ipToGeo = async (ip: string): Promise<GeoCoords | null> => {
  // Filter out private/local IPs to save API calls
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.')) {
    return null;
  }

  try {
    const response = await fetch(`${GEO_API_URL}/${ip}/json/`);
    if (!response.ok) throw new Error("GeoIP Failed");
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        lat: data.latitude,
        lng: data.longitude
      };
    }
    return null;
  } catch (error) {
    console.warn(`Failed to resolve Geo for IP ${ip}:`, error);
    return null;
  }
};

/**
 * Parses TheHive Severity (1-4) to our string types.
 * TheHive usually uses integer: 1 (Low), 2 (Medium), 3 (High), 4 (Critical)
 */
const mapSeverity = (sevInt: number): Severity => {
  switch (sevInt) {
    case 4: return 'critical';
    case 3: return 'high';
    case 2: return 'medium';
    default: return 'low';
  }
};

/**
 * REAL: Fetches alerts directly from TheHive API.
 */
export const fetchTheHiveAlerts = async (): Promise<TheHiveAlert[]> => {
  const query = {
    query: [
      { _name: "listAlert" },
      { _name: "filter", _and: [
        { _name: "eq", field: "status", value: "New" } // Only fetch 'New' alerts
      ]},
      { _name: "sort", properties: [{ date: "desc" }] },
      { _name: "page", from: 0, to: 10 }
    ]
  };

  try {
    const response = await fetch(`${THEHIVE_API_URL}?name=alert-list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${THEHIVE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      console.error("TheHive API Error:", response.statusText);
      return []; // Return empty on error to keep app alive
    }

    const data = await response.json();
    
    // Map TheHive JSON response to our App's Type
    // Note: We attempt to find an IP in artifacts, or fallback to a custom field
    return data.map((item: any) => {
      // Logic to extract IP: Check artifacts array or use a default field
      // This part depends heavily on how your Cortex analyzers populate data.
      // For now, we look for an artifact with dataType 'ip'
      const ipArtifact = item.artifacts?.find((a: any) => a.dataType === 'ip');
      const extractedIp = ipArtifact ? ipArtifact.data : (item.source || "0.0.0.0");

      return {
        id: item.id,
        sourceRef: item.sourceRef || item.id,
        title: item.title,
        description: item.description || "No description provided",
        severity: mapSeverity(item.severity),
        sourceIp: extractedIp, 
        timestamp: item.date || Date.now()
      };
    });

  } catch (error) {
    console.error("Network Error fetching from TheHive:", error);
    return [];
  }
};