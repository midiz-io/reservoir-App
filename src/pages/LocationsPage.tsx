import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Plus, 
  Search, 
  MoreVertical,
  Edit,
  Trash2,
  Navigation,
  Loader2
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
import { useLocations, useCreateLocation, useDeleteLocation, useUpdateLocation } from '@/hooks/useLocations';
import { toast } from 'sonner';
import { LocationFormDialog } from '@/components/locations/LocationFormDialog';
import { Database } from '@/integrations/supabase/types';

type Location = Database['public']['Tables']['locations']['Row'];

export default function LocationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  const { data: locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const filteredLocations = locations?.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.address?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAdd = () => {
    setSelectedLocation(null);
    setDialogOpen(true);
  };

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedLocation) {
        await updateLocation.mutateAsync({ id: selectedLocation.id, ...data });
        toast.success('Location updated');
      } else {
        await createLocation.mutateAsync(data);
        toast.success('Location created');
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save location');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLocation.mutateAsync(id);
      toast.success('Location deleted');
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Locations</h1>
          <p className="text-muted-foreground">
            {locations?.length || 0} locations configured
          </p>
        </div>
        <Button onClick={handleAdd} className="gradient-water">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Locations Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.map((location, index) => (
                <TableRow 
                  key={location.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{location.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {location.address || '—'}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(location.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(location)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(location.id)}
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

          {filteredLocations.length === 0 && (
            <div className="p-8 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No locations found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        location={selectedLocation}
        onSubmit={handleSubmit}
        isLoading={createLocation.isPending || updateLocation.isPending}
      />
    </div>
  );
}
