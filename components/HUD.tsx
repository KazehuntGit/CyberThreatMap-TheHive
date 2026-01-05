import React from 'react';
import { TheHiveAlert, Severity } from '../types';

interface HUDProps {
  alerts: TheHiveAlert[];
  status?: 'connected' | 'error' | 'connecting';
  onReset?: () => void;
}

const getSeverityColor = (severity: Severity) => {
  switch (severity) {
    case 'critical': return 'text-red-500 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
    case 'high': return 'text-red-400 border-red-400';
    case 'medium': return 'text-orange-400 border-orange-400';
    case 'low': return 'text-blue-400 border-blue-400';
    default: return 'text-gray-400 border-gray-400';
  }
};

const HUD: React.FC<HUDProps> = ({ alerts, status = 'connected', onReset }) => {
  return (
    <div className="absolute top-0 right-0 h-full w-full pointer-events-none md:w-1/3 p-4 flex flex-col items-end z-10">
      
      {/* Header Panel */}
      <div className="bg-black/80 backdrop-blur-sm border-l-2 border-green-500 p-4 mb-4 w-full md:w-96 shadow-lg pointer-events-auto">
        <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-bold text-green-500 tracking-wider">SOC THREAT MAP</h1>
            {onReset && (
                <button 
                    onClick={onReset}
                    className="text-[10px] bg-gray-800 hover:bg-red-900 text-gray-300 px-2 py-1 border border-gray-600 rounded transition-colors"
                >
                    DISCONNECT
                </button>
            )}
        </div>
        
        <div className="flex justify-between text-xs text-green-400/70">
          <span>SYSTEM: {status === 'error' ? 'OFFLINE' : 'ONLINE'}</span>
          <span>SOURCE: THEHIVE</span>
        </div>
        
        {/* Status Bar */}
        <div className="mt-2 h-1 w-full bg-gray-800 relative overflow-hidden">
          <div className={`h-full absolute top-0 left-0 transition-all duration-500 ${
            status === 'connected' ? 'bg-green-500 w-full animate-pulse' :
            status === 'error' ? 'bg-red-600 w-full' :
            'bg-yellow-500 w-1/2 animate-[pulse_1s_ease-in-out_infinite]'
          }`}></div>
        </div>
        
        {status === 'error' && (
          <div className="mt-2 text-xs text-red-500 font-bold border border-red-900 bg-red-900/20 p-1 animate-pulse">
            CONNECTION LOST: RETRYING...
          </div>
        )}
      </div>

      {/* Alert Feed */}
      <div className="flex-1 w-full md:w-96 overflow-hidden flex flex-col justify-end space-y-2 pb-8">
        {alerts.slice(-8).map((alert) => (
          <div 
            key={alert.id}
            className={`
              bg-black/90 backdrop-blur-md p-3 border-l-4 
              transition-all duration-500 ease-in-out transform translate-x-0 opacity-100
              ${getSeverityColor(alert.severity)}
              mb-2 pointer-events-auto hover:bg-gray-900
            `}
          >
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm uppercase">{alert.severity}</span>
              <span className="text-[10px] opacity-70">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="text-sm font-bold mt-1 text-white">{alert.title}</div>
            <div className="text-xs text-gray-400 mt-1 font-mono break-all">SRC: {alert.sourceIp}</div>
          </div>
        ))}
        
        {alerts.length === 0 && status === 'connected' && (
            <div className="text-center text-gray-500 text-xs italic p-4 border border-gray-800 bg-black/50">
                WAITING FOR INCOMING THREATS...
            </div>
        )}
      </div>
      
      {/* Footer Stats */}
      <div className="bg-black/80 border-t border-green-500/30 p-2 w-full md:w-96 text-center">
         <span className={`text-xs ${status === 'error' ? 'text-red-500' : 'text-green-600'} animate-pulse`}>
            {status === 'error' ? 'ATTEMPTING RECONNECT...' : 'SCANNING LIVE TRAFFIC...'}
         </span>
      </div>

    </div>
  );
};

export default HUD;