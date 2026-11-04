import { useState, useEffect } from 'react';
import { Terminal, Lock, Unlock } from 'lucide-react';
import BugControllerPage from './BugControllerPage';

const PASSCODE_KEY = 'cyber_leek_auth';
const CORRECT_PASSCODE = 'EloneMusk';

export default function CyberLeekPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Check local storage on mount
    const savedCode = localStorage.getItem(PASSCODE_KEY);
    if (savedCode === CORRECT_PASSCODE) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode === CORRECT_PASSCODE) {
      localStorage.setItem(PASSCODE_KEY, inputCode);
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setInputCode('');
    }
  };

  if (isAuthenticated === null) return null; // Initial load

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-6">
        <BugControllerPage isPortal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 text-green-500 font-mono">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center flex flex-col items-center space-y-4">
          <Terminal className="h-16 w-16" />
          <h1 className="text-3xl font-bold tracking-wider">CYBER-LEEK PROTOCOL</h1>
          <p className="text-sm opacity-70 uppercase tracking-widest">Unauthorized access is strictly prohibited.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 border-b-2 border-green-500 pb-2">
              <span className="text-green-500">&gt;</span>
              <input
                type="password"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                autoFocus
                placeholder="ENTER PASSCODE..."
                className="w-full bg-transparent border-none outline-none text-green-500 placeholder:text-green-500/30"
              />
              {error ? <Lock className="h-5 w-5 text-red-500" /> : <Unlock className="h-5 w-5 text-green-500/50" />}
            </div>
            {error && (
              <p className="text-red-500 text-sm animate-pulse">ACCESS DENIED. INVALID CREDENTIALS.</p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full border-2 border-green-500 hover:bg-green-500 hover:text-black transition-colors py-3 font-bold tracking-widest uppercase"
          >
            Initiate Override
          </button>
        </form>
      </div>
    </div>
  );
}
