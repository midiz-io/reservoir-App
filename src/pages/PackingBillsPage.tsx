import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Eye, Inbox, Search, Package, Hash, Save, ShieldAlert, Calendar, BarChart3, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAssociationBills, useUpdateAssociationBill } from '@/hooks/useAssociationBills';
import { useNavigate } from 'react-router-dom';

export default function PackingBillsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: bills, isLoading, error, refetch } = useAssociationBills();
  const updateBill = useUpdateAssociationBill();

  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedBill, setSelectedBill] = useState<any>(null);

  // Packing Form State
  const [boxNumber, setBoxNumber] = useState('');
  const [sealingTagNumber, setSealingTagNumber] = useState('');
  const [originalItems, setOriginalItems] = useState<any[]>([]);

  // New specific checklist state
  const [drainLid, setDrainLid] = useState(false);
  const [prawnsAmount, setPrawnsAmount] = useState('FULL');
  const [temp, setTemp] = useState('');
  const [iceLevel, setIceLevel] = useState('GOOD');

  // Grading state
  const [gradeA, setGradeA] = useState<Record<string, string>>({
    '0-50': '', '50-100': '', '100-150': '', '150-200': '', '200-250': '',
    '250-330': '', '330-400': '', '400-500': '', '500-600': ''
  });
  
  const [gradeB, setGradeB] = useState<Record<string, string>>({
    'LSB': '', 'SSA': '', 'LSC': '', 'SSH': '', 'LA LSA': ''
  });
  
  const [gciIssc, setGciIssc] = useState<Record<string, string>>({
    '100 up': '', '100 below': ''
  });
  
  const [clawWeight, setClawWeight] = useState('');

  const [activeTab, setActiveTab] = useState('all');

  // Filter bills
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (bills || [])
      .filter((b: any) => b.status === 'approved')
      .filter((b: any) => {
        // Date filtering
        if (startDate && b.bill_date < startDate) return false;
        if (endDate && b.bill_date > endDate) return false;

        // Search query
        if (!q) return true;
        return (
          b.bill_no?.toLowerCase().includes(q) ||
          b.supplier_name?.toLowerCase().includes(q) ||
          b.reservoirs?.name?.toLowerCase().includes(q)
        );
      });
  }, [bills, search, startDate, endDate]);

  const displayedBills = useMemo(() => {
    if (activeTab === 'weight_diff') {
      return filtered.filter(b => b.remarks === 'WEIGHT_DIFFERENCE');
    }
    return filtered;
  }, [filtered, activeTab]);

  // Original total weight of the selected bill
  const originalTotalWeight = useMemo(() => {
    if (!originalItems.length) return 0;
    return originalItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [originalItems]);

  // Current total weight entered by packing staff
  const currentTotalWeight = useMemo(() => {
    let sum = 0;
    Object.values(gradeA).forEach(v => sum += (Number(v) || 0));
    Object.values(gradeB).forEach(v => sum += (Number(v) || 0));
    Object.values(gciIssc).forEach(v => sum += (Number(v) || 0));
    sum += (Number(clawWeight) || 0);
    return sum;
  }, [gradeA, gradeB, gciIssc, clawWeight]);

  // Weight difference
  const weightDifference = useMemo(() => {
    return Math.abs(currentTotalWeight - originalTotalWeight);
  }, [currentTotalWeight, originalTotalWeight]);

  const isWeightDifferenceExceeded = weightDifference > 1.0;

  const handleSelectBill = (bill: any) => {
    setSelectedBill(bill);
    setBoxNumber(bill.box_number || '');
    setSealingTagNumber(bill.sealing_tag_number || '');
    setOriginalItems(bill.items || []);

    // Reset grading states
    setDrainLid(false);
    setPrawnsAmount('FULL');
    setTemp('');
    setIceLevel('GOOD');
    setGradeA({
      '0-50': '', '50-100': '', '100-150': '', '150-200': '', '200-250': '',
      '250-330': '', '330-400': '', '400-500': '', '500-600': ''
    });
    setGradeB({
      'LSB': '', 'SSA': '', 'LSC': '', 'SSH': '', 'LA LSA': ''
    });
    setGciIssc({
      '100 up': '', '100 below': ''
    });
    setClawWeight('');
  };

  const handleSave = async () => {
    if (!user || !selectedBill) return;

    if (!boxNumber.trim()) {
      toast.error('Box number is required.');
      return;
    }

    if (!sealingTagNumber.trim()) {
      toast.error('Sealing tag number is required.');
      return;
    }

    try {
      const gradingItems: any[] = [];
      gradingItems.push({ description: 'Drain Lid', qty: drainLid ? 1 : 0, unit_price: 0, line_total: 0 });
      gradingItems.push({ description: `Prawns Amount: ${prawnsAmount}`, qty: 1, unit_price: 0, line_total: 0 });
      if (temp) gradingItems.push({ description: 'Temperature', qty: Number(temp) || 0, unit_price: 0, line_total: 0 });
      if (iceLevel) gradingItems.push({ description: `Ice Level: ${iceLevel}`, qty: 1, unit_price: 0, line_total: 0 });
      
      Object.entries(gradeA).forEach(([k, v]) => {
        if (Number(v) > 0) gradingItems.push({ description: `Grade A (${k})`, qty: Number(v), unit_price: 0, line_total: 0 });
      });
      Object.entries(gradeB).forEach(([k, v]) => {
        if (Number(v) > 0) gradingItems.push({ description: `Grade B (${k})`, qty: Number(v), unit_price: 0, line_total: 0 });
      });
      Object.entries(gciIssc).forEach(([k, v]) => {
        if (Number(v) > 0) gradingItems.push({ description: `GCI ISSC (${k})`, qty: Number(v), unit_price: 0, line_total: 0 });
      });
      if (Number(clawWeight) > 0) gradingItems.push({ description: 'Claw Weight', qty: Number(clawWeight), unit_price: 0, line_total: 0 });

      await updateBill.mutateAsync({
        id: selectedBill.id,
        box_number: boxNumber.trim(),
        sealing_tag_number: sealingTagNumber.trim(),
        items: gradingItems as any,
        total: selectedBill.total, // keep original total
        remarks: isWeightDifferenceExceeded ? 'WEIGHT_DIFFERENCE' : null,
      });

      toast.success('Packing information saved successfully.');
      setSelectedBill(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save packing data');
    }
  };

  const renderGradeInput = (label: string, state: Record<string, string>, setState: React.Dispatch<React.SetStateAction<Record<string, string>>>) => (
    <div key={label} className="flex items-center justify-between gap-4 p-2 border-b border-border/50 hover:bg-muted/50 transition-colors">
      <span className="text-sm font-bold w-24 shrink-0 text-foreground">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={state[label]}
        onChange={(e) => setState(prev => ({ ...prev, [label]: e.target.value }))}
        placeholder="0.0"
        className="h-9 text-center font-bold border-2 focus-visible:border-primary w-24 bg-background shadow-sm"
      />
    </div>
  );

  return (
    <div className="animate-fade-in max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Banner for Harvest Report */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top-2">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-lg text-emerald-600 dark:text-emerald-400 shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-base md:text-lg">Harvest Report</h3>
            <p className="text-emerald-700/80 dark:text-emerald-400/80 text-sm mt-0.5">Access and view the daily harvest summaries.</p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/reports/harvest')}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md h-11 px-6"
        >
          Open Harvest Report
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Header section with Premium design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
            Packing Center Portal
          </h1>
          <p className="text-muted-foreground mt-1">
            Confirm items grading, weight (quantities), Box number and Sealing tag number.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            Packing Desk
          </Badge>
        </div>
      </div>

      {/* Filter and Date Search Cards */}
      <Card className="border-none shadow-elevated bg-card/65 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Invoice No, Supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background/50 border-2 focus-within:border-primary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-background/50 border-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-background/50 border-2"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full h-10 border-2"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bill List Grid */}
      <Card className="border-none shadow-elevated bg-card/65 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold">Invoices & Packing Tasks</CardTitle>
              <CardDescription>Select any invoice below to enter box details, sealing tags and verify weights.</CardDescription>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full md:w-auto grid-cols-2">
                <TabsTrigger value="all" className="font-bold tracking-wide">All Tasks</TabsTrigger>
                <TabsTrigger value="weight_diff" className="font-bold tracking-wide text-destructive data-[state=active]:text-destructive data-[state=active]:bg-destructive/10">Weight Differences</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Fetching active invoices...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 px-4 text-muted-foreground space-y-3">
              <ShieldAlert className="h-12 w-12 mx-auto text-destructive opacity-80" />
              <p className="text-base font-bold text-foreground">Failed to load active invoices</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">{(error as any)?.message || 'Permission denied or network issue'}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 font-bold border-2">
                Retry Fetching
              </Button>
            </div>
          ) : displayedBills.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-20 text-primary" />
              <p className="text-lg font-medium">No packing tasks found matching criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow>
                    <TableHead className="font-bold py-4">Status</TableHead>
                    <TableHead className="font-bold">Invoice No.</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Supplier</TableHead>
                    <TableHead className="font-bold">Reservoir</TableHead>
                    <TableHead className="font-bold">Box No</TableHead>
                    <TableHead className="font-bold">Sealing Tag</TableHead>
                    <TableHead className="font-bold text-center">Total Weight</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedBills.map((b: any) => {
                    // Use original total weight to calculate. Since this table replaces the items,
                    // calculate original weight properly. We assume the items are grading items if it has 'Grade A'
                    // For safety, only sum items that are likely fishing catches (we'll just use the items as they are if not packed)
                    // Since after packing we overwrite items, the total weight shown might be wrong. We can use the total price / unit price if needed.
                    // But for now, we'll keep the current logic or improve it to ignore packing fields.
                    const totalWeight = (b.items || [])
                      .filter((it: any) => !['Drain Lid', 'Temperature', 'Ice Level'].includes(it.description) && !it.description?.startsWith('Prawns Amount'))
                      .reduce((sum: number, it: any) => sum + (Number(it.qty) || 0), 0);
                    
                    const isPacked = !!b.box_number && !!b.sealing_tag_number;
                    const hasWeightDiff = b.remarks === 'WEIGHT_DIFFERENCE';

                    return (
                      <TableRow key={b.id} className={`hover:bg-primary/5 transition-colors group ${hasWeightDiff ? 'bg-destructive/5 hover:bg-destructive/10' : ''}`}>
                        <TableCell className="py-4">
                          {isPacked ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-wider px-2 py-0.5">Packed</Badge>
                          ) : (
                            <Badge variant="secondary" className="font-bold uppercase tracking-wider px-2 py-0.5">Awaiting Pack</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-primary">{b.bill_no}</TableCell>
                        <TableCell className="whitespace-nowrap">{b.bill_date}</TableCell>
                        <TableCell className="font-medium">{b.supplier_name}</TableCell>
                        <TableCell>{b.reservoirs?.name || '—'}</TableCell>
                        <TableCell className={`font-medium ${hasWeightDiff ? 'text-destructive' : 'text-slate-700 dark:text-slate-300'}`}>{b.box_number || '—'}</TableCell>
                        <TableCell className={`font-mono ${hasWeightDiff ? 'text-destructive/80' : 'text-slate-600 dark:text-slate-400'}`}>{b.sealing_tag_number || '—'}</TableCell>
                        <TableCell className={`text-center font-display font-bold ${hasWeightDiff ? 'text-destructive' : 'text-slate-700 dark:text-slate-300'}`}>
                          {totalWeight.toFixed(1)} kg
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSelectBill(b)}
                            className="hover:bg-primary hover:text-white transition-all rounded-full"
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Entry Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={(o) => { if (!o) setSelectedBill(null); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 border-none shadow-glow rounded-2xl overflow-x-hidden">
          {selectedBill && (
            <div className="flex flex-col bg-background">
              {/* Dialog Header */}
              <div className="bg-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-display font-bold">Packing Center Grading</h2>
                  <Badge variant="secondary" className="bg-white/10 text-white border-white/20 font-bold uppercase tracking-wider">
                    Invoice #{selectedBill.bill_no}
                  </Badge>
                </div>
                <p className="text-primary-foreground/80 text-sm mt-1">
                  Fill sealing information and inspect grading details. Weight difference must not exceed 1kg.
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Meta details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-1">Fisherman / Supplier</span>
                    <p className="text-lg font-bold text-foreground">{selectedBill.supplier_name}</p>
                    {selectedBill.supplier_address && <p className="text-xs text-muted-foreground mt-1">{selectedBill.supplier_address}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/10 p-3 rounded-lg border border-border/30 flex flex-col justify-center">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Invoice Date</span>
                      <span className="font-semibold text-sm mt-0.5">{selectedBill.bill_date}</span>
                    </div>
                    <div className="bg-muted/10 p-3 rounded-lg border border-border/30 flex flex-col justify-center">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Reservoir</span>
                      <span className="font-semibold text-sm text-primary mt-0.5">{selectedBill.reservoirs?.name || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Box & Sealing inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary/5 p-5 rounded-xl border border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="boxNumber" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary">
                      <Package className="h-3.5 w-3.5" /> 1. Box NO *
                    </Label>
                    <Input
                      id="boxNumber"
                      value={boxNumber}
                      onChange={(e) => setBoxNumber(e.target.value)}
                      placeholder="e.g. BOX-007"
                      className="bg-background border-2 h-11 text-base font-bold focus-visible:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sealingTagNumber" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary">
                      <Hash className="h-3.5 w-3.5" /> 2. Tag NO *
                    </Label>
                    <Input
                      id="sealingTagNumber"
                      value={sealingTagNumber}
                      onChange={(e) => setSealingTagNumber(e.target.value)}
                      placeholder="e.g. TAG-998877"
                      className="bg-background border-2 h-11 text-base font-bold focus-visible:border-primary"
                    />
                  </div>
                </div>

                {/* Specific Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-xl shadow-sm bg-muted/10">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
                      3. Drain Lid
                    </Label>
                    <div className="flex flex-col gap-2">
                      <Button 
                        variant={drainLid ? "default" : "outline"} 
                        onClick={() => setDrainLid(true)}
                        className="flex-1 font-bold h-10 border-2 justify-start"
                      >
                        Yes {drainLid && <Check className="h-4 w-4 ml-auto" />}
                      </Button>
                      <Button 
                        variant={!drainLid ? "default" : "outline"} 
                        onClick={() => setDrainLid(false)}
                        className="flex-1 font-bold h-10 border-2 justify-start"
                      >
                        No {!drainLid && <Check className="h-4 w-4 ml-auto" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
                      4. Prawns Amount
                    </Label>
                    <div className="flex flex-col gap-2">
                      {['FULL', 'HALF', '3/4'].map(amt => (
                        <Button 
                          key={amt}
                          variant={prawnsAmount === amt ? "default" : "outline"} 
                          onClick={() => setPrawnsAmount(amt)}
                          className="flex-1 text-xs px-2 font-bold h-10 border-2 justify-start"
                        >
                          {amt} {prawnsAmount === amt && <Check className="h-4 w-4 ml-auto" />}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp" className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
                      5. Temp (°C)
                    </Label>
                    <Input
                      id="temp"
                      type="number"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      placeholder="e.g. 4"
                      className="bg-background border-2 h-10 text-base font-bold focus-visible:border-primary w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-foreground">
                      6. Ice Level
                    </Label>
                    <div className="flex flex-col gap-2">
                      {['LOW', 'GOOD', 'BAD/LOW'].map(lvl => (
                        <Button 
                          key={lvl}
                          variant={iceLevel === lvl ? "default" : "outline"} 
                          onClick={() => setIceLevel(lvl)}
                          className="flex-1 text-xs px-2 font-bold h-10 border-2 justify-start"
                        >
                          {lvl} {iceLevel === lvl && <Check className="h-4 w-4 ml-auto" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grading Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Grade A */}
                  <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                    <div className="bg-primary/10 border-b border-primary/20 p-3 text-center">
                      <h4 className="font-black text-primary text-sm uppercase tracking-wider">Grade A</h4>
                    </div>
                    <div className="p-3">
                      {Object.keys(gradeA).map((key) => renderGradeInput(key, gradeA, setGradeA))}
                    </div>
                  </div>

                  {/* Grade B & Others */}
                  <div className="space-y-6">
                    <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                      <div className="bg-blue-500/10 border-b border-blue-500/20 p-3 text-center">
                        <h4 className="font-black text-blue-600 dark:text-blue-400 text-sm uppercase tracking-wider">Grade B</h4>
                      </div>
                      <div className="p-3">
                        {Object.keys(gradeB).map((key) => renderGradeInput(key, gradeB, setGradeB))}
                      </div>
                    </div>

                    <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                      <div className="bg-amber-500/10 border-b border-amber-500/20 p-3 text-center">
                        <h4 className="font-black text-amber-600 dark:text-amber-400 text-sm uppercase tracking-wider">GCI ISSC</h4>
                      </div>
                      <div className="p-3">
                        {Object.keys(gciIssc).map((key) => renderGradeInput(key, gciIssc, setGciIssc))}
                      </div>
                    </div>
                  </div>

                  {/* Claw Weight & Total */}
                  <div className="space-y-6">
                    <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                      <div className="bg-rose-500/10 border-b border-rose-500/20 p-3 text-center">
                        <h4 className="font-black text-rose-600 dark:text-rose-400 text-sm uppercase tracking-wider">Other</h4>
                      </div>
                      <div className="p-5 flex items-center justify-between">
                        <span className="text-sm font-bold w-24 shrink-0 text-foreground">Claw Weight</span>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          value={clawWeight}
                          onChange={(e) => setClawWeight(e.target.value)}
                          placeholder="0.0"
                          className="h-10 text-center font-bold border-2 focus-visible:border-rose-500 w-24 bg-background shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Weight Check Banner */}
                    <div className="border rounded-xl items-center bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                      <h4 className="text-xs font-black uppercase text-center mb-3 text-muted-foreground tracking-widest">Weight Verification</h4>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex flex-col text-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Original</span>
                          <span className="text-lg font-bold">{originalTotalWeight.toFixed(1)} kg</span>
                        </div>
                        <div className="flex flex-col text-center border-l">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Packed</span>
                          <span className="text-lg font-bold">{currentTotalWeight.toFixed(1)} kg</span>
                        </div>
                      </div>
                      <div className="flex flex-col text-center bg-background border rounded-lg p-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Difference</span>
                        <span className={`text-xl font-black ${isWeightDifferenceExceeded ? 'text-destructive' : 'text-emerald-600'}`}>
                          {weightDifference.toFixed(2)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weight excess validation alert */}
                {isWeightDifferenceExceeded && (
                  <div className="bg-destructive/10 border-2 border-destructive/20 text-destructive text-sm rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
                    <div>
                      <p className="font-bold">Weight Difference Exceeds 1kg Limit!</p>
                      <p className="text-xs mt-0.5 opacity-90">
                        The difference between the Fisheries Association weight ({originalTotalWeight.toFixed(1)} kg) and your entered packing weight ({currentTotalWeight.toFixed(1)} kg) is {weightDifference.toFixed(2)} kg. This will be recorded as a Weight Difference exception.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="p-4 bg-muted/10 border-t flex flex-col sm:flex-row gap-3 items-center justify-end">
                <Button variant="ghost" onClick={() => setSelectedBill(null)} className="w-full sm:w-auto h-11 px-6">
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateBill.isPending || !boxNumber.trim() || !sealingTagNumber.trim()}
                  className={`w-full sm:w-auto h-11 px-10 font-bold text-white shadow-lg disabled:opacity-50 ${isWeightDifferenceExceeded ? 'bg-destructive hover:bg-destructive/90' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                >
                  {updateBill.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Confirm & Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
