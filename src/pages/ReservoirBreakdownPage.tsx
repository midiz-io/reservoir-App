import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Loader2,
  Plus,
  Search,
  Droplets,
  Scale,
  Fish,
  AlertCircle,
  History,
  Trash2,
  Edit,
  Download,
  Printer,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useReservoirs } from '@/hooks/useReservoirs';
import { useLocations } from '@/hooks/useLocations';
import { useAssociationBills } from '@/hooks/useAssociationBills';
import {
  useReservoirPLStockings,
  useCreateReservoirPLStocking,
  useUpdateReservoirPLStocking,
  useDeleteReservoirPLStocking,
  ReservoirPLStocking,
} from '@/hooks/useReservoirPLStockings';

const PL_PER_KG = 100;

interface ReservoirBreakdownRow {
  id: string;
  name: string;
  locationName: string;
  locationId: string | null;
  plStockedQty: number;
  collectionKg: number;
  collectedPL: number;
  outstandingPL: number;
  outstandingKgEq: number;
  recoveryPercent: number;
  totalValue: number;
  billCount: number;
  stockingCount: number;
  lastStockedDate: string | null;
  lastCollectionDate: string | null;
}

export default function ReservoirBreakdownPage() {
  const { user, userRole } = useAuth();
  const canManage = userRole === 'super_admin' || userRole === 'employee';

  const { data: reservoirs, isLoading: reservoirsLoading } = useReservoirs();
  const { data: locations } = useLocations();
  const { data: bills, isLoading: billsLoading } = useAssociationBills();
  const { data: stockings, isLoading: stockingsLoading } = useReservoirPLStockings();

  const createStocking = useCreateReservoirPLStocking();
  const updateStocking = useUpdateReservoirPLStocking();
  const deleteStocking = useDeleteReservoirPLStocking();

  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active_only'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ReservoirBreakdownRow; dir: 'asc' | 'desc' }>({
    key: 'outstandingPL',
    dir: 'desc',
  });

  // Add / Edit PL Stocking modal state
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingStocking, setEditingStocking] = useState<ReservoirPLStocking | null>(null);
  const [formReservoirId, setFormReservoirId] = useState('');
  const [formStockedDate, setFormStockedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPlQuantity, setFormPlQuantity] = useState('');
  const [formBatchRef, setFormBatchRef] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // History modal state
  const [historyReservoirId, setHistoryReservoirId] = useState<string | null>(null);

  const approvedBills = useMemo(
    () => (bills || []).filter((b: any) => b.status === 'approved'),
    [bills]
  );

  const breakdownRows = useMemo<ReservoirBreakdownRow[]>(() => {
    if (!reservoirs) return [];

    return reservoirs.map((res) => {
      const resStockings = (stockings || []).filter((s) => s.reservoir_id === res.id);
      const resBills = approvedBills.filter((b: any) => b.reservoir_id === res.id);

      const plStockedQty = resStockings.reduce((sum, s) => sum + (Number(s.pl_quantity) || 0), 0);

      let collectionKg = 0;
      let totalValue = 0;
      let lastCollectionDate: string | null = null;

      resBills.forEach((b: any) => {
        totalValue += Number(b.total) || 0;
        if (b.bill_date && (!lastCollectionDate || b.bill_date > lastCollectionDate)) {
          lastCollectionDate = b.bill_date;
        }
        let items = b.items;
        if (typeof items === 'string') {
          try {
            items = JSON.parse(items);
          } catch {
            items = [];
          }
        }
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            collectionKg += Number(it.qty) || 0;
          });
        }
      });

      let lastStockedDate: string | null = null;
      resStockings.forEach((s) => {
        if (s.stocked_date && (!lastStockedDate || s.stocked_date > lastStockedDate)) {
          lastStockedDate = s.stocked_date;
        }
      });

      const collectedPL = collectionKg * PL_PER_KG;
      const outstandingPL = plStockedQty - collectedPL;
      const outstandingKgEq = outstandingPL / PL_PER_KG;
      const recoveryPercent = plStockedQty > 0 ? Math.min(100, Math.max(0, (collectedPL / plStockedQty) * 100)) : 0;

      return {
        id: res.id,
        name: res.name,
        locationName: res.locations?.name || '—',
        locationId: res.location_id || null,
        plStockedQty,
        collectionKg,
        collectedPL,
        outstandingPL,
        outstandingKgEq,
        recoveryPercent,
        totalValue,
        billCount: resBills.length,
        stockingCount: resStockings.length,
        lastStockedDate,
        lastCollectionDate,
      };
    });
  }, [reservoirs, stockings, approvedBills]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return breakdownRows
      .filter((row) => {
        if (locationFilter !== 'all' && row.locationId !== locationFilter) return false;
        if (activityFilter === 'active_only' && row.plStockedQty === 0 && row.collectionKg === 0) {
          return false;
        }
        if (q) {
          return (
            row.name.toLowerCase().includes(q) ||
            row.locationName.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [breakdownRows, searchQuery, locationFilter, activityFilter, sortConfig]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.plStockedQty += r.plStockedQty;
        acc.collectionKg += r.collectionKg;
        acc.collectedPL += r.collectedPL;
        acc.outstandingPL += r.outstandingPL;
        acc.totalValue += r.totalValue;
        if (r.plStockedQty > 0 || r.collectionKg > 0) acc.activeCount += 1;
        return acc;
      },
      { plStockedQty: 0, collectionKg: 0, collectedPL: 0, outstandingPL: 0, totalValue: 0, activeCount: 0 }
    );
  }, [filteredRows]);

  const chartData = useMemo(() => {
    return filteredRows
      .filter((r) => r.plStockedQty > 0 || r.collectionKg > 0)
      .slice(0, 15)
      .map((r) => ({
        name: r.name.length > 14 ? `${r.name.slice(0, 14)}…` : r.name,
        fullName: r.name,
        'PL Stocked': Math.round(r.plStockedQty),
        'Collected PL': Math.round(r.collectedPL),
        'Outstanding PL': Math.round(r.outstandingPL),
      }));
  }, [filteredRows]);

  const reservoirOptions = useMemo(() => {
    return (reservoirs || []).map((r) => ({
      label: r.locations?.name ? `${r.name} (${r.locations.name})` : r.name,
      value: r.id,
    }));
  }, [reservoirs]);

  const historyReservoir = useMemo(
    () => breakdownRows.find((r) => r.id === historyReservoirId) || null,
    [breakdownRows, historyReservoirId]
  );

  const historyStockings = useMemo(
    () => (stockings || []).filter((s) => s.reservoir_id === historyReservoirId),
    [stockings, historyReservoirId]
  );

  const historyBills = useMemo(
    () => approvedBills.filter((b: any) => b.reservoir_id === historyReservoirId),
    [approvedBills, historyReservoirId]
  );

  const toggleSort = (key: keyof ReservoirBreakdownRow) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' }
    );
  };

  const openAddStockDialog = (reservoirId?: string) => {
    setEditingStocking(null);
    setFormReservoirId(reservoirId || '');
    setFormStockedDate(new Date().toISOString().split('T')[0]);
    setFormPlQuantity('');
    setFormBatchRef('');
    setFormNotes('');
    setIsStockDialogOpen(true);
  };

  const openEditStockDialog = (entry: ReservoirPLStocking) => {
    setEditingStocking(entry);
    setFormReservoirId(entry.reservoir_id);
    setFormStockedDate(entry.stocked_date);
    setFormPlQuantity(String(entry.pl_quantity));
    setFormBatchRef(entry.batch_reference || '');
    setFormNotes(entry.notes || '');
    setIsStockDialogOpen(true);
  };

  const handleSaveStocking = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(formPlQuantity);
    if (!formReservoirId || !formStockedDate || !Number.isFinite(qty) || qty < 0) {
      toast.error('Please select a reservoir, date, and valid PL quantity.');
      return;
    }

    try {
      if (editingStocking) {
        await updateStocking.mutateAsync({
          id: editingStocking.id,
          reservoir_id: formReservoirId,
          stocked_date: formStockedDate,
          pl_quantity: qty,
          batch_reference: formBatchRef.trim() || null,
          notes: formNotes.trim() || null,
        });
        toast.success('PL stocking record updated.');
      } else {
        await createStocking.mutateAsync({
          reservoir_id: formReservoirId,
          stocked_date: formStockedDate,
          pl_quantity: qty,
          batch_reference: formBatchRef.trim() || null,
          notes: formNotes.trim() || null,
          created_by: user?.id || null,
        });
        toast.success('PL stocking quantity added.');
      }
      setIsStockDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save PL stocking record');
    }
  };

  const handleDeleteStocking = async (id: string) => {
    if (!confirm('Delete this PL stocking record?')) return;
    try {
      await deleteStocking.mutateAsync(id);
      toast.success('PL stocking record deleted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete record');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Reservoir',
      'Location',
      'PL Stocked Qty',
      'Collection Qty (kg)',
      'Collected PL (1kg=100PL)',
      'Reservoir Outstanding (PL)',
      'Outstanding (kg eq.)',
      'Recovery %',
      'Last Stocked Date',
      'Last Collection Date',
    ];
    const rows = filteredRows.map((r) => [
      `"${r.name}"`,
      `"${r.locationName}"`,
      r.plStockedQty,
      r.collectionKg.toFixed(2),
      Math.round(r.collectedPL),
      Math.round(r.outstandingPL),
      r.outstandingKgEq.toFixed(2),
      r.recoveryPercent.toFixed(1),
      r.lastStockedDate || '',
      r.lastCollectionDate || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reservoir_Breakdown_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (reservoirsLoading || billsLoading || stockingsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Reservoir-wise Breakdown
          </h1>
          <p className="text-muted-foreground">
            Track Reservoir Outstanding, Collection Quantity, and PL Stocked Quantity (1 kg = 100 PL)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {canManage && (
            <Button onClick={() => openAddStockDialog()} className="gradient-water">
              <Plus className="h-4 w-4 mr-2" />
              Add PL Stocking
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Reservoir Outstanding
              </p>
              <p className="text-2xl font-black text-primary mt-1">
                {Math.round(totals.outstandingPL).toLocaleString()} <span className="text-sm font-bold">PL</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ≈ {(totals.outstandingPL / PL_PER_KG).toFixed(1)} kg remaining
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/15 text-primary">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Collection Quantity
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {totals.collectionKg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}{' '}
                <span className="text-sm font-bold">kg</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {Math.round(totals.collectedPL).toLocaleString()} PL harvested
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-600">
              <Scale className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. PL Stocked Quantity
              </p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {Math.round(totals.plStockedQty).toLocaleString()} <span className="text-sm font-bold">PL</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Across {totals.activeCount} active reservoirs
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600">
              <Fish className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overall Recovery
              </p>
              <p className="text-2xl font-black text-indigo-600 mt-1">
                {totals.plStockedQty > 0
                  ? ((totals.collectedPL / totals.plStockedQty) * 100).toFixed(1)
                  : '0.0'}
                %
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Value: Rs. {totals.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-600">
              <Droplets className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reservoir or center..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations / Centers</SelectItem>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activityFilter} onValueChange={(v: any) => setActivityFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reservoirs ({breakdownRows.length})</SelectItem>
                <SelectItem value="active_only">Stocked / Harvested Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservoir PL Stocked vs Collected vs Outstanding</CardTitle>
            <CardDescription>Top reservoirs comparing stocked PL, harvested PL (1 kg = 100 PL), and outstanding balance</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="PL Stocked" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Collected PL" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Outstanding PL" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reservoir-wise Breakdown Table</CardTitle>
          <CardDescription>
            Outstanding = PL Stocked − Collected PL (Collection kg × 100)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" onClick={() => toggleSort('name')} className="px-0 font-bold">
                    Reservoir <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => toggleSort('plStockedQty')} className="px-0 font-bold ml-auto">
                    PL Stocked <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => toggleSort('collectionKg')} className="px-0 font-bold ml-auto">
                    Collection Qty (kg) <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Collected PL</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => toggleSort('outstandingPL')} className="px-0 font-bold ml-auto">
                    Outstanding (PL) <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead className="w-36">Recovery</TableHead>
                <TableHead className="text-right print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  <TableCell className="font-semibold">
                    <div>{row.name}</div>
                    {row.lastStockedDate && (
                      <span className="text-[11px] text-muted-foreground">
                        Last stocked: {row.lastStockedDate}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.locationName}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-amber-600">
                    {Math.round(row.plStockedQty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-emerald-600">
                    {row.collectionKg.toFixed(2)} kg
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {Math.round(row.collectedPL).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={row.outstandingPL > 0 ? 'default' : row.outstandingPL < 0 ? 'destructive' : 'secondary'}
                      className="font-mono font-bold"
                    >
                      {Math.round(row.outstandingPL).toLocaleString()} PL
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={row.recoveryPercent} className="h-2" />
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {row.recoveryPercent.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    <div className="flex items-center justify-end gap-1">
                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAddStockDialog(row.id)}
                          className="h-8 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Stock PL
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setHistoryReservoirId(row.id)}
                        title="View Stocking & Collection History"
                        className="h-8 w-8"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No reservoirs match the current filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit PL Stocking Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStocking ? 'Edit PL Stocking Record' : 'Add PL Stocking'}</DialogTitle>
            <DialogDescription>
              Record Post-Larvae (PL) quantity stocked into a reservoir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveStocking} className="space-y-4">
            <div className="space-y-2">
              <Label>Reservoir *</Label>
              <SearchableSelect
                options={reservoirOptions}
                value={formReservoirId}
                onValueChange={setFormReservoirId}
                placeholder="Select reservoir..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockedDate">Stocked Date *</Label>
                <Input
                  id="stockedDate"
                  type="date"
                  value={formStockedDate}
                  onChange={(e) => setFormStockedDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plQty">PL Stocked Qty *</Label>
                <Input
                  id="plQty"
                  type="number"
                  min="0"
                  step="1"
                  value={formPlQuantity}
                  onChange={(e) => setFormPlQuantity(e.target.value)}
                  placeholder="e.g. 50000"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchRef">Batch / Hatchery Reference (Optional)</Label>
              <Input
                id="batchRef"
                value={formBatchRef}
                onChange={(e) => setFormBatchRef(e.target.value)}
                placeholder="e.g. Batch #2026-04"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stockNotes">Notes (Optional)</Label>
              <Textarea
                id="stockNotes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Any remarks..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsStockDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createStocking.isPending || updateStocking.isPending}
                className="gradient-water"
              >
                {(createStocking.isPending || updateStocking.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingStocking ? 'Update' : 'Save PL Stocking'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reservoir Stocking & Collection History Dialog */}
      <Dialog open={!!historyReservoirId} onOpenChange={(o) => !o && setHistoryReservoirId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {historyReservoir && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>{historyReservoir.name} — Breakdown History</span>
                  <Badge variant="outline">{historyReservoir.locationName}</Badge>
                </DialogTitle>
                <DialogDescription>
                  PL Stocked: {Math.round(historyReservoir.plStockedQty).toLocaleString()} PL | Collected:{' '}
                  {historyReservoir.collectionKg.toFixed(2)} kg ({Math.round(historyReservoir.collectedPL).toLocaleString()} PL) | Outstanding:{' '}
                  {Math.round(historyReservoir.outstandingPL).toLocaleString()} PL
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                      PL Stocking Batches ({historyStockings.length})
                    </h4>
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => openAddStockDialog(historyReservoir.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Stocking
                      </Button>
                    )}
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">PL Qty</TableHead>
                          <TableHead>Batch Ref</TableHead>
                          <TableHead>Notes</TableHead>
                          {canManage && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyStockings.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>{s.stocked_date}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-amber-600">
                              {Number(s.pl_quantity).toLocaleString()}
                            </TableCell>
                            <TableCell>{s.batch_reference || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{s.notes || '—'}</TableCell>
                            {canManage && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEditStockDialog(s)}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDeleteStocking(s.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {historyStockings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={canManage ? 5 : 4} className="text-center py-6 text-muted-foreground">
                              No PL stockings recorded for this reservoir yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Approved Collection Bills ({historyBills.length})
                  </h4>
                  <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Bill No</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead className="text-right">Qty (kg)</TableHead>
                          <TableHead className="text-right">Value (Rs.)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyBills.slice(0, 50).map((b: any) => {
                          const qty = Array.isArray(b.items)
                            ? b.items.reduce((sum: number, it: any) => sum + (Number(it.qty) || 0), 0)
                            : 0;
                          return (
                            <TableRow key={b.id}>
                              <TableCell>{b.bill_date}</TableCell>
                              <TableCell className="font-mono font-semibold">{b.bill_no}</TableCell>
                              <TableCell>{b.supplier_name}</TableCell>
                              <TableCell className="text-right font-mono">{qty.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">
                                {Number(b.total || 0).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {historyBills.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No approved collection bills for this reservoir.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
