import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Database } from '@/integrations/supabase/types';

type Reservoir = Database['public']['Tables']['reservoirs']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface GeofenceStatus {
  isInsideGeofence: boolean;
  nearestReservoir: Reservoir | null;
  distance: number;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
}

interface GeofenceContextType {
  status: GeofenceStatus;
  isTracking: boolean;
  batteryLevel: number | null;
  reservoirs: Reservoir[];
  startTracking: () => void;
  stopTracking: () => void;
}

const GeofenceContext = createContext<GeofenceContextType | undefined>(undefined);

// Helper to bypass strict typing
const db = supabase as any;

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function GeofenceProvider({ children }: { children: ReactNode }) {
  const { employeeId, user, userRole } = useAuth();
  const [reservoirs, setReservoirs] = useState<Reservoir[]>([]);
  const [status, setStatus] = useState<GeofenceStatus>({
    isInsideGeofence: false,
    nearestReservoir: null,
    distance: Infinity,
    currentLocation: null,
  });
  const [isTracking, setIsTracking] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Fetch reservoirs from database
  useEffect(() => {
    const fetchReservoirs = async () => {
      const { data, error } = await db
        .from('reservoirs')
        .select('*')
        .eq('status', 'active');
      
      if (!error && data) {
        setReservoirs(data as Reservoir[]);
      }
    };

    fetchReservoirs();
  }, []);

  // Get battery level
  useEffect(() => {
    const getBattery = async () => {
      try {
        // @ts-ignore - Battery API types
        const battery = await navigator.getBattery?.();
        if (battery) {
          setBatteryLevel(battery.level * 100);
          battery.addEventListener('levelchange', () => {
            setBatteryLevel(battery.level * 100);
          });
        }
      } catch (error) {
        console.log('Battery API not available');
      }
    };
    getBattery();
  }, []);

  const checkGeofence = async (latitude: number, longitude: number, accuracy: number) => {
    let nearestReservoir: Reservoir | null = null;
    let minDistance = Infinity;
    let isInside = false;

    for (const reservoir of reservoirs) {
      const distance = calculateDistance(latitude, longitude, reservoir.latitude, reservoir.longitude);
      if (distance < minDistance) {
        minDistance = distance;
        nearestReservoir = reservoir;
        if (distance <= reservoir.geofence_radius) {
          isInside = true;
        }
      }
    }

    setStatus({
      isInsideGeofence: isInside,
      nearestReservoir,
      distance: minDistance,
      currentLocation: { latitude, longitude, accuracy },
    });

    // Save location to database if we have an employee ID
    if (employeeId) {
      await db.from('employee_locations').insert({
        employee_id: employeeId,
        latitude,
        longitude,
        accuracy,
        battery_level: batteryLevel,
      });
    }

    // Also save super admin location for proximity gating
    if (user && userRole === ('super_admin' as AppRole)) {
      await db.from('admin_locations').insert({
        admin_user_id: user.id,
        latitude,
        longitude,
        accuracy,
        battery_level: batteryLevel,
      });
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        checkGeofence(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <GeofenceContext.Provider value={{ status, isTracking, batteryLevel, reservoirs, startTracking, stopTracking }}>
      {children}
    </GeofenceContext.Provider>
  );
}

export function useGeofence() {
  const context = useContext(GeofenceContext);
  if (context === undefined) {
    throw new Error('useGeofence must be used within a GeofenceProvider');
  }
  return context;
}
