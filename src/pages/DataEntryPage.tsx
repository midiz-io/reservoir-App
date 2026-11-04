import { useState } from 'react';
import { DataEntryForm } from '@/components/data-entry/DataEntryForm';
import { WeatherWidget } from '@/components/weather/WeatherWidget';
import { useGeofence } from '@/context/GeofenceContext';
import { useDataEntries, useDeleteDataEntry } from '@/hooks/useDataEntries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Droplets, 
  Eye, 
  Trash2, 
  MoreVertical, 
  Loader2,
  Thermometer,
  Activity,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DataEntryPage() {
  const { status } = useGeofence();
  const { data: entries, isLoading } = useDataEntries();
  const deleteEntry = useDeleteDataEntry();
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry.mutateAsync(id);
      toast.success('Entry deleted');
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Data Entry</h1>
        <p className="text-muted-foreground">Record water quality measurements</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <DataEntryForm />
        </div>
        <div>
          <WeatherWidget
            latitude={status.currentLocation?.latitude}
            longitude={status.currentLocation?.longitude}
          />
        </div>
      </div>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : entries && entries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reservoir</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Water Level</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead>pH</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.slice(0, 10).map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-primary" />
                          <span className="font-medium">{entry.reservoirs?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(entry.recorded_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{entry.water_level}m</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Thermometer className="h-3.5 w-3.5 text-warning" />
                          {entry.temperature}°C
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={entry.ph >= 6.5 && entry.ph <= 8.5 ? 'default' : 'destructive'}
                        >
                          {entry.ph}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.employees?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedEntry(entry)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No entries recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entry Details Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entry Details</DialogTitle>
            <DialogDescription>
              {selectedEntry && format(new Date(selectedEntry.recorded_at), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Reservoir</p>
                  <p className="font-medium">{selectedEntry.reservoirs?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{selectedEntry.employees?.full_name}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Water Level</p>
                  <p className="font-medium">{selectedEntry.water_level}m</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="font-medium">{selectedEntry.temperature}°C</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">pH</p>
                  <p className="font-medium">{selectedEntry.ph}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Dissolved Oxygen</p>
                  <p className="font-medium">{selectedEntry.dissolved_oxygen} mg/L</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Turbidity</p>
                  <p className="font-medium">{selectedEntry.turbidity} NTU</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Flow Rate</p>
                  <p className="font-medium">{selectedEntry.flow_rate} L/s</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Location</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {selectedEntry.latitude.toFixed(6)}, {selectedEntry.longitude.toFixed(6)}
                </code>
                <p className="text-xs text-muted-foreground">Accuracy: ±{selectedEntry.accuracy.toFixed(1)}m</p>
              </div>
              {selectedEntry.notes && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
