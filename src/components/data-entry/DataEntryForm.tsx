import { useState } from 'react';
import { useGeofence } from '@/context/GeofenceContext';
import { useAuth } from '@/context/AuthContext';
import { useCreateDataEntry } from '@/hooks/useDataEntries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Droplets, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DataEntryForm() {
  const { status, isTracking, startTracking } = useGeofence();
  const { employeeId } = useAuth();
  const createEntry = useCreateDataEntry();
  
  const [formData, setFormData] = useState({
    water_level: '',
    temperature: '',
    ph: '',
    dissolved_oxygen: '',
    turbidity: '',
    flow_rate: '',
    notes: '',
  });

  const canSubmit = status.isInsideGeofence && status.nearestReservoir && employeeId;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !status.currentLocation || !status.nearestReservoir) return;

    try {
      await createEntry.mutateAsync({
        reservoir_id: status.nearestReservoir.id,
        employee_id: employeeId,
        water_level: parseFloat(formData.water_level),
        temperature: parseFloat(formData.temperature),
        ph: parseFloat(formData.ph),
        dissolved_oxygen: parseFloat(formData.dissolved_oxygen),
        turbidity: parseFloat(formData.turbidity),
        flow_rate: parseFloat(formData.flow_rate),
        notes: formData.notes || null,
        latitude: status.currentLocation.latitude,
        longitude: status.currentLocation.longitude,
        accuracy: status.currentLocation.accuracy,
      });

      toast.success('Data recorded successfully!');
      
      setFormData({
        water_level: '',
        temperature: '',
        ph: '',
        dissolved_oxygen: '',
        turbidity: '',
        flow_rate: '',
        notes: '',
      });
    } catch (error) {
      toast.error('Failed to save data entry');
    }
  };

  return (
    <div className="space-y-6">
      {/* Geofence Status Banner */}
      <Card className={cn(
        'border-2 transition-colors',
        status.isInsideGeofence 
          ? 'border-success bg-success/5' 
          : 'border-warning bg-warning/5'
      )}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {status.isInsideGeofence ? (
              <CheckCircle2 className="h-6 w-6 text-success" />
            ) : (
              <AlertCircle className="h-6 w-6 text-warning" />
            )}
            <div className="flex-1">
              <h3 className="font-medium">
                {status.isInsideGeofence 
                  ? `Inside ${status.nearestReservoir?.name}` 
                  : 'Outside Geofence Zone'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {status.isInsideGeofence 
                  ? 'You can now submit data entries'
                  : status.distance === Infinity 
                    ? 'Enable location to check proximity'
                    : `${Math.round(status.distance)}m from nearest reservoir`}
              </p>
            </div>
            {!isTracking && (
              <Button onClick={startTracking} size="sm" variant="outline">
                <MapPin className="h-4 w-4 mr-2" />
                Enable Location
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Location Info */}
      {status.currentLocation && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Position:</span>
              <span className="font-mono">
                {status.currentLocation.latitude.toFixed(6)}, {status.currentLocation.longitude.toFixed(6)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Accuracy:</span>
              <span>±{Math.round(status.currentLocation.accuracy)}m</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Reservoir Data Entry
          </CardTitle>
          <CardDescription>
            Record water quality measurements for the current reservoir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="water_level">Water Level (m)</Label>
                <Input
                  id="water_level"
                  name="water_level"
                  type="number"
                  step="0.01"
                  placeholder="e.g., 15.5"
                  value={formData.water_level}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 22.5"
                  value={formData.temperature}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ph">pH Level</Label>
                <Input
                  id="ph"
                  name="ph"
                  type="number"
                  step="0.01"
                  min="0"
                  max="14"
                  placeholder="e.g., 7.2"
                  value={formData.ph}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dissolved_oxygen">Dissolved Oxygen (mg/L)</Label>
                <Input
                  id="dissolved_oxygen"
                  name="dissolved_oxygen"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 8.5"
                  value={formData.dissolved_oxygen}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="turbidity">Turbidity (NTU)</Label>
                <Input
                  id="turbidity"
                  name="turbidity"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 1.2"
                  value={formData.turbidity}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flow_rate">Flow Rate (L/s)</Label>
                <Input
                  id="flow_rate"
                  name="flow_rate"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 150.0"
                  value={formData.flow_rate}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional observations or notes..."
                value={formData.notes}
                onChange={handleChange}
                disabled={!canSubmit}
                rows={3}
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-water"
              disabled={!canSubmit || createEntry.isPending}
            >
              {createEntry.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording Data...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Data Entry
                </>
              )}
            </Button>

            {!canSubmit && !employeeId && (
              <p className="text-center text-sm text-muted-foreground">
                You need to be registered as an employee to submit data
              </p>
            )}
            {!canSubmit && employeeId && (
              <p className="text-center text-sm text-muted-foreground">
                You must be inside a geofence zone to submit data
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
