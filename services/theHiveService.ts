import { TheHiveAlert, GeoCoords, Severity } from '../types';

// Using a public GeoIP service (Rate limits apply). 
const GEO_API_URL = "https://ipapi.co"; 

/**
 * HELPER: Normalizes the host URL to ensure it has a protocol and no trailing slash.
 * This prevents the browser from treating the IP as a relative path (localhost:3000/IP...).
 */
const normalizeUrl = (inputUrl: string): string => {
  let url = inputUrl.trim();
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // Prepend http:// if missing (and not https)
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
};

/**
 * Checks if TheHive server is reachable via /api/v1/status
 * @param hostUrl The base URL (e.g., http://192.168.1.1:9000)
 * @param apiKey The API Key
 */
export const checkConnection = async (hostUrl: string, apiKey: string): Promise<boolean> => {
  const cleanUrl = normalizeUrl(hostUrl);
  const targetUrl = `${cleanUrl}/api/v1/status`;

  console.log(`[TheHive] Checking Status: ${targetUrl}`);

  try {
    const controller = new AbortController();
    // Increased timeout to 5s for initial handshake
    const timeoutId = setTimeout(() => controller.abort(), 5000); 

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("[TheHive] Connection Successful");
      return true;
    } else {
      console.error("TheHive Status Check Failed:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("TheHive Connection Error:", error);
    return false;
  }
};

/**
 * Fetches Lat/Lng from a public GeoIP API.
 */
export const ipToGeo = async (ip: string): Promise<GeoCoords | null> => {
  if (!ip || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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
    // Silent fail for geo lookup to not spam console
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
 * Fetches alerts directly from TheHive API using the Query endpoint.
 */
export const fetchTheHiveAlerts = async (hostUrl: string, apiKey: string): Promise<TheHiveAlert[]> => {
  const cleanUrl = normalizeUrl(hostUrl);
  const targetUrl = `${cleanUrl}/api/v1/query?name=alert-list`;

  // console.log(`[TheHive] Fetching Alerts: ${targetUrl}`);

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
    const controller = new AbortController();
    // Increased timeout to 10s to allow server processing time
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.warn("[TheHive] Unexpected response format (not array):", data);
      return [];
    }
    
    return data.map((item: any) => {
      // Try to find IP in artifacts first, then source
      const ipArtifact = item.artifacts?.find((a: any) => a.dataType === 'ip');
      // If no artifact, check if 'source' looks like an IP, otherwise fallback
      let extractedIp = ipArtifact ? ipArtifact.data : item.source;
      
      // Basic IP validation regex to avoid sending non-IPs to GeoAPI
      const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
      if (!ipRegex.test(extractedIp)) {
          extractedIp = "0.0.0.0";
      }

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
    console.error(`[TheHive] Fetch Error (${targetUrl}):`, error.message);
    throw error;
  }
};