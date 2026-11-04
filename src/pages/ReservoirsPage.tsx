import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Droplets, 
  Plus, 
  Search, 
  MapPin, 
  MoreVertical,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useReservoirs, useCreateReservoir, useDeleteReservoir, useUpdateReservoir } from '@/hooks/useReservoirs';
import { toast } from 'sonner';
import { ReservoirFormDialog } from '@/components/reservoirs/ReservoirFormDialog';
import { Database } from '@/integrations/supabase/types';

type Reservoir = Database['public']['Tables']['reservoirs']['Row'];

export default function ReservoirsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReservoir, setSelectedReservoir] = useState<Reservoir | null>(null);
  
  const { data: reservoirs, isLoading } = useReservoirs();
  const createReservoir = useCreateReservoir();
  const updateReservoir = useUpdateReservoir();
  const deleteReservoir = useDeleteReservoir();

  const filteredReservoirs = reservoirs?.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleAdd = () => {
    setSelectedReservoir(null);
    setDialogOpen(true);
  };

  const handleEdit = (reservoir: Reservoir) => {
    setSelectedReservoir(reservoir);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (selectedReservoir) {
        await updateReservoir.mutateAsync({ id: selectedReservoir.id, ...data });
        toast.success('Reservoir updated');
      } else {
        await createReservoir.mutateAsync(data);
        toast.success('Reservoir created');
      }
      setDialogOpen(false);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('reservoirs_name_key') || msg.includes('duplicate key')) {
        toast.error('A reservoir with this name already exists.');
      } else {
        toast.error(msg || 'Failed to save reservoir');
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReservoir.mutateAsync(id);
      toast.success('Reservoir deleted');
    } catch (error) {
      toast.error('Failed to delete reservoir');
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
          <h1 className="text-2xl font-display font-bold text-foreground">Reservoirs</h1>
          <p className="text-muted-foreground">Manage reservoir facilities and geofences</p>
        </div>
        <Button onClick={handleAdd} className="gradient-water">
          <Plus className="h-4 w-4 mr-2" />
          Add Reservoir
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reservoirs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Reservoirs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReservoirs.map((reservoir, index) => (
          <Card 
            key={reservoir.id}
            className="hover:shadow-card transition-all animate-slide-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2.5 rounded-lg',
                    reservoir.status === 'active' 
                      ? 'bg-primary/10 text-primary' 
                      : reservoir.status === 'maintenance'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{reservoir.name}</CardTitle>
                    <Badge 
                      variant={reservoir.status === 'active' ? 'default' : 'secondary'}
                      className="mt-1"
                    >
                      {reservoir.status}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(reservoir)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDelete(reservoir.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{reservoir.description || 'No description'}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Geofence
                  </span>
                  <span className="font-medium">{reservoir.geofence_radius}m radius</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{(reservoir.capacity || 0).toLocaleString()}L</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coordinates</span>
                  <span className="font-mono text-xs">
                    {reservoir.latitude.toFixed(4)}, {reservoir.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredReservoirs.length === 0 && (
        <Card className="p-8 text-center">
          <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No reservoirs found</p>
        </Card>
      )}

      <ReservoirFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reservoir={selectedReservoir}
        onSubmit={handleSubmit}
        isLoading={createReservoir.isPending || updateReservoir.isPending}
      />
    </div>
  );
}
