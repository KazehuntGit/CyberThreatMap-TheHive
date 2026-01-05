import React, { useState } from 'react';
import { checkConnection } from '../services/theHiveService';

interface ConfigPanelProps {
  onConnect: (host: string, key: string) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ onConnect }) => {
  // Default values for easier testing
  const [host, setHost] = useState('http://192.168.13.202:9000');
  const [apiKey, setApiKey] = useState('7UV19Oj+fgu9MwZ5aragqGiumwI89kal');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('checking');
    setErrorMsg('');

    const isConnected = await checkConnection(host, apiKey);

    if (isConnected) {
      onConnect(host, apiKey);
    } else {
      setStatus('error');
      setErrorMsg('Connection Failed. Check URL (CORS) or API Key.');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 border-2 border-green-500 bg-black shadow-[0_0_20px_rgba(34,197,94,0.3)]">
        <h2 className="text-2xl font-bold text-green-500 mb-6 tracking-widest text-center border-b border-green-900 pb-2">
          SYSTEM AUTHENTICATION
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Host Input */}
          <div className="space-y-2">
            <label className="text-xs text-green-400/70 uppercase tracking-wider">TheHive Host URL</label>
            <input 
              type="text" 
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="http://192.168.x.x:9000"
              className="w-full bg-gray-900/50 border border-green-700 text-green-400 p-3 focus:outline-none focus:border-green-400 focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all font-mono"
            />
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-xs text-green-400/70 uppercase tracking-wider">API Access Key</label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API Key"
              className="w-full bg-gray-900/50 border border-green-700 text-green-400 p-3 focus:outline-none focus:border-green-400 focus:shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all font-mono"
            />
          </div>

          {/* Error Message */}
          {status === 'error' && (
            <div className="text-red-500 text-xs text-center font-bold animate-pulse border border-red-900 p-2 bg-red-900/20">
              [!] {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={status === 'checking'}
            className={`
              w-full py-3 font-bold text-black tracking-widest transition-all
              ${status === 'checking' 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.8)]'
              }
            `}
          >
            {status === 'checking' ? 'ESTABLISHING UPLINK...' : 'INITIALIZE CONNECTION'}
          </button>
        </form>
        
        <div className="mt-4 text-[10px] text-green-900 text-center font-mono">
          SECURE CONNECTION PROTOCOL v1.0
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;