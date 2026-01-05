import { TheHiveAlert, GeoCoords, Severity } from '../types';

// ============================================================================
// REAL CONFIGURATION AREA
// ============================================================================
// WARNING: Ensure CORS is enabled on your TheHive instance or use a Proxy.
const THEHIVE_API_URL = "http://192.168.13.202:9000/api/v1/query"; 
const THEHIVE_API_KEY = "7UV19Oj+fgu9MwZ5aragqGiumwI89kal";

// Using a public GeoIP service (Rate limits apply). 
const GEO_API_URL = "https://ipapi.co"; 
// ============================================================================

/**
 * REAL: Fetches Lat/Lng from a public GeoIP API.
 * Returns null if lookup fails (to filter out bad IPs).
 */
export const ipToGeo = async (ip: string): Promise<GeoCoords | null> => {
  // Filter out private/local IPs to save API calls
  if (!ip || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.')) {
    return null;
  }

  try {
    // Add 3s timeout for GeoIP to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${GEO_API_URL}/${ip}/json/`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

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
    // Fail silently for GeoIP to keep the map running
    // console.warn(`Failed to resolve Geo for IP ${ip}`);
    return null;
  }
};

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
        { _name: "eq", field: "status", value: "New" } 
      ]},
      { _name: "sort", properties: [{ date: "desc" }] },
      { _name: "page", from: 0, to: 10 }
    ]
  };

  try {
    // Add 5s timeout to prevent infinite loading state
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${THEHIVE_API_URL}?name=alert-list`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${THEHIVE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Throw error to trigger catch block
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Safety check: Ensure data is an array before mapping
    if (!Array.isArray(data)) {
      console.warn("TheHive API returned non-array data:", data);
      return [];
    }
    
    return data.map((item: any) => {
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

  } catch (error: any) {
    // Re-throw specific errors if needed, or handle them
    // Returning empty array allows the UI to render "No Alerts" instead of crashing
    console.error("Fetch Error:", error.message);
    throw error; // Let App.tsx handle the error state
  }
};