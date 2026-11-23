import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Loader2,
  Plus,
  Search,
  ThermometerSnowflake,
  Package,
  Coins,
  Wallet,
  CreditCard,
  Edit,
  Trash2,
  Download,
  Printer,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useLocations } from '@/hooks/useLocations';
import {
  useIceDetails,
  useCreateIceDetail,
  useUpdateIceDetail,
  useDeleteIceDetail,
  IceDetail,
} from '@/hooks/useIceDetails';

const DEFAULT_ICE_CUBE_RATE = 570;

function formatDisplayDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const datePart = raw.split('T')[0];
  const d = new Date(datePart);
  if (isNaN(d.getTime())) return datePart;
  const day = d.getDate();
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const yr = d.getFullYear();
  return `${day}-${mon}-${yr}`;
}

export default function IceDetailsPage() {
  const { user, userRole } = useAuth();
  const canManage = userRole === 'super_admin' || userRole === 'employee';

  const { data: iceRecords, isLoading } = useIceDetails();
  const { data: locations } = useLocations();
  const createIce = useCreateIceDetail();
  const updateIce = useUpdateIceDetail();
  const deleteIce = useDeleteIceDetail();

  const [searchQuery, setSearchQuery] = useState('');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Add / Edit Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IceDetail | null>(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [boxes, setBoxes] = useState('');
  const [iceCubes, setIceCubes] = useState('');
  const [unitRate, setUnitRate] = useState(String(DEFAULT_ICE_CUBE_RATE));
  const [billNo, setBillNo] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [manualBillAmount, setManualBillAmount] = useState(false);
  const [paymentRef, setPaymentRef] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [locationId, setLocationId] = useState('none');
  const [notes, setNotes] = useState('');

  // Quick Payment Dialog State
  const [paymentEntry, setPaymentEntry] = useState<(IceDetail & { runningBalance: number }) | null>(null);
  const [quickPayRef, setQuickPayRef] = useState('');
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayDate, setQuickPayDate] = useState(new Date().toISOString().split('T')[0]);

  // Compute chronological running balance and extra cubes across all records
  const ledgerRows = useMemo(() => {
    if (!iceRecords) return [];
    let runningBalance = 0;

    return iceRecords.map((rec) => {
      const boxCount = Number(rec.boxes) || 0;
      const cubeCount = Number(rec.ice_cubes) || 0;
      const extraCubes = cubeCount - boxCount;
      const amt = Number(rec.bill_amount) || 0;
      const paid = Number(rec.paid_amount) || 0;
      runningBalance += amt - paid;

      return {
        ...rec,
        boxCount,
        cubeCount,
        extraCubes,
        billAmtNum: amt,
        paidAmtNum: paid,
        runningBalance,
      };
    });
  }, [iceRecords]);

  const driverOptions = useMemo(() => {
    const set = new Set<string>();
    ledgerRows.forEach((r) => {
      if (r.driver_name?.trim()) set.add(r.driver_name.trim());
    });
    return Array.from(set).sort();
  }, [ledgerRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ledgerRows.filter((row) => {
      if (startDate && row.entry_date < startDate) return false;
      if (endDate && row.entry_date > endDate) return false;
      if (driverFilter !== 'all' && (row.driver_name || '').trim() !== driverFilter) return false;
      if (q) {
        const matchBill = (row.bill_no || '').toLowerCase().includes(q);
        const matchRef = (row.payment_ref || '').toLowerCase().includes(q);
        const matchDriver = (row.driver_name || '').toLowerCase().includes(q);
        if (!matchBill && !matchRef && !matchDriver) return false;
      }
      return true;
    });
  }, [ledgerRows, startDate, endDate, driverFilter, searchQuery]);

  const summary = useMemo(() => {
    const totals = filteredRows.reduce(
      (acc, r) => {
        acc.boxes += r.boxCount;
        acc.iceCubes += r.cubeCount;
        acc.extraCubes += r.extraCubes;
        acc.billAmount += r.billAmtNum;
        acc.paidAmount += r.paidAmtNum;
        return acc;
      },
      { boxes: 0, iceCubes: 0, extraCubes: 0, billAmount: 0, paidAmount: 0 }
    );
    const currentBalance =
      ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].runningBalance : 0;
    return { ...totals, currentBalance };
  }, [filteredRows, ledgerRows]);

  const handleIceCubesOrRateChange = (nextCubes: string, nextRate: string) => {
    setIceCubes(nextCubes);
    setUnitRate(nextRate);
    if (!manualBillAmount) {
      const c = Number(nextCubes) || 0;
      const r = Number(nextRate) || 0;
      setBillAmount(c > 0 && r > 0 ? (c * r).toFixed(2) : '');
    }
  };

  const openAddDialog = () => {
    setEditingEntry(null);
    setEntryDate(new Date().toISOString().split('T')[0]);
    setBoxes('');
    setIceCubes('');
    setUnitRate(String(DEFAULT_ICE_CUBE_RATE));
    setBillNo('');
    setBillAmount('');
    setManualBillAmount(false);
    setPaymentRef('');
    setPaidAmount('');
    setPaidDate('');
    setDriverName('');
    setLocationId('none');
    setNotes('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (rec: IceDetail) => {
    setEditingEntry(rec);
    setEntryDate(rec.entry_date);
    setBoxes(String(rec.boxes));
    setIceCubes(String(rec.ice_cubes));
    setUnitRate(String(rec.unit_rate || DEFAULT_ICE_CUBE_RATE));
    setBillNo(rec.bill_no || '');
    setBillAmount(String(rec.bill_amount || ''));
    setManualBillAmount(true);
    setPaymentRef(rec.payment_ref || '');
    setPaidAmount(rec.paid_amount ? String(rec.paid_amount) : '');
    setPaidDate(rec.paid_date || '');
    setDriverName(rec.driver_name || '');
    setLocationId(rec.location_id || 'none');
    setNotes(rec.notes || '');
    setIsDialogOpen(true);
  };

  const openQuickPayDialog = (row: IceDetail & { runningBalance: number }) => {
    setPaymentEntry(row);
    setQuickPayRef(row.payment_ref || '');
    setQuickPayAmount(
      row.paid_amount && Number(row.paid_amount) > 0
        ? String(row.paid_amount)
        : String(row.runningBalance > 0 ? row.runningBalance : row.bill_amount)
    );
    setQuickPayDate(row.paid_date || new Date().toISOString().split('T')[0]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate) {
      toast.error('Date is required.');
      return;
    }

    const payload = {
      entry_date: entryDate,
      boxes: Math.max(0, Math.round(Number(boxes) || 0)),
      ice_cubes: Number(iceCubes) || 0,
      unit_rate: Number(unitRate) || DEFAULT_ICE_CUBE_RATE,
      bill_no: billNo.trim(),
      bill_amount: Number(billAmount) || 0,
      payment_ref: paymentRef.trim() || null,
      paid_amount: Number(paidAmount) || 0,
      paid_date: paidDate || null,
      driver_name: driverName.trim() || null,
      location_id: locationId !== 'none' ? locationId : null,
      notes: notes.trim() || null,
    };

    try {
      if (editingEntry) {
        await updateIce.mutateAsync({ id: editingEntry.id, ...payload });
        toast.success('Ice record updated.');
      } else {
        await createIce.mutateAsync({ ...payload, created_by: user?.id || null });
        toast.success('Ice record added.');
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save ice record');
    }
  };

  const handleSaveQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentEntry) return;
    try {
      await updateIce.mutateAsync({
        id: paymentEntry.id,
        payment_ref: quickPayRef.trim() || null,
        paid_amount: Number(quickPayAmount) || 0,
        paid_date: quickPayDate || null,
      });
      toast.success('Ice bill payment recorded.');
      setPaymentEntry(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this ice record?')) return;
    try {
      await deleteIce.mutateAsync(id);
      toast.success('Ice record deleted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete record');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Boxes',
      'Ice Cubes',
      'Extra (Cubes - Boxes)',
      'Bill No',
      'Bill Amount',
      'Payment Ref',
      'Paid Amount',
      'Paid Date',
      'Balance',
      'Driver',
    ];
    const rows = filteredRows.map((r) => [
      `"${formatDisplayDate(r.entry_date)}"`,
      r.boxCount,
      r.cubeCount,
      r.extraCubes.toFixed(2),
      `"${r.bill_no}"`,
      r.billAmtNum.toFixed(2),
      `"${r.payment_ref || ''}"`,
      r.paidAmtNum > 0 ? r.paidAmtNum.toFixed(2) : '',
      `"${r.paid_date ? formatDisplayDate(r.paid_date) : ''}"`,
      r.runningBalance.toFixed(2),
      `"${r.driver_name || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ice_Details_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const liveExtraPreview = (Number(iceCubes) || 0) - (Number(boxes) || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Ice Details</h1>
          <p className="text-muted-foreground">
            Track daily ice cubes, boxes, ice bill amounts, payments, running balance, and driver records.
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
            <Button onClick={openAddDialog} className="gradient-water">
              <Plus className="h-4 w-4 mr-2" />
              Add Ice Bill
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Boxes</p>
              <p className="text-2xl font-black text-primary mt-1">{summary.boxes.toLocaleString()}</p>
            </div>
            <Package className="h-6 w-6 text-primary opacity-80" />
          </CardContent>
        </Card>

        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ice Cubes</p>
              <p className="text-2xl font-black text-sky-600 mt-1">{summary.iceCubes.toFixed(2)}</p>
              <p className="text-[11px] text-muted-foreground">Extra: {summary.extraCubes.toFixed(2)}</p>
            </div>
            <ThermometerSnowflake className="h-6 w-6 text-sky-600 opacity-80" />
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Bill Amount</p>
              <p className="text-xl font-black text-amber-600 mt-1">
                Rs. {summary.billAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Coins className="h-6 w-6 text-amber-600 opacity-80" />
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Paid</p>
              <p className="text-xl font-black text-emerald-600 mt-1">
                Rs. {summary.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <CreditCard className="h-6 w-6 text-emerald-600 opacity-80" />
          </CardContent>
        </Card>

        <Card className="border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Current Balance</p>
              <p className="text-xl font-black text-rose-600 mt-1">
                Rs. {summary.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Wallet className="h-6 w-6 text-rose-600 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Bill No, Ref, Driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drivers</SelectItem>
                {driverOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ice Details Ledger Table matching Image 2 */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle>Ice Details Sheet</CardTitle>
          <CardDescription>
            Running balance automatically accumulates Bill Amounts minus Paid Amounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-yellow-300/90 hover:bg-yellow-300/90 text-black font-bold border-b-2 border-black/20">
                <TableHead className="font-bold text-black">Date</TableHead>
                <TableHead className="font-bold text-black text-right">Boxes</TableHead>
                <TableHead className="font-bold text-black text-right">Ice Cubes</TableHead>
                <TableHead className="font-bold text-black text-right">Extra (Cubes − Boxes)</TableHead>
                <TableHead className="font-bold text-black">Bill No</TableHead>
                <TableHead className="font-bold text-black text-right">Bill Amount</TableHead>
                <TableHead className="font-bold text-black">Ref / Voucher</TableHead>
                <TableHead className="font-bold text-black text-right">Paid Amount</TableHead>
                <TableHead className="font-bold text-black">Paid Date</TableHead>
                <TableHead className="font-bold text-black text-right">Balance</TableHead>
                <TableHead className="font-bold text-black">Driver</TableHead>
                <TableHead className="font-bold text-black text-right print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  <TableCell className="whitespace-nowrap font-medium">
                    {formatDisplayDate(row.entry_date)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{row.boxCount}</TableCell>
                  <TableCell className="text-right font-mono">{row.cubeCount}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {Number.isInteger(row.extraCubes) ? row.extraCubes : row.extraCubes.toFixed(2)}
                  </TableCell>
                  <TableCell className="font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    {row.bill_no || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold bg-sky-500/10">
                    {row.billAmtNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.payment_ref || ''}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-emerald-600">
                    {row.paidAmtNum > 0
                      ? row.paidAmtNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : ''}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {row.paid_date ? formatDisplayDate(row.paid_date) : ''}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.driver_name ? (
                      <Badge variant="outline" className="gap-1 font-medium">
                        <Truck className="h-3 w-3" />
                        {row.driver_name}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right print:hidden">
                    {canManage && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => openQuickPayDialog(row)}
                          title="Record Payment"
                        >
                          Pay
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(row)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                    No ice details recorded yet. Click "Add Ice Bill" to add your first entry.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {filteredRows.length > 0 && (
              <TableFooter className="font-bold">
                <TableRow>
                  <TableCell>TOTALS</TableCell>
                  <TableCell className="text-right font-mono">{summary.boxes}</TableCell>
                  <TableCell className="text-right font-mono">{summary.iceCubes.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{summary.extraCubes.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono">
                    {summary.billAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-emerald-600">
                    {summary.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-mono text-rose-600">
                    {summary.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Ice Entry Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Ice Detail' : 'Add Ice Bill / Detail'}</DialogTitle>
            <DialogDescription>
              Enter boxes, ice cubes, bill details, driver, and optional payment info.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ice_date">Date *</Label>
                <Input
                  id="ice_date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_driver">Driver</Label>
                <Input
                  id="ice_driver"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Damith, Sagara"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ice_boxes">Boxes *</Label>
                <Input
                  id="ice_boxes"
                  type="number"
                  min="0"
                  step="1"
                  value={boxes}
                  onChange={(e) => setBoxes(e.target.value)}
                  placeholder="e.g. 9"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_cubes">Ice Cubes *</Label>
                <Input
                  id="ice_cubes"
                  type="number"
                  min="0"
                  step="0.25"
                  value={iceCubes}
                  onChange={(e) => handleIceCubesOrRateChange(e.target.value, unitRate)}
                  placeholder="e.g. 11.25"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Extra (Cubes − Boxes)</Label>
                <div className="h-10 px-3 rounded-md border bg-muted/40 flex items-center font-mono font-bold text-sm">
                  {Number.isInteger(liveExtraPreview) ? liveExtraPreview : liveExtraPreview.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ice_bill_no">Bill No</Label>
                <Input
                  id="ice_bill_no"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. 5374"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_rate">Rate / Cube (Rs.)</Label>
                <Input
                  id="ice_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitRate}
                  onChange={(e) => handleIceCubesOrRateChange(iceCubes, e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_bill_amt">Bill Amount (Rs.) *</Label>
                <Input
                  id="ice_bill_amt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={billAmount}
                  onChange={(e) => {
                    setManualBillAmount(true);
                    setBillAmount(e.target.value);
                  }}
                  placeholder="6412.50"
                  className="font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="ice_pay_ref">Payment Ref No</Label>
                <Input
                  id="ice_pay_ref"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. 575638"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_paid_amt">Paid Amount (Rs.)</Label>
                <Input
                  id="ice_paid_amt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_paid_date">Paid Date</Label>
                <Input
                  id="ice_paid_date"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location / Center (Optional)</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Centers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / Unassigned</SelectItem>
                    {locations?.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ice_notes">Notes (Optional)</Label>
                <Textarea
                  id="ice_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={1}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createIce.isPending || updateIce.isPending}
                className="gradient-water"
              >
                {(createIce.isPending || updateIce.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingEntry ? 'Update Ice Entry' : 'Save Ice Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Payment Dialog */}
      <Dialog open={!!paymentEntry} onOpenChange={(o) => !o && setPaymentEntry(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Ice Payment</DialogTitle>
            <DialogDescription>
              Bill #{paymentEntry?.bill_no || '—'} ({formatDisplayDate(paymentEntry?.entry_date)})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveQuickPayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qp_ref">Payment Ref / Voucher No</Label>
              <Input
                id="qp_ref"
                value={quickPayRef}
                onChange={(e) => setQuickPayRef(e.target.value)}
                placeholder="e.g. 575638"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qp_amt">Paid Amount (Rs.) *</Label>
                <Input
                  id="qp_amt"
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(e.target.value)}
                  className="font-mono font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qp_date">Paid Date *</Label>
                <Input
                  id="qp_date"
                  type="date"
                  value={quickPayDate}
                  onChange={(e) => setQuickPayDate(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPaymentEntry(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateIce.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {updateIce.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
