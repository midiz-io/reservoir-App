import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Loader2,
  Plus,
  Search,
  Hash,
  CheckCircle2,
  Clock,
  Send,
  Trash2,
  Edit,
  Eye,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useReservoirs } from '@/hooks/useReservoirs';
import { useLocations } from '@/hooks/useLocations';
import { useEmployees } from '@/hooks/useEmployees';
import { useAssociationBills } from '@/hooks/useAssociationBills';
import {
  useTagDispatches,
  useCreateTagDispatch,
  useUpdateTagDispatch,
  useDeleteTagDispatch,
  TagDispatch,
} from '@/hooks/useTagDispatches';
import {
  buildDispatchedTagsList,
  formatTagNumber,
  parseTagRangeStrings,
} from '@/lib/tagUtils';
import { BillViewDialog } from '@/components/bills/BillViewDialog';

export default function TagTrackingPage() {
  const { user, userRole } = useAuth();
  const canManage = userRole === 'super_admin' || userRole === 'employee';

  const { data: dispatches, isLoading: dispatchesLoading } = useTagDispatches();
  const { data: bills, isLoading: billsLoading } = useAssociationBills();
  const { data: reservoirs } = useReservoirs();
  const { data: locations } = useLocations();
  const { data: employees } = useEmployees();

  const createDispatch = useCreateTagDispatch();
  const updateDispatch = useUpdateTagDispatch();
  const deleteDispatch = useDeleteTagDispatch();

  const [activeTab, setActiveTab] = useState<'tags' | 'batches'>('tags');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'arrived' | 'pending'>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');

  // Add / Edit Tag Dispatch Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState<TagDispatch | null>(null);
  const [startTagInput, setStartTagInput] = useState('');
  const [endTagInput, setEndTagInput] = useState('');
  const [sentDate, setSentDate] = useState(new Date().toISOString().split('T')[0]);
  const [reservoirId, setReservoirId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [notes, setNotes] = useState('');

  // Bill View Modal
  const [viewBill, setViewBill] = useState<any>(null);
  const [isViewBillOpen, setIsViewBillOpen] = useState(false);

  const parsedRangePreview = useMemo(() => {
    if (!startTagInput.trim() || !endTagInput.trim()) return null;
    return parseTagRangeStrings(startTagInput, endTagInput);
  }, [startTagInput, endTagInput]);

  const allDispatchedTags = useMemo(
    () => buildDispatchedTagsList(dispatches, bills),
    [dispatches, bills]
  );

  const batchSummaries = useMemo(() => {
    if (!dispatches) return [];
    return dispatches.map((d) => {
      const tagsForBatch = allDispatchedTags.filter((t) => t.dispatchId === d.id);
      const totalCount = d.end_number - d.start_number + 1;
      const arrivedCount = tagsForBatch.filter((t) => t.arrived).length;
      const pendingCount = Math.max(0, totalCount - arrivedCount);
      const startTag = formatTagNumber(d.prefix, d.start_number, d.pad_length);
      const endTag = formatTagNumber(d.prefix, d.end_number, d.pad_length);
      const arrivalPercent = totalCount > 0 ? (arrivedCount / totalCount) * 100 : 0;

      return {
        ...d,
        startTag,
        endTag,
        totalCount,
        arrivedCount,
        pendingCount,
        arrivalPercent,
      };
    });
  }, [dispatches, allDispatchedTags]);

  const filteredTags = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allDispatchedTags.filter((t) => {
      if (batchFilter !== 'all' && t.dispatchId !== batchFilter) return false;
      if (statusFilter === 'arrived' && !t.arrived) return false;
      if (statusFilter === 'pending' && t.arrived) return false;
      if (q) {
        const matchTag = t.tagCode.toLowerCase().includes(q);
        const matchRes = (t.reservoirName || '').toLowerCase().includes(q);
        const matchBill = t.matchedBills.some(
          (b) =>
            b.billNo.toLowerCase().includes(q) ||
            b.supplierName.toLowerCase().includes(q) ||
            b.reservoirName.toLowerCase().includes(q)
        );
        if (!matchTag && !matchRes && !matchBill) return false;
      }
      return true;
    });
  }, [allDispatchedTags, batchFilter, statusFilter, searchQuery]);

  const kpiStats = useMemo(() => {
    const total = allDispatchedTags.length;
    const arrived = allDispatchedTags.filter((t) => t.arrived).length;
    const pending = total - arrived;
    const rate = total > 0 ? (arrived / total) * 100 : 0;
    return { total, arrived, pending, rate };
  }, [allDispatchedTags]);

  const reservoirOptions = useMemo(() => {
    return [
      { label: 'All / Unassigned', value: 'none' },
      ...(reservoirs || []).map((r) => ({ label: r.name, value: r.id })),
    ];
  }, [reservoirs]);

  const locationOptions = useMemo(() => {
    return [
      { label: 'All / Unassigned', value: 'none' },
      ...(locations || []).map((l) => ({ label: l.name, value: l.id })),
    ];
  }, [locations]);

  const officerOptions = useMemo(() => {
    return [
      { label: 'All / Unassigned', value: 'none' },
      ...(employees || []).map((e) => ({ label: e.full_name, value: e.id })),
    ];
  }, [employees]);

  const openAddDialog = () => {
    setEditingDispatch(null);
    setStartTagInput('');
    setEndTagInput('');
    setSentDate(new Date().toISOString().split('T')[0]);
    setReservoirId('none');
    setLocationId('none');
    setOfficerId('none');
    setNotes('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (dispatch: TagDispatch) => {
    setEditingDispatch(dispatch);
    setStartTagInput(formatTagNumber(dispatch.prefix, dispatch.start_number, dispatch.pad_length));
    setEndTagInput(formatTagNumber(dispatch.prefix, dispatch.end_number, dispatch.pad_length));
    setSentDate(dispatch.sent_date);
    setReservoirId(dispatch.reservoir_id || 'none');
    setLocationId(dispatch.location_id || 'none');
    setOfficerId(dispatch.field_officer_employee_id || 'none');
    setNotes(dispatch.notes || '');
    setIsDialogOpen(true);
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseTagRangeStrings(startTagInput, endTagInput);
    if (parsed.error) {
      toast.error(parsed.error);
      return;
    }
    if (!sentDate) {
      toast.error('Sent date is required.');
      return;
    }

    const payload = {
      prefix: parsed.prefix,
      start_number: parsed.startNumber,
      end_number: parsed.endNumber,
      pad_length: parsed.padLength,
      sent_date: sentDate,
      reservoir_id: reservoirId && reservoirId !== 'none' ? reservoirId : null,
      location_id: locationId && locationId !== 'none' ? locationId : null,
      field_officer_employee_id: officerId && officerId !== 'none' ? officerId : null,
      notes: notes.trim() || null,
    };

    try {
      if (editingDispatch) {
        await updateDispatch.mutateAsync({ id: editingDispatch.id, ...payload });
        toast.success('Tag range updated.');
      } else {
        await createDispatch.mutateAsync({ ...payload, created_by: user?.id || null });
        toast.success('Tag range added.');
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save tag range');
    }
  };

  const handleDeleteDispatch = async (id: string) => {
    if (!confirm('Delete this sent tag range?')) return;
    try {
      await deleteDispatch.mutateAsync(id);
      toast.success('Tag range deleted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete tag range');
    }
  };

  const handleOpenBill = (billId: string) => {
    const found = (bills || []).find((b: any) => b.id === billId);
    if (found) {
      setViewBill(found);
      setIsViewBillOpen(true);
    }
  };

  if (dispatchesLoading || billsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Sealing Tag Tracking
          </h1>
          <p className="text-muted-foreground">
            Record sent tag number ranges and sent dates, and automatically verify arrived tags from bills.
          </p>
        </div>
        {canManage && (
          <Button onClick={openAddDialog} className="gradient-water">
            <Plus className="h-4 w-4 mr-2" />
            Add Sent Tag Range
          </Button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Sent Tags
              </p>
              <p className="text-2xl font-black text-primary mt-1">{kpiStats.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {batchSummaries.length} dispatch batches
              </p>
            </div>
            <div className="p-3 rounded-xl bg-primary/15 text-primary">
              <Send className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Arrived Tags
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {kpiStats.arrived.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Matched on collection bills</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pending / In Field
              </p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {kpiStats.pending.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Not yet returned on a bill</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Arrival Rate
              </p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{kpiStats.rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Return verification progress</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-600">
              <Hash className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="tags">Individual Tag Check ({filteredTags.length})</TabsTrigger>
          <TabsTrigger value="batches">Sent Tag Batches ({batchSummaries.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tag #, bill #, reservoir..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="arrived">Arrived Only</SelectItem>
                    <SelectItem value="pending">Pending Arrival Only</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sent Batches</SelectItem>
                    {batchSummaries.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.startTag} – {b.endTag} ({b.sent_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag Number</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Matched Bill(s)</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTags.slice(0, 300).map((tag) => (
                    <TableRow key={`${tag.dispatchId}-${tag.tagCode}`}>
                      <TableCell className="font-mono font-bold text-primary">
                        {tag.tagCode}
                      </TableCell>
                      <TableCell>{tag.sentDate}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[tag.reservoirName, tag.locationName, tag.officerName]
                          .filter(Boolean)
                          .join(' • ') || 'General'}
                      </TableCell>
                      <TableCell>
                        {tag.arrived ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Arrived
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tag.matchedBills.length > 0 ? (
                          <div className="space-y-1">
                            {tag.matchedBills.map((mb) => (
                              <div key={mb.billId} className="text-xs flex items-center gap-2">
                                <span className="font-mono font-bold">#{mb.billNo}</span>
                                <span className="text-muted-foreground">{mb.billDate}</span>
                                <span className="text-muted-foreground truncate max-w-[160px]">
                                  {mb.reservoirName}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                  {mb.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tag.matchedBills.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenBill(tag.matchedBills[0].billId)}
                            title="View Matched Bill"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTags.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No sent tags found. Click "Add Sent Tag Range" to record dispatched tags.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {filteredTags.length > 300 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t">
                  Showing first 300 of {filteredTags.length} tags. Use search or batch filter to narrow results.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent Tag Number Batches</CardTitle>
              <CardDescription>
                Every tag range dispatched along with sent date and arrival progress.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag Range</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Assigned Reservoir / Center / Officer</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Arrived</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="w-36">Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchSummaries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono font-bold">
                        {b.startTag} → {b.endTag}
                      </TableCell>
                      <TableCell>{b.sent_date}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[b.reservoirs?.name, b.locations?.name, b.employees?.full_name]
                          .filter(Boolean)
                          .join(' • ') || 'General'}
                        {b.notes && <p className="text-xs italic mt-0.5">{b.notes}</p>}
                      </TableCell>
                      <TableCell className="text-right font-mono">{b.totalCount}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        {b.arrivedCount}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-amber-600">
                        {b.pendingCount}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={b.arrivalPercent} className="h-2" />
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {b.arrivalPercent.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => {
                              setBatchFilter(b.id);
                              setActiveTab('tags');
                            }}
                          >
                            <Filter className="h-3.5 w-3.5 mr-1" />
                            Check Tags
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(b)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteDispatch(b.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {batchSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        No tag dispatch batches recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Tag Dispatch Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDispatch ? 'Edit Sent Tag Range' : 'Add Sent Tag Range'}</DialogTitle>
            <DialogDescription>
              Enter the tag number range sent out (e.g., 1001 to 1050 or TAG-001 to TAG-050) and the sent date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveDispatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTag">From Tag Number *</Label>
                <Input
                  id="startTag"
                  value={startTagInput}
                  onChange={(e) => setStartTagInput(e.target.value)}
                  placeholder="e.g. 1001 or TAG-001"
                  className="font-mono"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTag">To Tag Number *</Label>
                <Input
                  id="endTag"
                  value={endTagInput}
                  onChange={(e) => setEndTagInput(e.target.value)}
                  placeholder="e.g. 1050 or TAG-050"
                  className="font-mono"
                  required
                />
              </div>
            </div>

            {parsedRangePreview && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  parsedRangePreview.error
                    ? 'bg-destructive/10 border-destructive/30 text-destructive'
                    : 'bg-primary/5 border-primary/20 text-foreground'
                }`}
              >
                {parsedRangePreview.error ? (
                  <span>{parsedRangePreview.error}</span>
                ) : (
                  <span className="font-medium">
                    Range Preview:{' '}
                    <strong className="font-mono">
                      {formatTagNumber(
                        parsedRangePreview.prefix,
                        parsedRangePreview.startNumber,
                        parsedRangePreview.padLength
                      )}
                    </strong>{' '}
                    →{' '}
                    <strong className="font-mono">
                      {formatTagNumber(
                        parsedRangePreview.prefix,
                        parsedRangePreview.endNumber,
                        parsedRangePreview.padLength
                      )}
                    </strong>{' '}
                    ({parsedRangePreview.endNumber - parsedRangePreview.startNumber + 1} tags)
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sentDate">Sent Date *</Label>
                <Input
                  id="sentDate"
                  type="date"
                  value={sentDate}
                  onChange={(e) => setSentDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location / Center (Optional)</Label>
                <SearchableSelect
                  options={locationOptions}
                  value={locationId}
                  onValueChange={setLocationId}
                  placeholder="Select center..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reservoir (Optional)</Label>
                <SearchableSelect
                  options={reservoirOptions}
                  value={reservoirId}
                  onValueChange={setReservoirId}
                  placeholder="Select reservoir..."
                />
              </div>
              <div className="space-y-2">
                <Label>Field Officer (Optional)</Label>
                <SearchableSelect
                  options={officerOptions}
                  value={officerId}
                  onValueChange={setOfficerId}
                  placeholder="Select officer..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagNotes">Notes (Optional)</Label>
              <Textarea
                id="tagNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Courier / hand-delivered details..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createDispatch.isPending || updateDispatch.isPending || !!parsedRangePreview?.error}
                className="gradient-water"
              >
                {(createDispatch.isPending || updateDispatch.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingDispatch ? 'Update Range' : 'Save Tag Range'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BillViewDialog open={isViewBillOpen} onOpenChange={setIsViewBillOpen} bill={viewBill} />
    </div>
  );
}
