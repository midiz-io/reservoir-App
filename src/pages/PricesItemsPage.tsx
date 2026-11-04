import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Plus, Trash2, Edit, PlusCircle, Tag, Droplets, MapPin } from 'lucide-react';
import { usePriceCatalog, useCreatePriceCatalogItems, useUpdatePriceCatalogItem, useDeletePriceCatalogItem, PriceCatalogItem } from '@/hooks/usePriceCatalog';
import { useReservoirs } from '@/hooks/useReservoirs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { toast } from 'sonner';

export default function PricesItemsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const { data: catalog, isLoading: isLoadingCatalog } = usePriceCatalog();
    const { data: reservoirs } = useReservoirs();

    const createItems = useCreatePriceCatalogItems();
    const updateItem = useUpdatePriceCatalogItem();
    const deleteItem = useDeletePriceCatalogItem();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PriceCatalogItem | null>(null);
    const [formData, setFormData] = useState({
        item_description: '',
        unit: '',
        unit_price: '',
        reservoir_id: 'all' as string | null,
    });
    const [previewItems, setPreviewItems] = useState<{
        item_description: string;
        unit: string;
        unit_price: string;
    }[]>([]);

    const reservoirOptions = useMemo(() => {
        const options = [{ label: 'General / All Reservoirs', value: 'all' }];
        if (reservoirs) {
            reservoirs.forEach(r => {
                options.push({ label: r.name, value: r.id });
            });
        }
        return options;
    }, [reservoirs]);

    const filteredCatalog = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return catalog || [];

        return (catalog || []).filter((item) =>
            item.item_description.toLowerCase().includes(q) ||
            (item.reservoirs as any)?.name?.toLowerCase().includes(q)
        );
    }, [catalog, searchQuery]);

    const groupedCatalog = useMemo(() => {
        const groups: Record<string, {
            id: string;
            name: string;
            location?: string;
            items: PriceCatalogItem[];
        }> = {};

        filteredCatalog.forEach(item => {
            const resId = item.reservoir_id || 'general';
            if (!groups[resId]) {
                const reservoir = reservoirs?.find(r => r.id === item.reservoir_id);
                groups[resId] = {
                    id: resId,
                    name: reservoir?.name || 'General (All Reservoirs)',
                    location: (reservoir as any)?.locations?.name,
                    items: []
                };
            }
            groups[resId].items.push(item);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.id === 'general') return -1;
            if (b.id === 'general') return 1;
            return a.name.localeCompare(b.name);
        });
    }, [filteredCatalog, reservoirs]);

    const handleOpenDialog = (item?: PriceCatalogItem) => {
        if (item) {
            setEditingItem(item);
            const match = item.item_description.match(/(.*) \((.*)\)$/);
            if (match) {
                setFormData({
                    item_description: match[1],
                    unit: match[2],
                    unit_price: item.unit_price.toString(),
                    reservoir_id: item.reservoir_id || 'all',
                });
            } else {
                setFormData({
                    item_description: item.item_description,
                    unit: '',
                    unit_price: item.unit_price.toString(),
                    reservoir_id: item.reservoir_id || 'all',
                });
            }
        } else {
            setEditingItem(null);
            setFormData({
                item_description: '',
                unit: '',
                unit_price: '',
                reservoir_id: 'all',
            });
            setPreviewItems([]);
        }
        setIsDialogOpen(true);
    };

    const handleAddToPreview = async () => {
        if (!formData.item_description || !formData.unit_price) {
            toast.error('Please fill in Item Name and Unit Price');
            return;
        }

        const description = formData.unit
            ? `${formData.item_description} (${formData.unit})`
            : formData.item_description;

        const reservoir_id = formData.reservoir_id === 'all' ? null : formData.reservoir_id;

        try {
            const newItem = {
                item_description: description,
                unit_price: parseFloat(formData.unit_price),
                reservoir_id,
            };

            await createItems.mutateAsync([newItem] as any);

            setPreviewItems([
                ...previewItems,
                {
                    item_description: formData.item_description,
                    unit: formData.unit,
                    unit_price: formData.unit_price,
                },
            ]);

            setFormData({
                ...formData,
                item_description: '',
                unit: '',
                unit_price: '',
            });

            toast.success('Item added to catalog');
        } catch (e: any) {
            toast.error(e.message || 'Failed to save item');
        }
    };

    const handleRemoveFromPreview = (idx: number) => {
        setPreviewItems(previewItems.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        if (editingItem) {
            if (!formData.item_description || !formData.unit_price) {
                toast.error('Please fill in all required fields');
                return;
            }

            const description = formData.unit
                ? `${formData.item_description} (${formData.unit})`
                : formData.item_description;

            const data = {
                item_description: description,
                unit_price: parseFloat(formData.unit_price),
                reservoir_id: formData.reservoir_id === 'all' ? null : formData.reservoir_id,
            };

            try {
                await updateItem.mutateAsync({ id: editingItem.id, ...data });
                toast.success('Item updated successfully');
                setIsDialogOpen(false);
            } catch (e: any) {
                toast.error(e.message || 'Failed to save item');
            }
        } else {
            if (formData.item_description && formData.unit_price) {
                await handleAddToPreview();
            }
            setIsDialogOpen(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await deleteItem.mutateAsync(id);
            toast.success('Item deleted');
        } catch (e: any) {
            toast.error(e.message || 'Failed to delete');
        }
    };

    return (
        <div className="animate-fade-in px-2 md:px-0">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Prices and Items</h1>
                    <p className="text-muted-foreground">Manage standard prices and item data</p>
                </div>
                <Button
                    onClick={() => handleOpenDialog()}
                    className="rounded-full h-12 w-12 p-0 bg-red-500 hover:bg-red-600 shadow-lg transition-all active:scale-95"
                    title="Add Standard Price"
                >
                    <Plus className="h-6 w-6 text-white" />
                </Button>
            </div>

            <CardHeader className="pb-3 px-0">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <CardTitle>Standard Price List</CardTitle>
                        <CardDescription>Master list of standard items and unit prices grouped by reservoir.</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search catalog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 shadow-sm"
                        />
                    </div>
                </div>
            </CardHeader>

            <div className="mt-4">
                {isLoadingCatalog ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : groupedCatalog.length === 0 ? (
                    <Card className="p-12 text-center border-dashed bg-muted/20">
                        <div className="p-3 rounded-full bg-muted w-fit mx-auto mb-4">
                            <Tag className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-1">No items found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            Try adjusting your search query or add a new standard price to the system.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-8">
                        {groupedCatalog.map((group, index) => (
                            <Card
                                key={group.id}
                                className="flex flex-col h-full group hover:shadow-xl transition-all animate-slide-up bg-card overflow-hidden border-2 border-border/60 hover:border-primary/30"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <CardHeader className="pb-6 border-b border-border/40 bg-muted/10">
                                    <div className="space-y-1">
                                        <CardTitle className="text-2xl font-bold tracking-tight text-foreground">{group.name}</CardTitle>
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium">
                                            <MapPin className="h-4 w-4 text-primary" />
                                            {group.location || 'All Centers'}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-8 pb-8 flex-grow">
                                    <div className="space-y-5">
                                        {group.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between group/item">
                                                <div className="flex items-center gap-4 flex-grow">
                                                    <span className="font-semibold text-lg text-foreground min-w-[150px]">{item.item_description}</span>
                                                    <div className="h-px bg-border/40 flex-grow border-dotted border-t-2"></div>
                                                    <span className="font-black text-xl text-primary whitespace-nowrap">
                                                        <span className="text-xs uppercase tracking-tighter mr-1 font-bold">LKR</span>
                                                        {Number(item.unit_price).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="ml-6 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                                                        onClick={() => handleOpenDialog(item)}
                                                        title="Edit Price"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                                                        onClick={() => handleDelete(item.id)}
                                                        title="Delete Item"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <div className="mt-auto border-t border-border/40 p-4 grid grid-cols-2 gap-4 bg-muted/10">
                                    <Button
                                        variant="outline"
                                        className="w-full font-bold h-11 border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 text-primary transition-all active:scale-95"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, reservoir_id: group.id === 'general' ? 'all' : group.id }));
                                            handleOpenDialog(undefined);
                                        }}
                                    >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit Details
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full font-bold h-11 border-2 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive/40 transition-all active:scale-95"
                                        onClick={() => {
                                            if (confirm(`Are you sure you want to delete all prices for ${group.name}?`)) {
                                                group.items.forEach(it => deleteItem.mutate(it.id));
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Group
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Update the standard price for this item.' : 'Add items to the price catalog. Selected reservoir applies to all items added.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <div className="space-y-4 border-b pb-6">
                            <div className="space-y-2">
                                <Label htmlFor="res" className="text-lg font-bold">Reservoir</Label>
                                <SearchableSelect
                                    options={reservoirOptions}
                                    value={formData.reservoir_id || 'all'}
                                    onValueChange={(v) => setFormData({ ...formData, reservoir_id: v })}
                                    disabled={!!editingItem}
                                    placeholder="Search Reservoir..."
                                    emptyMessage="No reservoir found."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {!editingItem && <Label className="text-lg font-bold">Item Description</Label>}
                            <div className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-4 space-y-2">
                                    <Label htmlFor="item" className="text-xs uppercase text-muted-foreground font-semibold">Item</Label>
                                    <Input
                                        id="item"
                                        value={formData.item_description}
                                        onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                                        placeholder="Small Fish"
                                        className="h-10"
                                    />
                                </div>
                                <div className="col-span-3 space-y-2">
                                    <Label htmlFor="unit_input" className="text-xs uppercase text-muted-foreground font-semibold">Unit</Label>
                                    <Input
                                        id="unit_input"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        placeholder="kg"
                                        className="h-10"
                                    />
                                </div>
                                <div className="col-span-4 space-y-2">
                                    <Label htmlFor="price" className="text-xs uppercase text-muted-foreground font-semibold">Unit Price</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        value={formData.unit_price}
                                        onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                                        placeholder="0.00"
                                        className="h-10"
                                    />
                                </div>
                                {!editingItem && (
                                    <div className="col-span-1">
                                        <Button
                                            type="button"
                                            size="icon"
                                            onClick={handleAddToPreview}
                                            className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-md"
                                        >
                                            <PlusCircle className="h-6 w-6" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!editingItem && previewItems.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-lg font-bold">Preview</Label>
                                <div className="border rounded-lg overflow-hidden bg-slate-50/50">
                                    <Table>
                                        <TableBody>
                                            {previewItems.map((it, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="py-2">
                                                        <span className="font-medium">{it.item_description}</span>
                                                        {it.unit && <span className="text-muted-foreground ml-1">({it.unit})</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right py-2 font-semibold">
                                                        {parseFloat(it.unit_price).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="w-[50px] py-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveFromPreview(idx)}
                                                            className="h-8 w-8 text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-xs text-muted-foreground italic">Add more items for this reservoir</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-none border-2">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={createItems.isPending || updateItem.isPending}
                            className="flex-1 sm:flex-none font-bold shadow-md active:translate-y-px"
                        >
                            {(createItems.isPending || updateItem.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
