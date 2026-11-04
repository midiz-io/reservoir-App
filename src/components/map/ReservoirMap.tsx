import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useGeofence } from '@/context/GeofenceContext';
import { useReservoirs } from '@/hooks/useReservoirs';
import { useEmployeeLocations } from '@/hooks/useEmployeeLocations';
import { useEmployees } from '@/hooks/useEmployees';
import { useDataEntries } from '@/hooks/useDataEntries';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Droplets, 
  Navigation, 
  X, 
  User, 
  Users, 
  Eye,
  EyeOff,
  Maximize2,
  RotateCcw,
  Battery,
  Search,
  Layers,
  Activity,
  BarChart3,
  ZoomIn,
  ZoomOut,
  Settings,
  Thermometer,
  Gauge,
  Waves
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

type Reservoir = Database['public']['Tables']['reservoirs']['Row'];
type DataEntry = Database['public']['Tables']['data_entries']['Row'] & {
  reservoirs?: { name: string };
  employees?: { full_name: string };
};

export function ReservoirMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const employeeMarkersRef = useRef<maplibregl.Marker[]>([]);
  const dataEntryMarkersRef = useRef<maplibregl.Marker[]>([]);
  const { status, isTracking, startTracking } = useGeofence();
  const { data: reservoirs = [], isLoading } = useReservoirs();
  const { data: employeeLocations = [] } = useEmployeeLocations();
  const { data: employees = [] } = useEmployees();
  const { data: dataEntries = [] } = useDataEntries();

  const [selectedReservoir, setSelectedReservoir] = useState<Reservoir | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDataEntry, setSelectedDataEntry] = useState<DataEntry | null>(null);
  const [showEmployees, setShowEmployees] = useState(true);
  const [showDataEntries, setShowDataEntries] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [trackingEmployee, setTrackingEmployee] = useState<string>('all');
  const [is3DMode, setIs3DMode] = useState(true);
  const [mapStyle, setMapStyle] = useState<'satellite' | 'streets' | 'terrain'>('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [showStats, setShowStats] = useState(true);
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  // Filter reservoirs based on search and status
  const filteredReservoirs = useMemo(() => {
    return reservoirs.filter(reservoir => {
      const matchesSearch = !searchQuery || 
        reservoir.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservoir.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || reservoir.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reservoirs, searchQuery, statusFilter]);

  // Filter data entries based on time range
  const filteredDataEntries = useMemo(() => {
    if (timeRange === 'all') return dataEntries;
    const now = new Date();
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const range = ranges[timeRange];
    if (!range) return dataEntries;
    return dataEntries.filter(entry => {
      const entryDate = new Date(entry.recorded_at);
      return now.getTime() - entryDate.getTime() <= range;
    });
  }, [dataEntries, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeReservoirs = reservoirs.filter(r => r.status === 'active').length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const todayEntries = dataEntries.filter(e => {
      const entryDate = new Date(e.recorded_at);
      const today = new Date();
      return entryDate.toDateString() === today.toDateString();
    }).length;
    const avgWaterLevel = dataEntries.length > 0
      ? dataEntries.reduce((sum, e) => sum + e.water_level, 0) / dataEntries.length
      : 0;
    const avgPH = dataEntries.length > 0
      ? dataEntries.reduce((sum, e) => sum + e.ph, 0) / dataEntries.length
      : 0;

    return {
      totalReservoirs: reservoirs.length,
      activeReservoirs,
      totalEmployees: employees.length,
      activeEmployees,
      todayEntries,
      totalEntries: dataEntries.length,
      avgWaterLevel: avgWaterLevel.toFixed(2),
      avgPH: avgPH.toFixed(2),
    };
  }, [reservoirs, employees, dataEntries]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const defaultCenter: [number, number] = [80.6337, 7.2906]; // Sri Lanka center

    // Use OpenFreeMap 3D style (Liberty style with 3D terrain)
    const getMapStyle = () => {
      return 'https://tiles.openfreemap.org/styles/liberty';
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyle(),
      center: defaultCenter,
      zoom: 10,
      pitch: is3DMode ? 60 : 0,
      bearing: -17.6,
      maxPitch: 85,
    });

    map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.current.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'top-right'
    );
    map.current.addControl(new maplibregl.ScaleControl(), 'bottom-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map style - OpenFreeMap style is loaded from URL, no need to update here
  // This effect is kept for compatibility but OpenFreeMap style is set at initialization
  useEffect(() => {
    // OpenFreeMap style is loaded from URL, so no dynamic style changes needed
    // If you want to switch styles in future, update the map initialization
  }, [mapStyle]);

  // Add reservoir markers
  const addReservoirMarkers = () => {
    if (!map.current || isLoading) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredReservoirs.forEach((reservoir) => {
      const el = document.createElement('div');
      el.className = 'reservoir-marker cursor-pointer';
      // All markers are red as requested
      const color = '#ef4444'; // red-500
      // Use inline styles with transform-origin to prevent flying during map movements
      el.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; transform-origin: center center; will-change: transform;';
      el.innerHTML = `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: ${color}; opacity: 0.5; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; transform: scale(1.5);"></div>
          <div style="position: relative; width: 48px; height: 48px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 2px solid white;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedReservoir(reservoir);
        setSelectedEmployee(null);
        setSelectedDataEntry(null);
        map.current?.flyTo({
          center: [reservoir.longitude, reservoir.latitude],
          zoom: 15,
          pitch: 70,
          duration: 1500,
        });
      });

      // Set proper anchor point to prevent marker "flying" during map movements
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center'
      })
        .setLngLat([reservoir.longitude, reservoir.latitude])
        .addTo(map.current!);
      
      markersRef.current.push(marker);

      // Add geofence circle
      if (showGeofences) {
        const circleId = `geofence-${reservoir.id}`;
        
        if (map.current!.getSource(circleId)) {
          if (map.current!.getLayer(`${circleId}-fill`)) map.current!.removeLayer(`${circleId}-fill`);
          if (map.current!.getLayer(`${circleId}-stroke`)) map.current!.removeLayer(`${circleId}-stroke`);
          map.current!.removeSource(circleId);
        }

        const fillColor = color;
        const circleData = createGeoJSONCircle([reservoir.longitude, reservoir.latitude], reservoir.geofence_radius / 1000);

        map.current!.addSource(circleId, {
          type: 'geojson',
          data: circleData,
        });

        map.current!.addLayer({
          id: `${circleId}-fill`,
          type: 'fill',
          source: circleId,
          paint: {
            'fill-color': fillColor,
            'fill-opacity': 0.2,
          },
        });

        map.current!.addLayer({
          id: `${circleId}-stroke`,
          type: 'line',
          source: circleId,
          paint: {
            'line-color': fillColor,
            'line-width': 3,
            'line-dasharray': [2, 2],
          },
        });
      }
    });

    if (filteredReservoirs.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      filteredReservoirs.forEach(r => bounds.extend([r.longitude, r.latitude]));
      map.current?.fitBounds(bounds, { padding: 100, maxZoom: 14, pitch: is3DMode ? 60 : 0 });
    }
  };

  // Add employee markers
  const addEmployeeMarkers = () => {
    if (!map.current || !showEmployees) {
      employeeMarkersRef.current.forEach(marker => marker.remove());
      employeeMarkersRef.current = [];
      return;
    }

    employeeMarkersRef.current.forEach(marker => marker.remove());
    employeeMarkersRef.current = [];

    const locationsToShow = trackingEmployee === 'all' 
      ? employeeLocations 
      : employeeLocations.filter((loc: any) => loc.employee_id === trackingEmployee);

    locationsToShow.forEach((loc: any) => {
      const employee = loc.employees;
      if (!employee) return;

      const el = document.createElement('div');
      el.className = 'employee-marker cursor-pointer';
      const isActive = employee.status === 'active';
      
      // All markers are red as requested
      const markerColor = '#ef4444'; // red-500
      // Use inline styles with transform-origin to prevent flying during map movements
      el.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; transform-origin: center center; will-change: transform;';
      
      el.innerHTML = `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; inset: 0; border-radius: 50%; background: ${markerColor}; opacity: 0.4; ${isActive ? 'animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}"></div>
          <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: ${markerColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 2px solid white;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          ${loc.battery_level !== null ? `
            <div style="position: absolute; bottom: -4px; right: -4px; width: 20px; height: 20px; border-radius: 50%; background: var(--background, white); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${loc.battery_level > 20 ? '#22c55e' : '#ef4444'};">
              ${Math.round(loc.battery_level)}
            </div>
          ` : ''}
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedEmployee({ ...loc, employee });
        setSelectedReservoir(null);
        setSelectedDataEntry(null);
        map.current?.flyTo({
          center: [loc.longitude, loc.latitude],
          zoom: 17,
          pitch: 70,
          duration: 1500,
        });
      });

      // Set proper anchor point to prevent marker "flying" during map movements
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center'
      })
        .setLngLat([loc.longitude, loc.latitude])
        .addTo(map.current!);
      
      employeeMarkersRef.current.push(marker);
    });
  };

  // Add data entry markers
  const addDataEntryMarkers = () => {
    if (!map.current || !showDataEntries) {
      dataEntryMarkersRef.current.forEach(marker => marker.remove());
      dataEntryMarkersRef.current = [];
      return;
    }

    dataEntryMarkersRef.current.forEach(marker => marker.remove());
    dataEntryMarkersRef.current = [];

    filteredDataEntries.forEach((entry: DataEntry) => {
      const el = document.createElement('div');
      el.className = 'data-entry-marker cursor-pointer';
      // All markers are red as requested
      const color = '#ef4444'; // red-500
      // Use inline styles with transform-origin to prevent flying during map movements
      el.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; transform-origin: center center; will-change: transform;';
      
      el.innerHTML = `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 2px solid white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 2v20M12 2l4 4M12 2L8 6"/>
            </svg>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        setSelectedDataEntry(entry);
        setSelectedReservoir(null);
        setSelectedEmployee(null);
        map.current?.flyTo({
          center: [entry.longitude, entry.latitude],
          zoom: 18,
          pitch: 70,
          duration: 1500,
        });
      });

      // Set proper anchor point to prevent marker "flying" during map movements
      const marker = new maplibregl.Marker({ 
        element: el,
        anchor: 'center'
      })
        .setLngLat([entry.longitude, entry.latitude])
        .addTo(map.current!);
      
      dataEntryMarkersRef.current.push(marker);
    });
  };

  useEffect(() => {
    if (!map.current) return;
    
    const addMarkers = () => {
      if (map.current?.isStyleLoaded()) {
        addReservoirMarkers();
        addEmployeeMarkers();
        addDataEntryMarkers();
      } else {
        map.current?.on('load', () => {
          addReservoirMarkers();
          addEmployeeMarkers();
          addDataEntryMarkers();
        });
      }
    };

    addMarkers();
  }, [filteredReservoirs, showEmployees, showDataEntries, showGeofences, trackingEmployee, filteredDataEntries]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !status.currentLocation) return;

    const markerId = 'user-location';
    const existingMarker = document.querySelector(`[data-marker="${markerId}"]`);
    
    if (existingMarker) existingMarker.remove();

    const el = document.createElement('div');
    el.setAttribute('data-marker', markerId);
    // User location marker is also red as requested
    // Use inline styles with transform-origin to prevent flying during map movements
    el.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; transform-origin: center center; will-change: transform;';
    el.innerHTML = `
      <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: 0; border-radius: 50%; background: #ef4444; opacity: 0.75; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 20px; height: 20px; border-radius: 50%; background: #ef4444; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"></div>
      </div>
    `;

    new maplibregl.Marker({ 
      element: el,
      anchor: 'center'
    })
      .setLngLat([status.currentLocation.longitude, status.currentLocation.latitude])
      .addTo(map.current);
  }, [status.currentLocation]);

  // Toggle 3D mode
  const toggle3DMode = () => {
    if (!map.current) return;
    const newPitch = is3DMode ? 0 : 60;
    map.current.easeTo({ pitch: newPitch, duration: 1000 });
    setIs3DMode(!is3DMode);
  };

  // Reset view
  const resetView = () => {
    if (!map.current) return;
    map.current.easeTo({
      center: [80.6337, 7.2906],
      zoom: 10,
      pitch: is3DMode ? 60 : 0,
      bearing: 0,
      duration: 1500,
    });
  };

  // Zoom controls
  const zoomIn = () => map.current?.zoomIn();
  const zoomOut = () => map.current?.zoomOut();

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Export map as image
  const exportMap = () => {
    if (!map.current) return;
    map.current.getCanvas().toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reservoir-map-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] min-h-[500px] rounded-xl overflow-hidden border border-border shadow-card">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Top Left: Search and Filters */}
      <Card className="absolute top-4 left-4 p-3 bg-card/95 backdrop-blur-sm z-10 w-[300px] sm:w-[350px]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reservoirs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Top Right: Statistics Panel */}
      {showStats && (
        <Card className="absolute top-4 right-4 p-4 bg-card/95 backdrop-blur-sm z-10 w-[280px] max-h-[400px] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistics
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowStats(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Reservoirs</div>
                <div className="font-bold text-lg">{stats.totalReservoirs}</div>
                <div className="text-xs text-success">{stats.activeReservoirs} active</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Employees</div>
                <div className="font-bold text-lg">{stats.totalEmployees}</div>
                <div className="text-xs text-success">{stats.activeEmployees} active</div>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Today's Entries:</span>
                <span className="font-medium">{stats.todayEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Entries:</span>
                <span className="font-medium">{stats.totalEntries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Water Level:</span>
                <span className="font-medium">{stats.avgWaterLevel}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg pH:</span>
                <span className="font-medium">{stats.avgPH}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bottom Left: Map Controls */}
      <Card className="absolute bottom-4 left-4 p-2 bg-card/95 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-2">
          {!isTracking && (
            <Button onClick={startTracking} size="sm" className="shadow-lg">
              <Navigation className="h-4 w-4 mr-2" />
              Enable Location
            </Button>
          )}
          <div className="flex gap-2">
            <Button 
              variant={is3DMode ? "default" : "outline"} 
              size="sm" 
              onClick={toggle3DMode}
              className="shadow-lg"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetView}
              className="shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomIn}
              className="shadow-lg"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={zoomOut}
              className="shadow-lg"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bottom Right: Layer Controls */}
      <Card className="absolute bottom-4 right-4 p-3 bg-card/95 backdrop-blur-sm z-10 min-w-[200px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Layers
            </span>
            <Popover open={showLayerPanel} onOpenChange={setShowLayerPanel}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Map Style</label>
                    <Select value={mapStyle} onValueChange={(v: any) => setMapStyle(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="satellite">Satellite</SelectItem>
                        <SelectItem value="streets">Streets</SelectItem>
                        <SelectItem value="terrain">Terrain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Geofences</label>
                      <Button
                        variant={showGeofences ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowGeofences(!showGeofences)}
                      >
                        {showGeofences ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Data Entries</label>
                      <Button
                        variant={showDataEntries ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowDataEntries(!showDataEntries)}
                      >
                        {showDataEntries ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs">Employees</span>
              <Button 
                variant={showEmployees ? "default" : "outline"} 
                size="sm"
                className="h-7"
                onClick={() => setShowEmployees(!showEmployees)}
              >
                {showEmployees ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {showEmployees && (
              <Select value={trackingEmployee} onValueChange={setTrackingEmployee}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees?.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {showDataEntries && (
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {employeeLocations.length} active locations
          </div>
        </div>
      </Card>

      {/* Map Legend */}
      <Card className="absolute bottom-4 left-[380px] p-3 bg-card/95 backdrop-blur-sm z-10 hidden lg:block">
        <h4 className="font-medium text-sm mb-2">Legend</h4>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Active Reservoir</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>Active Employee</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span>Your Location</span>
          </div>
          {showDataEntries && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span>High Water Level</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span>Medium Water</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span>Low Water Level</span>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Selected Reservoir Info */}
      {selectedReservoir && (
        <Card className="absolute top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 w-[90%] sm:w-96 p-4 bg-card/95 backdrop-blur-sm animate-slide-up z-20 max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Droplets className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-semibold truncate">{selectedReservoir.name}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={selectedReservoir.status === 'active' ? 'default' : 'secondary'}>
                {selectedReservoir.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedReservoir(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {selectedReservoir.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{selectedReservoir.description}</p>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Geofence:</span>
              <span className="font-medium">{selectedReservoir.geofence_radius}m</span>
            </div>
            {selectedReservoir.capacity && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-medium">{selectedReservoir.capacity.toLocaleString()}L</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Coordinates:</span>
              <code className="text-xs">{selectedReservoir.latitude.toFixed(4)}, {selectedReservoir.longitude.toFixed(4)}</code>
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              Recent entries: {dataEntries.filter(e => e.reservoir_id === selectedReservoir.id).length}
            </div>
          </div>
        </Card>
      )}

      {/* Selected Employee Info */}
      {selectedEmployee && (
        <Card className="absolute top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 w-[90%] sm:w-96 p-4 bg-card/95 backdrop-blur-sm animate-slide-up z-20">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <User className="h-5 w-5 text-success shrink-0" />
              <h3 className="font-semibold truncate">{selectedEmployee.employee?.full_name}</h3>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={selectedEmployee.employee?.status === 'active' ? 'default' : 'secondary'}>
                {selectedEmployee.employee?.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedEmployee(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate ml-2">{selectedEmployee.employee?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <code className="text-xs">{selectedEmployee.latitude.toFixed(6)}, {selectedEmployee.longitude.toFixed(6)}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accuracy:</span>
              <span className="font-medium">±{selectedEmployee.accuracy?.toFixed(1)}m</span>
            </div>
            {selectedEmployee.battery_level !== null && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Battery className="h-3.5 w-3.5" />
                  Battery:
                </span>
                <Badge variant={selectedEmployee.battery_level > 20 ? 'default' : 'destructive'}>
                  {Math.round(selectedEmployee.battery_level)}%
                </Badge>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Update:</span>
              <span className="text-xs">{formatDistanceToNow(new Date(selectedEmployee.timestamp), { addSuffix: true })}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Selected Data Entry Info */}
      {selectedDataEntry && (
        <Card className="absolute top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 w-[90%] sm:w-96 p-4 bg-card/95 backdrop-blur-sm animate-slide-up z-20 max-h-[80vh] overflow-y-auto">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Activity className="h-5 w-5 text-primary shrink-0" />
              <h3 className="font-semibold truncate">Data Entry</h3>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedDataEntry(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs mb-1">Reservoir</div>
              <div className="font-medium">{selectedDataEntry.reservoirs?.name || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs mb-1">Recorded By</div>
              <div className="font-medium">{selectedDataEntry.employees?.full_name || 'Unknown'}</div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Water Level</div>
                  <div className="font-bold">{selectedDataEntry.water_level}m</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-warning" />
                <div>
                  <div className="text-xs text-muted-foreground">Temperature</div>
                  <div className="font-bold">{selectedDataEntry.temperature}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-info" />
                <div>
                  <div className="text-xs text-muted-foreground">pH Level</div>
                  <div className="font-bold">{selectedDataEntry.ph}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-success" />
                <div>
                  <div className="text-xs text-muted-foreground">Dissolved O₂</div>
                  <div className="font-bold">{selectedDataEntry.dissolved_oxygen}mg/L</div>
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recorded:</span>
              <span className="text-xs">{format(new Date(selectedDataEntry.recorded_at), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            {selectedDataEntry.notes && (
              <div>
                <div className="text-muted-foreground text-xs mb-1">Notes</div>
                <div className="text-sm">{selectedDataEntry.notes}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* No reservoirs message */}
      {!isLoading && filteredReservoirs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4 z-10">
          <Card className="p-6 text-center max-w-sm">
            <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No reservoirs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try adjusting your search filters' : 'Add reservoirs in the admin panel'}
            </p>
          </Card>
        </div>
      )}

      {/* Stats Toggle Button */}
      {!showStats && (
        <Button
          className="absolute top-4 right-4 z-10"
          variant="outline"
          size="sm"
          onClick={() => setShowStats(true)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Show Stats
        </Button>
      )}
    </div>
  );
}

// Helper function to create GeoJSON circle
function createGeoJSONCircle(center: [number, number], radiusKm: number, points = 64) {
  const coords = [];
  const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]);

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}
