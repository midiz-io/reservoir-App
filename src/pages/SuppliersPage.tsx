import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Users,
    Plus,
    Search,
    Phone,
    MapPin,
    Building,
    MoreVertical,
    Edit,
    Trash2,
    Loader2,
    Droplets
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useSuppliers, useCreateSupplier, useDeleteSupplier, useUpdateSupplier, Supplier } from '@/hooks/useSuppliers';
import { toast } from 'sonner';
import { SupplierFormDialog } from '@/components/suppliers/SupplierFormDialog';

export default function SuppliersPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const { data: suppliers, isLoading } = useSuppliers();
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();
    const deleteSupplier = useDeleteSupplier();

    const filteredSuppliers = suppliers?.filter(s =>
        s.collector_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.association_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const handleAdd = () => {
        setSelectedSupplier(null);
        setDialogOpen(true);
    };

    const handleEdit = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setDialogOpen(true);
    };

    const handleSubmit = async (data: any) => {
        try {
            if (selectedSupplier) {
                await updateSupplier.mutateAsync({ id: selectedSupplier.id, ...data });
                toast.success('Supplier updated');
            } else {
                await createSupplier.mutateAsync(data);
                toast.success('Supplier created');
            }
            setDialogOpen(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to save supplier');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this supplier?')) {
            try {
                await deleteSupplier.mutateAsync(id);
                toast.success('Supplier deleted');
            } catch (error) {
                toast.error('Failed to delete supplier');
            }
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
                    <h1 className="text-2xl font-display font-bold text-foreground">Supplier Management</h1>
                    <p className="text-muted-foreground">Manage collectors and their fisheries associations</p>
                </div>
                <Button onClick={handleAdd} className="gradient-water">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
                </Button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search collectors or associations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 max-w-md"
                />
            </div>

            {/* Suppliers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSuppliers.map((supplier, index) => (
                    <Card
                        key={supplier.id}
                        className="hover:shadow-card transition-all animate-slide-up bg-card"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base truncate max-w-[150px]">{supplier.collector_name}</CardTitle>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                            <Phone className="h-3 w-3" />
                                            {supplier.collector_phone}
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => handleDelete(supplier.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                        <Building className="h-3 w-3" />
                                        Fisheries Association
                                    </span>
                                    <p className="text-sm font-medium text-foreground">{supplier.association_name}</p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Association Address
                                    </span>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{supplier.association_address}</p>
                                </div>

                                {supplier.reservoirs?.name && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                                            <Droplets className="h-3 w-3" />
                                            Assigned Reservoir
                                        </span>
                                        <p className="text-sm font-medium text-foreground">{supplier.reservoirs.name}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredSuppliers.length === 0 && (
                <Card className="p-12 text-center border-dashed">
                    <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">No suppliers found</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Try adjusting your search query or add a new supplier to the system.
                    </p>
                    <Button onClick={handleAdd} variant="outline" className="mt-6">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Supplier
                    </Button>
                </Card>
            )}

            <SupplierFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                supplier={selectedSupplier}
                onSubmit={handleSubmit}
                isLoading={createSupplier.isPending || updateSupplier.isPending}
            />
        </div>
    );
}
