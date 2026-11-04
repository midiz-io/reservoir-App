import { useGeofence } from '@/context/GeofenceContext';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Battery, MapPin, Signal, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Header() {
  const { status, isTracking, batteryLevel } = useGeofence();
  const { user } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Geofence Status */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'relative flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                status.isInsideGeofence
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {status.isInsideGeofence && (
                <span className="absolute -left-1 -top-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                </span>
              )}
              <MapPin className="h-4 w-4" />
              <span>{status.isInsideGeofence ? 'In Zone' : 'Outside Zone'}</span>
            </div>
          </div>

          {/* Tracking Status */}
          <Badge variant={isTracking ? 'default' : 'secondary'} className="gap-1.5">
            <Signal className={cn('h-3 w-3', isTracking && 'animate-pulse')} />
            {isTracking ? 'Tracking' : 'Idle'}
          </Badge>

          {/* Battery Level */}
          {batteryLevel !== null && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Battery
                className={cn(
                  'h-4 w-4',
                  batteryLevel < 20 ? 'text-destructive' : batteryLevel < 50 ? 'text-warning' : 'text-success'
                )}
              />
              <span>{Math.round(batteryLevel)}%</span>
            </div>
          )}

          {/* Notifications */}
          <Link to="/notifications" className="p-2 rounded-full hover:bg-muted transition-colors relative">
            <Bell className="h-5 w-5 text-amber-700 dark:text-amber-600" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
          </Link>
        </div>
      </div>
    </header>
  );
}
