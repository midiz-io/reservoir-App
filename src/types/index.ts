export type UserRole = 'super_admin' | 'employee';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  assigned_locations: string[];
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
}

export interface Reservoir {
  id: string;
  name: string;
  location_id: string;
  location?: Location;
  latitude: number;
  longitude: number;
  geofence_radius: number; // in meters
  capacity?: number;
  description?: string;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface DataEntry {
  id: string;
  reservoir_id: string;
  employee_id: string;
  water_level: number;
  temperature: number;
  ph: number;
  dissolved_oxygen: number;
  turbidity: number;
  flow_rate: number;
  notes?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  recorded_at: string;
  created_at: string;
}

export interface EmployeeLocation {
  id: string;
  employee_id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  battery_level?: number;
  timestamp: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  description: string;
  icon: string;
}

export interface GeofenceStatus {
  isInsideGeofence: boolean;
  nearestReservoir: Reservoir | null;
  distance: number;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
}
