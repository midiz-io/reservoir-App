import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, CheckCircle2, Inbox, Search, Package, Hash, ThermometerSnowflake, Save, Edit3, Users, CheckSquare, Square, X, Plus, XCircle, RefreshCw, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useAssociationBills, useReviewAssociationBill, useBatchUpdateBoxAndTagNumbers, useUpdateAssociationBill } from '@/hooks/useAssociationBills';
import { cn } from '@/lib/utils';
import { BillViewDialog } from '@/components/bills/BillViewDialog';
import { TagNumberInput } from '@/components/bills/TagNumberInput';
import { useGoogleSheetSyncConfig, useSyncCollectionBillsToSheet } from '@/hooks/useGoogleSheetSync';
import { GoogleSheetSyncDialog } from '@/components/reports/GoogleSheetSyncDialog';

type BillStatus = 'pending' | 'approved' | 'rejected';

function statusBadge(status: string | null | undefined) {
  const s = (status || 'pending') as BillStatus;
  if (s === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">Approved</Badge>;
  if (s === 'rejected') return <Badge variant="destructive" className="px-3 py-1 text-xs font-bold uppercase tracking-wider">Rejected</Badge>;
  return <Badge variant="secondary" className="px-3 py-1 text-xs font-bold uppercase tracking-wider">Pending</Badge>;
}

const officerCategories = [
  { center: 'Polonnaruwa', officers: ['Amal', 'Dinesh'] },
  { center: 'Vavuniya', officers: ['Nimantha', 'Malinda', 'Danushka'] },
  { center: 'Downsouth', officers: ['Isuru', 'Chandu'] },
  { center: 'Galgamuwa', officers: ['Janaka'] },
  { center: 'Anuradhapura', officers: ['Neelaka'] },
];

export default function AssociationBillsAdminPage() {
  const { user, userRole } = useAuth();
  const { data: bills, isLoading, error } = useAssociationBills();
  const review = useReviewAssociationBill();
  const updateBill = useUpdateAssociationBill();
  const batchUpdateBoxTag = useBatchUpdateBoxAndTagNumbers();
  const { data: sheetConfig } = useGoogleSheetSyncConfig();
  const syncToSheet = useSyncCollectionBillsToSheet();
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<BillStatus>('pending');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);
  
  // Multi-select for Approved / Dispatched Bills & Box Tag management
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [isBatchBoxModalOpen, setIsBatchBoxModalOpen] = useState(false);
  const [batchBoxNumber, setBatchBoxNumber] = useState('');
  const [batchSealingTagNumber, setBatchSealingTagNumber] = useState('');
  const [autoApproveOnBatch, setAutoApproveOnBatch] = useState(true);

  // Single-Bill Box & Tag Editing State
  const [isSingleBoxModalOpen, setIsSingleBoxModalOpen] = useState(false);
  const [singleEditingBill, setSingleEditingBill] = useState<any>(null);
  const [singleBoxNumber, setSingleBoxNumber] = useState('');
  const [singleSealingTagNumber, setSingleSealingTagNumber] = useState('');

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewBill, setViewBill] = useState<any>(null);

  // Approval Workflow State
  const [isApproveMode, setIsApproveMode] = useState(false);
  const [boxTags, setBoxTags] = useState<{boxNumber: string, sealingTagNumber: string}[]>([{boxNumber: '', sealingTagNumber: ''}]);
  const [iceQty, setIceQty] = useState('');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [editableItems, setEditableItems] = useState<any[]>([]);

  const handleOpenReviewModal = (bill: any) => {
    setSelected(bill);
    setIsApproveMode(false);
    const parsedItems = Array.isArray(bill.items) ? bill.items : [];
    setEditableItems(
      parsedItems.map((it: any) => ({
        ...it,
        pieces: it.pieces !== undefined && it.pieces !== null ? String(it.pieces) : '',
      }))
    );
  };

  const handleItemPiecesChange = (idx: number, val: string) => {
    setEditableItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, pieces: val } : it))
    );
  };

  const handleSavePieces = async () => {
    if (!selected) return;
    try {
      const updatedItems = editableItems.map((it) => ({
        description: it.description,
        qty: Number(it.qty) || 0,
        unit_price: Number(it.unit_price) || 0,
        line_total: Number(it.line_total || (Number(it.qty) || 0) * (Number(it.unit_price) || 0)) || 0,
        pieces: Number(it.pieces) || 0,
      }));
      await updateBill.mutateAsync({
        id: selected.id,
        items: updatedItems as any,
      });
      setSelected({ ...selected, items: updatedItems });
      toast.success(`Pieces updated for Invoice #${selected.bill_no}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save pieces');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (bills || [])
      .filter((b: any) => (b.status || 'pending') === statusFilter)
      .filter((b: any) => {
        if (startDate && b.bill_date < startDate) return false;
        if (endDate && b.bill_date > endDate) return false;
        return true;
      })
      .filter((b: any) => {
        if (selectedOfficer) {
          const empName = b.employees?.full_name || '';
          if (!empName.toLowerCase().includes(selectedOfficer.toLowerCase())) return false;
        } else if (selectedCenter) {
          const centerObj = officerCategories.find(c => c.center === selectedCenter);
          if (centerObj) {
            const empName = b.employees?.full_name || '';
            const match = centerObj.officers.some(o => empName.toLowerCase().includes(o.toLowerCase()));
            if (!match) return false;
          }
        }
        return true;
      })
      .filter((b: any) => {
        if (!q) return true;
        return (
          b.bill_no?.toLowerCase().includes(q) ||
          b.supplier_name?.toLowerCase().includes(q) ||
          b.reservoirs?.name?.toLowerCase().includes(q)
        );
      });
  }, [bills, statusFilter, search, startDate, endDate, selectedOfficer, selectedCenter]);

  // Selection Helper Calculations
  const isAllSelected = useMemo(() => {
    return filtered.length > 0 && filtered.every(b => selectedBillIds.includes(b.id));
  }, [filtered, selectedBillIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBillIds([]);
    } else {
      setSelectedBillIds(filtered.map(b => b.id));
    }
  };

  const toggleSelectBill = (id: string) => {
    setSelectedBillIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedBillsSummary = useMemo(() => {
    const selectedList = (bills || []).filter(b => selectedBillIds.includes(b.id));
    let totalKg = 0;
    let totalAmount = 0;

    selectedList.forEach(b => {
      const items = Array.isArray(b.items) ? b.items : [];
      items.forEach((it: any) => {
        const qty = Number(it.qty) || 0;
        const amt = Number(it.line_total || (qty * Number(it.unit_price || 0))) || 0;
        totalKg += qty;
        totalAmount += amt;
      });
    });

    return { totalKg, totalAmount, count: selectedList.length };
  }, [bills, selectedBillIds]);

  const handleBatchUpdateBoxTag = async () => {
    if (selectedBillIds.length === 0) return;
    try {
      await batchUpdateBoxTag.mutateAsync({
        billIds: selectedBillIds,
        box_number: batchBoxNumber,
        sealing_tag_number: batchSealingTagNumber,
        updateBoxTag: true,
        approveStatus: autoApproveOnBatch,
        reviewed_by: user?.id || null,
      });
      toast.success(`Updated Box & Tag Numbers and ${autoApproveOnBatch ? 'Approved' : 'saved'} ${selectedBillIds.length} selected bills.`);
      setIsBatchBoxModalOpen(false);
      setBatchBoxNumber('');
      setBatchSealingTagNumber('');
      setSelectedBillIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update box and tag numbers');
    }
  };

  const handleBatchApproveSelected = async () => {
    if (selectedBillIds.length === 0) return;
    try {
      await batchUpdateBoxTag.mutateAsync({
        billIds: selectedBillIds,
        approveStatus: true,
        reviewed_by: user?.id || null,
      });
      toast.success(`Approved ${selectedBillIds.length} selected bills and sent to Harvest Sheet.`);
      setSelectedBillIds([]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve selected bills');
    }
  };

  const handleOpenSingleBoxEdit = (bill: any) => {
    setSingleEditingBill(bill);
    setSingleBoxNumber(bill.box_number || '');
    setSingleSealingTagNumber(bill.sealing_tag_number || '');
    setIsSingleBoxModalOpen(true);
  };

  const handleSaveSingleBoxEdit = async () => {
    if (!singleEditingBill) return;
    try {
      await updateBill.mutateAsync({
        id: singleEditingBill.id,
        box_number: singleBoxNumber ? singleBoxNumber.trim() : null,
        sealing_tag_number: singleSealingTagNumber ? singleSealingTagNumber.trim() : null,
      });
      toast.success(`Updated Box & Tag Numbers for Invoice #${singleEditingBill.bill_no}`);
      setIsSingleBoxModalOpen(false);
      setSingleEditingBill(null);
      if (selected && selected.id === singleEditingBill.id) {
        setSelected({
          ...selected,
          box_number: singleBoxNumber ? singleBoxNumber.trim() : null,
          sealing_tag_number: singleSealingTagNumber ? singleSealingTagNumber.trim() : null,
        });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update Box & Tag numbers');
    }
  };

  const handleApprove = async () => {
    if (!user || !selected) return;
    try {
      const finalBoxNumber = boxTags.map(bt => bt.boxNumber.trim()).filter(Boolean).join(', ');
      const finalSealingTagNumber = boxTags.map(bt => bt.sealingTagNumber.trim()).filter(Boolean).join(', ');

      // Persist any pieces entered by the Center Manager during review/approval
      const updatedItems = editableItems.map((it) => ({
        description: it.description,
        qty: Number(it.qty) || 0,
        unit_price: Number(it.unit_price) || 0,
        line_total: Number(it.line_total || (Number(it.qty) || 0) * (Number(it.unit_price) || 0)) || 0,
        pieces: Number(it.pieces) || 0,
      }));
      await updateBill.mutateAsync({
        id: selected.id,
        items: updatedItems as any,
      });

      await review.mutateAsync({
        id: selected.id,
        status: 'approved',
        rejection_reason: null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        box_number: finalBoxNumber,
        sealing_tag_number: finalSealingTagNumber,
        remarks: iceQty ? `Ice Qty: ${iceQty}\n${approvalRemarks}` : approvalRemarks,
      });
      toast.success('Bill approved and saved successfully.');
      setIsApproveMode(false);
      setSelected(null);
      resetApprovalFields();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!user || !selected) return;
    try {
      await review.mutateAsync({
        id: selected.id,
        status: 'rejected',
        rejection_reason: 'Rejected by Admin',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        box_number: null,
        sealing_tag_number: null,
      });
      toast.success('Bill rejected successfully.');
      setIsApproveMode(false);
      setSelected(null);
      resetApprovalFields();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to reject bill');
    }
  };

  const handleResetToPending = async (bill: any) => {
    try {
      await review.mutateAsync({
        id: bill.id,
        status: 'pending',
        box_number: null,
        sealing_tag_number: null,
      });
      toast.success(`Invoice #${bill.bill_no} is now Pending.`);
    } catch (e: any) {
      toast.error('Failed to reset status');
    }
  };

  const resetApprovalFields = () => {
    setBoxTags([{boxNumber: '', sealingTagNumber: ''}]);
    setIceQty('');
    setApprovalRemarks('');
  };

  const handleAddBoxTag = () => {
    setBoxTags([...boxTags, { boxNumber: '', sealingTagNumber: '' }]);
  };

  const handleRemoveBoxTag = (index: number) => {
    if (boxTags.length > 1) {
      setBoxTags(boxTags.filter((_, i) => i !== index));
    }
  };

  const updateBoxTag = (index: number, field: 'boxNumber' | 'sealingTagNumber', value: string) => {
    const newTags = [...boxTags];
    newTags[index][field] = value;
    setBoxTags(newTags);
  };

  const calculateTotalKg = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  };

  const calculateTotalPieces = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
  };

  const calculateTotalUnitPrice = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.unit_price) || 0), 0);
  };

  const calculateTotalAmount = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.line_total || (item.qty * item.unit_price)) || 0), 0);
  };

  const approvedBillsForSync = useMemo(
    () => (bills || []).filter((b: any) => b.status === 'approved'),
    [bills]
  );

  const handleSyncGoogleSheet = async () => {
    if (!sheetConfig?.apps_script_url?.trim()) {
      setIsSyncDialogOpen(true);
      return;
    }
    try {
      const res = await syncToSheet.mutateAsync({
        bills: approvedBillsForSync,
        config: sheetConfig,
        sheetTitle: 'Collection Bills',
      });
      toast.success(`Synced ${res.rowCount} collection bills to Google Sheet!`);
      if (res.sheetUrl) {
        window.open(res.sheetUrl, '_blank', 'noopener,noreferrer');
      } else {
        setIsSyncDialogOpen(true);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync to Google Sheet');
    }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto space-y-6">
      {/* Header section based on Sketch 1 */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight underline decoration-primary/20 underline-offset-8 decoration-4">
            Field Officer Bill Approval
          </h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSyncGoogleSheet}
              disabled={syncToSheet.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              {syncToSheet.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSyncDialogOpen(true)}
              title="Configure Google Sheet Sync"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-4 p-4 bg-muted/30 rounded-xl border-l-4 border-primary italic text-sm text-muted-foreground flex items-center gap-3">
          <Inbox className="h-5 w-5 text-primary shrink-0" />
          <p>
            Fisheries Association එකෙන් ඇතුලත් කරන ලද දත්ත වල සාරාංශයක් මෙතැනින් නැරඹිය හැකිය.
            (Summary of submissions from Fisheries Association can be viewed and approved here.)
          </p>
        </div>

        {/* Center Wise Field Officer Categorization */}
        <div className="mt-6 p-5 bg-card/60 backdrop-blur-md border border-border/50 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-foreground">Filter by Center or Officer</h3>
            </div>
            {(selectedCenter || selectedOfficer) && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedCenter(null); setSelectedOfficer(null); }} className="h-8 text-xs">
                Clear Filter
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {officerCategories.map((cat, idx) => {
              const isCenterSelected = selectedCenter === cat.center && !selectedOfficer;
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (selectedCenter === cat.center && !selectedOfficer) {
                      setSelectedCenter(null);
                    } else {
                      setSelectedCenter(cat.center);
                      setSelectedOfficer(null);
                    }
                  }}
                  className={cn(
                    "flex-1 min-w-[160px] border rounded-lg p-3 transition-all duration-300 cursor-pointer",
                    isCenterSelected ? "bg-primary/10 border-primary shadow-md" : "bg-background/50 border-border/40 hover:border-primary/30 hover:shadow-sm"
                  )}
                >
                  <span className={cn("text-xs font-black uppercase mb-2 block tracking-wider transition-colors", isCenterSelected ? "text-primary" : "text-primary/80")}>{cat.center}</span>
                  <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {cat.officers.map((officer, oIdx) => {
                      const isOfficerSelected = selectedOfficer === officer;
                      return (
                        <Badge 
                          key={oIdx} 
                          variant={isOfficerSelected ? "default" : "secondary"}
                          onClick={() => {
                            if (isOfficerSelected) {
                              setSelectedOfficer(null);
                              setSelectedCenter(cat.center);
                            } else {
                              setSelectedOfficer(officer);
                              setSelectedCenter(cat.center);
                            }
                          }}
                          className={cn(
                            "text-[10px] py-0 px-2 font-semibold cursor-pointer transition-colors",
                            isOfficerSelected 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                              : "bg-muted/80 text-muted-foreground hover:bg-primary/20 hover:text-primary"
                          )}
                        >
                          {officer}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Select Action Banner when bills are selected */}
      {selectedBillIds.length > 0 && (
        <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-emerald-500/10 border-2 border-primary/30 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-wrap items-center gap-4">
            <Badge className="bg-primary text-white font-bold px-3.5 py-1 text-sm rounded-lg shadow-sm">
              {selectedBillIds.length} Bills Selected
            </Badge>
            <div className="text-sm font-medium text-foreground flex items-center gap-3">
              <span>Selected Qty: <strong className="text-primary text-base">{selectedBillsSummary.totalKg.toFixed(1)} kg</strong></span>
              <span className="text-muted-foreground">|</span>
              <span>Total Value: <strong className="text-emerald-600 text-base">Rs. {selectedBillsSummary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedBillIds([])}
              className="bg-background text-xs font-semibold"
            >
              Deselect All
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsBatchBoxModalOpen(true)}
              className="gradient-water text-xs font-bold shadow-md"
            >
              <Package className="h-4 w-4 mr-1.5" />
              Add Box & Tag Numbers
            </Button>
            <Button 
              size="sm" 
              onClick={handleBatchApproveSelected}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Approve Selected ({selectedBillIds.length})
            </Button>
          </div>
        </div>
      )}

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as BillStatus); setSelectedBillIds([]); }} className="w-full sm:w-auto">
                <TabsList className="bg-background/50 p-1">
                  <TabsTrigger value="pending" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Pending</TabsTrigger>
                  <TabsTrigger value="approved" className="px-6 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">Approved</TabsTrigger>
                  <TabsTrigger value="rejected" className="px-6 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>

              {filtered.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="text-xs font-bold border-dashed"
                >
                  {isAllSelected ? <CheckSquare className="h-4 w-4 mr-1.5 text-primary" /> : <Square className="h-4 w-4 mr-1.5" />}
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Bill No, Supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-background/50 border-none focus-visible:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-background/50 border-none w-full sm:w-36 text-xs text-muted-foreground h-10 px-3 rounded-md"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-background/50 border-none w-full sm:w-36 text-xs text-muted-foreground h-10 px-3 rounded-md"
                />
                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-xs h-10 px-3"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Fetching bills...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No results found for "{statusFilter}" status</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-12 text-center py-5">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all bills"
                      />
                    </TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Bill No.</TableHead>
                    <TableHead className="font-bold">Date</TableHead>
                    <TableHead className="font-bold">Supplier</TableHead>
                    <TableHead className="font-bold">Reservoir</TableHead>
                    <TableHead className="font-bold text-right">Total kg</TableHead>
                    <TableHead className="font-bold text-right">Pieces</TableHead>
                    <TableHead className="font-bold text-right text-primary">Purchasing Value (Rs.)</TableHead>
                    <TableHead className="w-28 text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b: any) => {
                    const isChecked = selectedBillIds.includes(b.id);
                    const billTotalAmount = Number(b.total) || calculateTotalAmount(b.items || []);
                    return (
                      <TableRow 
                        key={b.id} 
                        className={cn(
                          "transition-colors group cursor-pointer",
                          isChecked ? "bg-primary/10" : "hover:bg-primary/5"
                        )}
                        onClick={() => toggleSelectBill(b.id)}
                      >
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelectBill(b.id)}
                            aria-label={`Select bill ${b.bill_no}`}
                          />
                        </TableCell>
                        <TableCell className="py-4">{statusBadge(b.status)}</TableCell>
                        <TableCell className="font-mono font-bold text-primary">{b.bill_no}</TableCell>
                        <TableCell className="whitespace-nowrap">{b.bill_date}</TableCell>
                        <TableCell className="font-medium">{b.supplier_name}</TableCell>
                        <TableCell>{b.reservoirs?.name || '—'}</TableCell>
                        <TableCell className="text-right font-display font-bold text-lg">
                          {calculateTotalKg(b.items).toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {calculateTotalPieces(b.items) > 0 ? `${calculateTotalPieces(b.items).toLocaleString()} pcs` : '—'}
                        </TableCell>
                        <TableCell className="text-right font-display font-bold text-lg text-emerald-600">
                          Rs. {billTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {b.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Review & Approve"
                                onClick={() => handleOpenReviewModal(b)}
                                className="hover:bg-emerald-500/20 hover:text-emerald-600 transition-all rounded-full h-8 w-8 text-emerald-500"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                            {b.status !== 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit Pieces / Review Details"
                                onClick={() => handleOpenReviewModal(b)}
                                className="hover:bg-blue-500/20 hover:text-blue-600 transition-all rounded-full h-8 w-8 text-blue-500"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            {b.status !== 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Reset to Pending"
                                onClick={() => handleResetToPending(b)}
                                className="hover:bg-amber-500/20 hover:text-amber-600 transition-all rounded-full h-8 w-8 text-amber-500"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Edit Box & Tag Numbers"
                              onClick={() => handleOpenSingleBoxEdit(b)}
                              className="hover:bg-primary/20 hover:text-primary transition-all rounded-full h-8 w-8"
                            >
                              <Package className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="View Summary"
                              onClick={() => { setViewBill(b); setIsViewModalOpen(true); }}
                              className="hover:bg-primary hover:text-white transition-all rounded-full h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Batch Box & Tag Number Modal */}
      <Dialog open={isBatchBoxModalOpen} onOpenChange={setIsBatchBoxModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Add Box & Sealing Tag Numbers
            </DialogTitle>
            <DialogDescription>
              Assign box numbers and sealing tag numbers to the <strong>{selectedBillIds.length} selected bills</strong> for harvest report dispatch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="batch_box_number" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Package className="h-3.5 w-3.5 text-primary" /> Box Number
              </Label>
              <Input
                id="batch_box_number"
                value={batchBoxNumber}
                onChange={(e) => setBatchBoxNumber(e.target.value)}
                placeholder="Ex: BOX-001"
                className="h-11 font-bold text-lg bg-muted/10 border-2 focus-visible:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_tag_number" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Hash className="h-3.5 w-3.5 text-primary" /> Sealing Tag Number
              </Label>
              <TagNumberInput
                id="batch_tag_number"
                value={batchSealingTagNumber}
                onChange={setBatchSealingTagNumber}
                allowMultiple
                placeholder="Ex: TAG-101"
                className="h-11 font-bold text-lg bg-muted/10 border-2 focus-visible:border-primary"
              />
            </div>

            <div className="flex items-center space-x-2 pt-2 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <Checkbox 
                id="auto_approve_batch" 
                checked={autoApproveOnBatch} 
                onCheckedChange={(checked) => setAutoApproveOnBatch(!!checked)} 
              />
              <Label htmlFor="auto_approve_batch" className="text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer leading-tight">
                Approve selected bills & send to Harvest Sheet (Harvest Report 1)
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsBatchBoxModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBatchUpdateBoxTag} 
              disabled={batchUpdateBoxTag.isPending || (!batchBoxNumber && !batchSealingTagNumber)}
              className="gradient-water font-bold px-6"
            >
              {batchUpdateBoxTag.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save to Selected Bills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Bill Box & Tag Number Modal */}
      <Dialog open={isSingleBoxModalOpen} onOpenChange={setIsSingleBoxModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Edit Box & Sealing Tag Numbers
            </DialogTitle>
            <DialogDescription>
              Update Box Number and Sealing Tag Number for <strong>Invoice #{singleEditingBill?.bill_no}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="single_box_number" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Package className="h-3.5 w-3.5 text-primary" /> Box Number
              </Label>
              <Input
                id="single_box_number"
                value={singleBoxNumber}
                onChange={(e) => setSingleBoxNumber(e.target.value)}
                placeholder="Ex: BOX-001"
                className="h-11 font-bold text-lg bg-muted/10 border-2 focus-visible:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="single_tag_number" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Hash className="h-3.5 w-3.5 text-primary" /> Sealing Tag Number
              </Label>
              <TagNumberInput
                id="single_tag_number"
                value={singleSealingTagNumber}
                onChange={setSingleSealingTagNumber}
                reservoirId={singleEditingBill?.reservoir_id}
                excludeBillId={singleEditingBill?.id}
                allowMultiple
                placeholder="Ex: TAG-101"
                className="h-11 font-bold text-lg bg-muted/10 border-2 focus-visible:border-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsSingleBoxModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSingleBoxEdit} 
              disabled={updateBill.isPending}
              className="gradient-water font-bold px-6"
            >
              {updateBill.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog based on Sketch 1 Part 2 */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setIsApproveMode(false); } }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl overflow-x-hidden">
          {selected && (
            <div className="flex flex-col min-h-full bg-background">
              {/* Preview Header */}
              <div className="bg-primary p-6 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-display font-bold">Bill Details Summary</h2>
                  {statusBadge(selected.status)}
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Visual Summary Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-muted/30 p-6 rounded-2xl border-2 border-dashed border-muted-foreground/20">
                    <h3 className="text-xs font-black uppercase text-muted-foreground mb-4 tracking-widest">Supplier Details</h3>
                    <div className="space-y-1">
                      <p className="text-xl font-bold">{selected.supplier_name}</p>
                      <p className="text-sm text-muted-foreground italic">Fisheries Association detail</p>
                      {selected.supplier_address && <p className="text-sm text-muted-foreground mt-2">{selected.supplier_address}</p>}
                      {selected.supplier_tel && <p className="text-sm font-mono mt-1">{selected.supplier_tel}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Bill Date</span>
                      <span className="font-bold">{selected.bill_date}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Reservoir</span>
                      <span className="font-bold text-primary">{selected.reservoirs?.name || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/10 rounded-xl">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Inv No</span>
                      <span className="font-mono font-bold text-lg">{selected.bill_no}</span>
                    </div>
                  </div>
                </div>

                {/* Box & Sealing Tag Info Bar inside Modal */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Box Number</span>
                      <span className="text-base font-bold text-foreground">{selected.box_number || 'Not Assigned'}</span>
                    </div>
                    <div className="border-l pl-6 border-border/40">
                      <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block">Sealing Tag Number</span>
                      <span className="text-base font-mono font-bold text-primary">{selected.sealing_tag_number || 'Not Assigned'}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenSingleBoxEdit(selected)}
                    className="border-primary/40 text-primary hover:bg-primary hover:text-white text-xs font-bold"
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Edit Box & Tag
                  </Button>
                </div>

                {/* Items Table with Center Manager Pieces Entry */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                        Collection Items & Pieces (pcs)
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Add or update the pieces count for each item (e.g., 1 kg → 5 pcs).
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleSavePieces}
                      disabled={updateBill.isPending}
                      className="border-primary/40 text-primary hover:bg-primary hover:text-white font-bold"
                    >
                      {updateBill.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Save Pieces
                    </Button>
                  </div>
                  <div className="rounded-2xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Item Description</TableHead>
                          <TableHead className="w-24 text-center font-bold">Qty (kg)</TableHead>
                          <TableHead className="w-36 text-center font-bold">Pieces (pcs)</TableHead>
                          <TableHead className="w-28 text-right font-bold">Unit Price</TableHead>
                          <TableHead className="w-32 text-right font-bold">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editableItems.map((it: any, idx: number) => {
                          const qty = Number(it.qty) || 0;
                          const pcs = Number(it.pieces) || 0;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{it.description}</TableCell>
                              <TableCell className="text-center font-mono">{it.qty}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    inputMode="numeric"
                                    value={it.pieces}
                                    onChange={(e) => handleItemPiecesChange(idx, e.target.value)}
                                    placeholder="0 pcs"
                                    className="h-9 w-24 text-center font-bold"
                                  />
                                  {qty > 0 && pcs > 0 && (
                                    <span className="text-[10px] font-semibold text-emerald-600">
                                      {(pcs / qty).toFixed(1)} pcs/kg
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">Rs. {Number(it.unit_price).toLocaleString()}</TableCell>
                              <TableCell className="text-right font-bold">Rs. {Number(it.line_total || (it.qty * it.unit_price)).toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                      <TableFooter className="bg-muted/30 font-bold border-t-2">
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="font-bold uppercase tracking-wider text-muted-foreground">TOTAL</TableCell>
                          <TableCell className="text-center font-black text-primary text-base">
                            {calculateTotalKg(editableItems).toFixed(1)} kg
                          </TableCell>
                          <TableCell className="text-center font-black text-emerald-600 text-base">
                            {calculateTotalPieces(editableItems).toLocaleString()} pcs
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground font-bold">
                            Rs. {calculateTotalUnitPrice(editableItems).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-black text-primary text-base">
                            Rs. {calculateTotalAmount(editableItems).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                </div>

                {/* Approve/Reject Buttons in Preview - triggers the form */}
                {!isApproveMode && selected.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      variant="destructive"
                      className="w-full sm:w-1/3 h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
                      onClick={handleReject}
                    >
                      <XCircle className="mr-2 h-6 w-6" />
                      Reject Bill
                    </Button>
                    <Button 
                      className="w-full sm:w-2/3 h-14 text-lg font-bold gradient-water shadow-lg hover:shadow-xl transition-all"
                      onClick={() => setIsApproveMode(true)}
                    >
                      <CheckCircle2 className="mr-2 h-6 w-6" />
                      Approve Bill
                    </Button>
                  </div>
                )}

                {/* Approval Form based on Sketch 2 */}
                {isApproveMode && (
                  <div className="pt-8 border-t-4 border-primary animate-in slide-in-from-bottom-5 duration-300">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-bold">Field Office Approval Part</h3>
                    </div>

                    <div className="space-y-6 mb-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <Package className="h-4 w-4" /> Box & Sealing Tag Numbers
                          </Label>
                          <Button variant="outline" size="sm" onClick={handleAddBoxTag} className="h-8 text-xs font-bold border-dashed border-primary/50 text-primary hover:bg-primary/10">
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add More
                          </Button>
                        </div>
                        {boxTags.map((bt, index) => (
                          <div key={index} className="flex flex-col sm:flex-row items-center gap-4 bg-muted/5 p-4 rounded-xl border border-border/50 relative group">
                            <div className="w-full space-y-2">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Box No.</Label>
                              <Input
                                value={bt.boxNumber}
                                onChange={(e) => updateBoxTag(index, 'boxNumber', e.target.value)}
                                placeholder="Ex: BOX-001"
                                className="h-11 font-bold bg-background border-2 focus-visible:border-primary"
                              />
                            </div>
                            <div className="w-full space-y-2">
                              <Label className="text-[10px] uppercase text-muted-foreground font-bold">Sealing Tag No.</Label>
                              <TagNumberInput
                                value={bt.sealingTagNumber}
                                onChange={(val) => updateBoxTag(index, 'sealingTagNumber', val)}
                                reservoirId={selected?.reservoir_id}
                                excludeBillId={selected?.id}
                                placeholder="Enter or select tag no."
                                className="h-11 font-bold bg-background border-2 focus-visible:border-primary"
                              />
                            </div>
                            {boxTags.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveBoxTag(index)}
                                className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-destructive/90"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                        <div className="space-y-2">
                          <Label htmlFor="ice_qty" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                            <ThermometerSnowflake className="h-3 w-3" /> Ice qty
                          </Label>
                          <Input
                            id="ice_qty"
                            value={iceQty}
                            onChange={(e) => setIceQty(e.target.value)}
                            placeholder="e.g. 50kg"
                            className="h-12 text-lg font-bold bg-muted/10 border-2 focus-visible:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-end border-t pt-6">
                      <Button 
                        variant="ghost" 
                        onClick={() => { setIsApproveMode(false); resetApprovalFields(); }}
                        className="w-full sm:w-auto h-12 px-8 text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => toast.info('Clear fields to restart edit')}
                        className="w-full sm:w-auto h-12 px-8 border-2"
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button 
                        onClick={handleApprove}
                        disabled={review.isPending || boxTags.some(bt => !bt.boxNumber || !bt.sealingTagNumber)}
                        className="w-full sm:w-auto h-12 px-10 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white"
                      >
                        {review.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        Save.
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Prevent footer being empty */}
              <div className="p-4 bg-muted/10 border-t flex justify-end">
                 <Button variant="ghost" onClick={() => { setSelected(null); setIsApproveMode(false); }}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <BillViewDialog 
        open={isViewModalOpen}
        onOpenChange={setIsViewModalOpen}
        bill={viewBill}
      />

      <GoogleSheetSyncDialog
        open={isSyncDialogOpen}
        onOpenChange={setIsSyncDialogOpen}
        bills={approvedBillsForSync}
        sheetTitle="Collection Bills"
      />
    </div>
  );
}


