import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  User,
  Phone,
  CreditCard,
  Copy,
  Building,
  CheckCircle2,
  Activity,
  Globe
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useFisheriesAssociations,
  useCreateFisheriesAssociation,
  useUpdateFisheriesAssociation,
  useDeleteFisheriesAssociation,
  FisheriesAssociation,
} from '@/hooks/useFisheriesAssociations';
import { AssociationFormDialog } from '@/components/associations/AssociationFormDialog';

export default function AssociationRegistrationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAssociation, setSelectedAssociation] = useState<FisheriesAssociation | null>(null);

  const { data: associations, isLoading } = useFisheriesAssociations();
  const createAssociation = useCreateFisheriesAssociation();
  const updateAssociation = useUpdateFisheriesAssociation();
  const deleteAssociation = useDeleteFisheriesAssociation();

  const filteredAssociations = useMemo(() => {
    if (!associations) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return associations;

    return associations.filter((a) => {
      const societyMatches = a.society_name?.toLowerCase().includes(q);
      const districtMatches = a.district?.toLowerCase().includes(q);
      const reservoirMatches = a.reservoirs?.name?.toLowerCase().includes(q);
      const presidentMatches = a.president_name?.toLowerCase().includes(q);
      
      return societyMatches || districtMatches || reservoirMatches || presidentMatches;
    });
  }, [associations, searchQuery]);

  const stats = useMemo(() => {
    if (!associations) return { total: 0, districts: 0, reservoirs: 0 };
    const districts = new Set(associations.map((a) => a.district));
    const reservoirs = new Set(associations.map((a) => a.reservoir_id).filter(Boolean));
    return {
      total: associations.length,
      districts: districts.size,
      reservoirs: reservoirs.size,
    };
  }, [associations]);

  const handleAdd = () => {
    setSelectedAssociation(null);
    setDialogOpen(true);
  };

  const handleEdit = (association: FisheriesAssociation) => {
    setSelectedAssociation(association);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this fisheries association registration?')) {
      try {
        await deleteAssociation.mutateAsync(id);
        toast.success('Registration deleted successfully');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete registration');
      }
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (selectedAssociation) {
        await updateAssociation.mutateAsync({
          id: selectedAssociation.id,
          ...data,
        });
        toast.success('Fisheries association updated successfully');
      } else {
        await createAssociation.mutateAsync(data);
        toast.success('Fisheries association registered successfully');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save association details');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Fisheries Association Registration</h1>
          <p className="text-muted-foreground">Register and manage water bodies\' fisheries societies</p>
        </div>
        <Button onClick={handleAdd} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Register Association
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-sm transition-all border-none bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{stats.total}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Registered Societies</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-all border-none bg-gradient-to-br from-indigo-500/5 to-transparent">
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{stats.districts}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Covered Districts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-all border-none bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="pt-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{stats.reservoirs}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Active Reservoirs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by society name, district, or reservoir..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 w-full"
        />
      </div>

      {/* Associations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredAssociations.map((assoc, index) => (
          <Card
            key={assoc.id}
            className="hover:shadow-md transition-all border border-border duration-200 flex flex-col bg-card/65 backdrop-blur-sm animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-bold font-display text-foreground leading-snug">
                  {assoc.society_name}
                </CardTitle>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-md font-medium border-primary/25 text-primary bg-primary/5">
                    📍 {assoc.district}
                  </Badge>
                  {assoc.reservoirs?.name && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-md font-medium border-emerald-500/25 text-emerald-600 bg-emerald-500/5">
                      🌊 {assoc.reservoirs.name}
                    </Badge>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(assoc)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(assoc.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>

            <CardContent className="space-y-5 flex-1 flex flex-col justify-between">
              
              {/* Key Officers Grid */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/80">Key Society Officers</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* President */}
                  <div className="p-2 rounded-lg bg-muted/30 border space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground">President</p>
                    <p className="text-xs font-semibold text-foreground truncate">{assoc.president_name || '—'}</p>
                    {assoc.president_contact ? (
                      <div className="flex items-center gap-1 text-[11px] text-primary/80 font-mono">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{assoc.president_contact}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No Phone</p>
                    )}
                  </div>

                  {/* Secretary */}
                  <div className="p-2 rounded-lg bg-muted/30 border space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground">Secretary</p>
                    <p className="text-xs font-semibold text-foreground truncate">{assoc.secretary_name || '—'}</p>
                    {assoc.secretary_contact ? (
                      <div className="flex items-center gap-1 text-[11px] text-primary/80 font-mono">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{assoc.secretary_contact}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No Phone</p>
                    )}
                  </div>

                  {/* Treasurer */}
                  <div className="p-2 rounded-lg bg-muted/30 border space-y-0.5">
                    <p className="text-[10px] font-bold text-muted-foreground">Treasurer</p>
                    <p className="text-xs font-semibold text-foreground truncate">{assoc.treasurer_name || '—'}</p>
                    {assoc.treasurer_contact ? (
                      <div className="flex items-center gap-1 text-[11px] text-primary/80 font-mono">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span className="truncate">{assoc.treasurer_contact}</span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No Phone</p>
                    )}
                  </div>

                </div>
              </div>

              {/* Bank Details section */}
              <div className="bg-muted/40 p-3.5 rounded-xl border border-muted/80 flex items-center justify-between gap-4 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground leading-none">Bank Account</p>
                    {assoc.account_no ? (
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <p className="text-xs font-mono font-bold leading-none">{assoc.account_no}</p>
                        <p className="text-[10px] text-muted-foreground truncate leading-none">
                          {assoc.bank_name || 'Bank'} • {assoc.branch_name || 'Branch'}
                        </p>
                        <p className="text-[10px] font-medium text-foreground truncate max-w-[200px] leading-none pt-0.5">
                          Holder: {assoc.account_holder_name || '—'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No bank details added</p>
                    )}
                  </div>
                </div>

                {assoc.account_no && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(assoc.account_no!, 'Account No')}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <Copy className="h-4.5 w-4.5" />
                  </Button>
                )}
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssociations.length === 0 && (
        <Card className="border-none shadow-sm">
          <CardContent className="p-8 text-center space-y-3">
            <Building className="h-12 w-12 mx-auto text-muted-foreground/60" />
            <div>
              <p className="text-muted-foreground font-medium">No registered societies found</p>
              <p className="text-sm text-muted-foreground/85">
                Click "Register Association" to add a new fisheries society registration.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <AssociationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        association={selectedAssociation}
        onSubmit={handleFormSubmit}
        isLoading={createAssociation.isPending || updateAssociation.isPending}
      />

    </div>
  );
}
