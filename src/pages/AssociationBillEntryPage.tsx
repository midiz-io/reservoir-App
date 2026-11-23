import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, MapPin, ShieldCheck, Eye, Printer, Weight, Coins, Activity, Camera, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useReservoirs } from '@/hooks/useReservoirs';
import { useAssociationBills, useCreateAssociationBill, useUpdateAssociationBill } from '@/hooks/useAssociationBills';
import { useSuppliers } from '@/hooks/useSuppliers';
import { BillInvoice } from '@/components/data-entry/BillInvoice';
import { TagNumberInput } from '@/components/bills/TagNumberInput';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { usePriceCatalog } from '@/hooks/usePriceCatalog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

type LineItem = {
  description: string;
  qty: string;
  pieces: string;
  unit_price: string;
};

const GRADING_OPTIONS = [
  '250 Up',
  '250 Below',
  'Grade B',
  'Gal Isso',
  'Live Freshwater Prawn'
];

function toNumber(value: string): number {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

const compressAndUploadImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(async (blob) => {
          if (!blob) {
             reject(new Error('Canvas to Blob failed'));
             return;
          }
          
          try {
             const formData = new FormData();
             formData.append('file', blob, 'bill_photo.jpg');
             const res = await fetch('https://img.geekhirusha.com/upload.php', {
               method: 'POST',
               body: formData
             });
             const text = await res.text();
             try {
                const json = JSON.parse(text);
                resolve(json.url || text);
             } catch(e) {
                resolve(text);
             }
          } catch(e) {
             reject(e);
          }
        }, 'image/jpeg', 0.7);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};



export default function AssociationBillEntryPage() {
  const { user, userRole } = useAuth();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: reservoirs, isLoading: reservoirsLoading } = useReservoirs();
  const createBill = useCreateAssociationBill();
  const updateBill = useUpdateAssociationBill();
  const { data: myBills, isLoading: myBillsLoading } = useAssociationBills();
  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: catalog } = usePriceCatalog();

  const [fieldOfficerId, setFieldOfficerId] = useState<string>('');
  const [reservoirId, setReservoirId] = useState<string>('');

  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (reservoirId && !billNo && reservoirs && !myBillsLoading) {
      const res = reservoirs.find(r => r.id === reservoirId);
      if (res) {
        const getInitials = (name: string): string => {
          const words = name.trim().split(/\s+/);
          if (words.length >= 2) {
            // Take first letter of first two words
            return (words[0][0] + (words[1][0] || '')).toUpperCase();
          }
          // Take first two letters of the single word
          return name.substring(0, 2).toUpperCase();
        };

        const centerInitials = res.locations?.name ? getInitials(res.locations.name) : 'XX';
        const resInitials = getInitials(res.name);
        const prefix = `${centerInitials}${resInitials}`;

        // Find the next sequence number from existing bills
        const prefixBills = myBills?.filter(b => b.bill_no?.startsWith(prefix)) || [];
        let nextNum = 1;

        if (prefixBills.length > 0) {
          const numbers = prefixBills.map(b => {
            const numPart = b.bill_no?.substring(prefix.length) || '';
            const parsed = parseInt(numPart, 10);
            return isNaN(parsed) ? 0 : parsed;
          });
          nextNum = Math.max(...numbers) + 1;
        }

        setBillNo(`${prefix}${nextNum.toString().padStart(4, '0')}`);
      }
    }
  }, [reservoirId, reservoirs, myBills, myBillsLoading, billNo]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierTel, setSupplierTel] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');

  const [purchaserName, setPurchaserName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [sealingTagNumber, setSealingTagNumber] = useState('');
  const [boxNumber, setBoxNumber] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [items, setItems] = useState<LineItem[]>([
    { description: '', qty: '', pieces: '', unit_price: '' },
  ]);

  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historySearchFilter, setHistorySearchFilter] = useState('');

  // Auto-detect and auto-fill details for Fisheries Association logins
  useEffect(() => {
    if (isEditing) return; // Do not auto-fill if we are editing an existing bill
    if (userRole !== 'fisheries_association') return; // Only for fisheries association users
    if (!employees || !reservoirs || !suppliers) return; // Wait for data to load

    // 1. Find logged-in user's employee record
    const assocEmp = employees.find(e => e.user_id === user?.id);
    if (!assocEmp) return;

    // 2. Find relevant field officer (role === 'employee') sharing at least one location
    const assocLocs = assocEmp.assigned_locations || [];
    const matchedOfficer = employees.find(e =>
      e.role === 'employee' &&
      e.assigned_locations?.some(locId => assocLocs.includes(locId))
    ) || employees.find(e => e.role === 'employee');

    if (matchedOfficer && !fieldOfficerId) {
      setFieldOfficerId(matchedOfficer.id);
      setPurchaserName(matchedOfficer.full_name);

      // 3. Find first available reservoir for this officer
      const allowedLocs = new Set(matchedOfficer.assigned_locations || []);
      const matchedReservoir = reservoirs.find(r => r.location_id && allowedLocs.has(r.location_id));
      if (matchedReservoir && !reservoirId) {
        setReservoirId(matchedReservoir.id);
      }
    }

    // 4. Find matching supplier/association for this logged-in user
    if (!selectedSupplierId) {
      const nameToMatch = assocEmp.full_name.toLowerCase();
      const matchedSupplier = suppliers.find(s =>
        s.association_name?.toLowerCase().includes(nameToMatch) ||
        s.collector_name?.toLowerCase().includes(nameToMatch) ||
        nameToMatch.includes(s.association_name?.toLowerCase() || '') ||
        nameToMatch.includes(s.collector_name?.toLowerCase() || '')
      );
      if (matchedSupplier) {
        setSelectedSupplierId(matchedSupplier.id);
        setSupplierName(matchedSupplier.collector_name);
        setSupplierTel(matchedSupplier.collector_phone || '');
        setSupplierAddress(matchedSupplier.association_address || '');
      }
    }
  }, [user, userRole, employees, reservoirs, suppliers, isEditing, fieldOfficerId, reservoirId, selectedSupplierId]);

  const filteredHistoryBills = useMemo(() => {
    if (!myBills) return [];
    return myBills.filter(b => {
      if (historyDateFilter && b.bill_date !== historyDateFilter) return false;
      if (historySearchFilter) {
        const q = historySearchFilter.toLowerCase().trim();
        const matchBillNo = b.bill_no?.toLowerCase().includes(q);
        const matchSupplier = b.supplier_name?.toLowerCase().includes(q);
        const matchReservoir = b.reservoirs?.name?.toLowerCase().includes(q);
        if (!matchBillNo && !matchSupplier && !matchReservoir) return false;
      }
      return true;
    });
  }, [myBills, historyDateFilter, historySearchFilter]);

  const monthlyPLAccumulated = useMemo(() => {
    if (!myBills) return 0;
    const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
    const currentMonthBills = myBills.filter(b => b.bill_date && b.bill_date.startsWith(currentMonthStr));

    return currentMonthBills.reduce((sum, b) => {
      const items = Array.isArray(b.items) ? b.items : [];
      const billQty = items.reduce((s: number, it: any) => {
        const qty = Number(it.qty);
        return s + (Number.isFinite(qty) ? qty : 0);
      }, 0);
      return sum + (billQty * 100);
    }, 0);
  }, [myBills]);

  const selectedEmployee = useMemo(() => {
    return employees?.find(e => e.id === fieldOfficerId) || null;
  }, [employees, fieldOfficerId]);

  const selectedReservoir = useMemo(() => {
    return reservoirs?.find(r => r.id === reservoirId) || null;
  }, [reservoirs, reservoirId]);

  const supplierOptions = useMemo(() => {
    if (!suppliers) return [];

    // Filter suppliers by selected reservoir if one is picked
    const filteredSuppliers = reservoirId
      ? suppliers.filter(s => s.reservoir_id === reservoirId)
      : suppliers;

    return filteredSuppliers.map(s => ({
      label: `${s.collector_name} (${s.association_name})`,
      value: s.id
    }));
  }, [suppliers, reservoirId]);

  const handleSupplierChange = (id: string) => {
    setSelectedSupplierId(id);
    const s = suppliers?.find(sup => sup.id === id);
    if (s) {
      setSupplierName(s.collector_name);
      setSupplierTel(s.collector_phone || '');
      setSupplierEmail(''); // Database doesn't have email in suppliers currently, or does it? checking...
      setSupplierAddress(s.association_address || '');
    }
  };

  const availableReservoirs = useMemo(() => {
    if (!reservoirs) return [];
    if (!selectedEmployee?.assigned_locations?.length) return reservoirs;
    const allowedLocations = new Set(selectedEmployee.assigned_locations);
    return reservoirs.filter(r => r.location_id && allowedLocations.has(r.location_id));
  }, [reservoirs, selectedEmployee]);

  const fieldOfficerOptions = useMemo(() => {
    return (employees || []).map(e => ({
      label: e.full_name,
      value: e.id
    }));
  }, [employees]);

  const reservoirOptions = useMemo(() => {
    return (availableReservoirs || []).map(r => ({
      label: r.name,
      value: r.id
    }));
  }, [availableReservoirs]);



  const lineTotals = useMemo(() => {
    return items.map((it) => {
      const qty = toNumber(it.qty);
      const price = toNumber(it.unit_price);
      return qty * price;
    });
  }, [items]);

  const computedTotal = useMemo(() => {
    return lineTotals.reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
  }, [lineTotals]);

  const computedTotalQty = useMemo(() => {
    return items.reduce((sum, it) => sum + toNumber(it.qty), 0);
  }, [items]);

  const computedTotalPieces = useMemo(() => {
    return items.reduce((sum, it) => sum + toNumber(it.pieces), 0);
  }, [items]);

  const computedPLCount = useMemo(() => {
    return computedTotalQty * 100;
  }, [computedTotalQty]);

  const filteredCatalog = useMemo(() => {
    if (!catalog) return [];
    return catalog.filter(ci => !ci.reservoir_id || ci.reservoir_id === reservoirId);
  }, [catalog, reservoirId]);

  const catalogOptions = useMemo(() => {
    // Unique descriptions to avoid duplicates in datalist
    const seen = new Set<string>();
    return filteredCatalog.filter(ci => {
      if (seen.has(ci.item_description)) return false;
      seen.add(ci.item_description);
      return true;
    });
  }, [filteredCatalog]);

  const allItemOptions = useMemo(() => {
    const catalogDescs = catalogOptions.map(ci => ci.item_description);
    // Combine with GRADING_OPTIONS, ensuring uniqueness
    const combined = Array.from(new Set([...catalogDescs, ...GRADING_OPTIONS]));
    return combined;
  }, [catalogOptions]);

  const canSubmit =
    !!user &&
    (userRole === 'fisheries_association' || userRole === 'super_admin') &&
    !!fieldOfficerId &&
    !!reservoirId &&
    !!billNo.trim() &&
    !!billDate &&
    !!supplierName.trim() &&
    !!purchaserName.trim() &&
    items.length > 0 &&
    items.every(i => i.description.trim() && toNumber(i.qty) > 0 && toNumber(i.unit_price) >= 0) &&
    !createBill.isPending;

  const addItem = () => setItems(prev => [...prev, { description: '', qty: '', pieces: '', unit_price: '' }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };

      // If description changed, check if it matches a catalog item to auto-fill price
      if (patch.description !== undefined && catalog) {
        const matchingItems = catalog.filter(ci =>
          ci.item_description?.toLowerCase() === patch.description?.toLowerCase() &&
          (!ci.reservoir_id || ci.reservoir_id === reservoirId)
        );

        // Prioritize specific over general
        const specificItem = matchingItems.find(ci => ci.reservoir_id === reservoirId);
        const generalItem = matchingItems.find(ci => !ci.reservoir_id);
        const itemToUse = specificItem || generalItem;

        if (itemToUse) {
          updated.unit_price = itemToUse.unit_price.toString();
        }
      }

      return updated;
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = (bill: any) => {
    setIsEditing(true);
    setEditingBillId(bill.id);
    setFieldOfficerId(bill.field_officer_employee_id);
    setReservoirId(bill.reservoir_id);
    setBillNo(bill.bill_no);
    setBillDate(bill.bill_date);
    setSupplierName(bill.supplier_name);
    setSupplierTel(bill.supplier_tel || '');
    setSupplierEmail(bill.supplier_email || '');
    setSupplierAddress(bill.supplier_address || '');
    setPurchaserName(bill.purchaser_name || '');
    setRemarks(bill.remarks || '');
    setSealingTagNumber(bill.sealing_tag_number || '');
    setBoxNumber(bill.box_number || '');
    setItems(bill.items.map((it: any) => ({
      description: it.description,
      qty: it.qty.toString(),
      pieces: it.pieces !== undefined && it.pieces !== null ? it.pieces.toString() : '',
      unit_price: it.unit_price.toString()
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingBillId(null);
    setBillNo('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setPurchaserName('');
    setRemarks('');
    setSealingTagNumber('');
    setBoxNumber('');
    setItems([{ description: '', qty: '', pieces: '', unit_price: '' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (userRole !== 'fisheries_association' && userRole !== 'super_admin') {
      toast.error('Only Fisheries Association accounts or Super Admins can submit bills.');
      return;
    }



    try {
      let finalRemarks = remarks.trim();
      
      if (photoFile) {
        toast.info('Compressing and uploading image...');
        try {
          const uploadedUrl = await compressAndUploadImage(photoFile);
          finalRemarks = finalRemarks ? `${finalRemarks}\nPhoto: ${uploadedUrl}` : `Photo: ${uploadedUrl}`;
        } catch (uploadError) {
          toast.error('Failed to upload image to external API');
          return;
        }
      }

      const payload = {
        association_user_id: user.id,
        field_officer_employee_id: fieldOfficerId,
        reservoir_id: reservoirId,
        bill_no: billNo.trim(),
        bill_date: billDate,
        supplier_name: supplierName.trim(),
        supplier_tel: supplierTel.trim() || null,
        supplier_email: supplierEmail.trim() || null,
        supplier_address: supplierAddress.trim() || null,
        purchaser_name: purchaserName.trim(),
        remarks: finalRemarks || null,
        sealing_tag_number: sealingTagNumber.trim(),
        box_number: boxNumber.trim(),
        items: items.map((it, idx) => ({
          description: it.description.trim(),
          qty: toNumber(it.qty),
          pieces: toNumber(it.pieces) > 0 ? toNumber(it.pieces) : 0,
          unit_price: toNumber(it.unit_price),
          line_total: lineTotals[idx],
        })) as any,
        total: computedTotal,
      };

      if (isEditing && editingBillId) {
        await updateBill.mutateAsync({
          id: editingBillId,
          ...payload,
          status: 'pending'
        });
        toast.success('Bill updated successfully.');
      } else {
        await createBill.mutateAsync(payload);
        toast.success('Bill submitted successfully.');
      }

      handleCancelEdit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit bill');
    }
  };

  return (
    <div className="animate-fade-in max-w-5xl">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight underline decoration-primary/20 underline-offset-8">
            Fisheries Association Bill Entry Page.
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditing
              ? `Updating bill #${billNo}`
              : 'Fill in the details below to record a new bill.'}
          </p>
        </div>

        {/* Modern Responsive Summary Cards in the Page Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto md:min-w-[680px]">
          {/* Price Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 border border-primary/20 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-muted-foreground block">Grand Price</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-bold text-primary/80">Rs.</span>
                <span className="text-lg font-black text-primary tracking-tight">
                  {computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
              <Coins className="h-4 w-4" />
            </div>
          </div>

          {/* Quantity Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl p-4 border border-emerald-500/20 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-black tracking-wider text-muted-foreground block">Grand Qty</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black text-emerald-600 tracking-tight">
                  {computedTotalQty.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-emerald-600/80">kg</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform shrink-0">
              <Weight className="h-4 w-4" />
            </div>
          </div>

          {/* PL Count Card */}
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 rounded-2xl p-4 border border-amber-500/20 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] uppercase font-black tracking-wider text-muted-foreground block">PL Count</span>
                <span className="text-[8px] bg-amber-500 text-white font-extrabold px-1 py-0.5 rounded leading-none whitespace-nowrap">1kg = 100PL</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black text-amber-600 tracking-tight">
                  {computedPLCount.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-amber-600/80">PL</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          {/* Monthly PL Accumulated Card */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 rounded-2xl p-4 border border-indigo-500/20 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] uppercase font-black tracking-wider text-slate-500 block">Monthly PL</span>
                <span className="text-[8px] bg-indigo-500 text-white font-extrabold px-1 py-0.5 rounded leading-none whitespace-nowrap">Current Month</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-lg font-black text-indigo-600 tracking-tight">
                  {monthlyPLAccumulated.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-indigo-600/80">PL</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-lg font-bold">System Context</CardTitle>
              <CardDescription>Select the field officer and reservoir for this entry.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/10 rounded-xl border">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Field Officer</Label>
                    <SearchableSelect
                      options={fieldOfficerOptions}
                      value={fieldOfficerId}
                      onValueChange={(v) => {
                        setFieldOfficerId(v);
                        setReservoirId('');
                        // Auto-populate purchaser name
                        const emp = employees?.find(e => e.id === v);
                        if (emp) {
                          setPurchaserName(emp.full_name);
                        }
                      }}
                      placeholder={employeesLoading ? 'Loading…' : 'Select a field officer'}
                      disabled={employeesLoading}
                      className="bg-background border-2 focus-within:border-primary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Reservoir (assigned)</Label>
                    <SearchableSelect
                      options={reservoirOptions}
                      value={reservoirId}
                      onValueChange={(v) => {
                        setReservoirId(v);
                        setBillNo(''); // Clear to trigger re-generation with new initials
                      }}
                      placeholder={reservoirsLoading ? 'Loading…' : (fieldOfficerId ? 'Select a reservoir' : 'Select field officer first')}
                      disabled={!fieldOfficerId || reservoirsLoading}
                      className="bg-background border-2 focus-within:border-primary/50"
                    />
                  </div>
                </div>

                <Card className="border-none shadow-none bg-transparent">
                  <CardHeader className="px-0 pb-3">
                    <CardTitle className="text-xl font-bold border-l-4 border-primary pl-3">Fisheries Association Details</CardTitle>
                    <CardDescription className="pl-3 italic">Ex:- Fisheries Association Name, Address.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 space-y-4">
                    <div className="space-y-2">
                      <Label className="font-semibold text-foreground/80">Select Association / Supplier</Label>
                      <SearchableSelect
                        options={supplierOptions}
                        value={selectedSupplierId}
                        onValueChange={handleSupplierChange}
                        placeholder={suppliersLoading ? "Loading suppliers..." : "Search for a supplier..."}
                        disabled={suppliersLoading}
                        className="bg-background border-2 h-12"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Association Name</Label>
                        <p className="text-lg font-medium px-1 underline decoration-primary/30 underline-offset-4 decoration-2">{supplierName || '—'}</p>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase">Address</Label>
                        <p className="text-sm text-muted-foreground px-1 py-1">{supplierAddress || '—'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 items-end">
                  <div className="md:col-span-6 space-y-2">
                    <Label htmlFor="fishermanName" className="text-lg font-bold">Fisherman Name:</Label>
                    <Input
                      id="fishermanName"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Enter fisherman name..."
                      className="border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary h-10 px-0 text-lg bg-transparent"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="billDate" className="text-sm font-bold">Date:</Label>
                    <Input
                      id="billDate"
                      type="date"
                      value={billDate}
                      onChange={(e) => setBillDate(e.target.value)}
                      className="border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary h-10 px-0 bg-transparent"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="billNo" className="text-sm font-bold">Invoice No:</Label>
                    <Input
                      id="billNo"
                      value={billNo}
                      onChange={(e) => setBillNo(e.target.value)}
                      placeholder="No."
                      className="border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary h-10 px-0 font-mono bg-transparent"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="boxNumber" className="text-sm font-bold">Box No:</Label>
                    <Input
                      id="boxNumber"
                      value={boxNumber}
                      onChange={(e) => setBoxNumber(e.target.value)}
                      placeholder="Box Number"
                      className="border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary h-10 px-0 font-mono bg-transparent"
                    />
                  </div>

                  <div className="md:col-span-6 space-y-2">
                    <Label htmlFor="sealingTagNumber" className="text-sm font-bold">Sealing Tag No:</Label>
                    <TagNumberInput
                      id="sealingTagNumber"
                      value={sealingTagNumber}
                      onChange={setSealingTagNumber}
                      reservoirId={reservoirId}
                      excludeBillId={editingBillId}
                      placeholder="Enter or select sent tag number"
                      className="border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary h-10 px-0 bg-transparent"
                    />
                  </div>

                  <div className="md:col-span-12 space-y-2">
                    <Label className="text-sm font-bold block">Live Camera Capture (Bill Photo):</Label>
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="outline" className="relative h-12 w-48 font-bold border-2">
                        <Camera className="w-5 h-5 mr-2" />
                        Take Photo
                        <Input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => e.target.files && setPhotoFile(e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </Button>
                      {photoFile && <span className="text-sm text-green-600 font-bold flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Photo Attached</span>}
                    </div>
                  </div>
                </div>



                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">Items</CardTitle>
                        <CardDescription>Enter each line item from the bill.</CardDescription>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        addItem();
                        setActiveRowIndex(items.length);
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add item
                      </Button>
                    </div>
                  </CardHeader>

                  {/* Price Bar Implementation */}
                  <div className="px-6 pb-6">
                    <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-6 shadow-2xl border-b-4 border-primary/30 animate-in fade-in slide-in-from-top-4 duration-500">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                          <Badge className="bg-primary hover:bg-primary text-white font-black">#{activeRowIndex + 1}</Badge>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Grading / Description</span>
                          <span className="text-xl font-bold text-white truncate max-w-[200px]">
                            {items[activeRowIndex]?.description || 'Not Selected'}
                          </span>
                        </div>
                      </div>

                      <div className="h-10 w-px bg-slate-800 hidden md:block"></div>

                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">1KG Price</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs font-bold text-slate-500">LKR</span>
                          <span className="text-2xl font-black text-primary">
                            {toNumber(items[activeRowIndex]?.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="h-10 w-px bg-slate-800 hidden md:block"></div>

                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Qty (KG)</span>
                        <span className="text-2xl font-black text-white">
                          {toNumber(items[activeRowIndex]?.qty).toLocaleString()} <span className="text-sm font-normal text-slate-400">kg</span>
                        </span>
                      </div>

                      <div className="h-10 w-px bg-slate-800 hidden md:block"></div>

                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Pieces (Pcs)</span>
                        <span className="text-2xl font-black text-emerald-400">
                          {toNumber(items[activeRowIndex]?.pieces).toLocaleString()} <span className="text-sm font-normal text-slate-400">pcs</span>
                        </span>
                      </div>

                      <div className="ml-auto bg-gradient-to-br from-primary/30 to-primary/10 px-6 py-3 rounded-xl border border-primary/40 backdrop-blur-sm">
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary-foreground/70 block mb-1">Row Total Value</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-primary-foreground/60">Rs.</span>
                          <span className="text-3xl font-black text-white">
                            {(toNumber(items[activeRowIndex]?.qty) * toNumber(items[activeRowIndex]?.unit_price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-0 md:p-6">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="min-w-[200px] font-bold text-foreground">Item</TableHead>
                            <TableHead className="w-[100px] min-w-[80px] font-bold text-foreground">Qty (kg)</TableHead>
                            <TableHead className="w-[115px] min-w-[95px] font-bold text-foreground">Pieces (pcs)</TableHead>
                            <TableHead className="w-[110px] min-w-[95px] font-bold text-foreground">Price</TableHead>
                            <TableHead className="w-[110px] min-w-[95px] text-right font-bold text-foreground">Value</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((it, idx) => (
                            <TableRow
                              key={idx}
                              className={activeRowIndex === idx ? "bg-primary/5 border-l-4 border-l-primary" : ""}
                              onClick={() => setActiveRowIndex(idx)}
                            >
                              <TableCell>
                                <div className="flex flex-col gap-2">
                                  <Select
                                    value={it.description || ''}
                                    onValueChange={(v) => {
                                      updateItem(idx, { description: v });
                                      setActiveRowIndex(idx);
                                    }}
                                  >
                                    <SelectTrigger className="w-full h-10 font-medium">
                                      <SelectValue placeholder="Select Grading" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {allItemOptions.map(g => (
                                        <SelectItem key={g} value={g}>{g}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={it.qty}
                                  onChange={(e) => updateItem(idx, { qty: e.target.value })}
                                  onFocus={() => setActiveRowIndex(idx)}
                                  inputMode="decimal"
                                  placeholder="0"
                                  className="px-2 md:px-3 h-10 font-bold"
                                />
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Input
                                    value={it.pieces}
                                    onChange={(e) => updateItem(idx, { pieces: e.target.value })}
                                    onFocus={() => setActiveRowIndex(idx)}
                                    inputMode="numeric"
                                    placeholder="0 pcs"
                                    className="px-2 md:px-3 h-10 font-bold"
                                  />
                                  {toNumber(it.qty) > 0 && toNumber(it.pieces) > 0 && (
                                    <span className="text-[10px] text-emerald-600 font-semibold block text-center">
                                      {(toNumber(it.pieces) / toNumber(it.qty)).toFixed(1)} pcs/kg
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={it.unit_price}
                                  onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                                  onFocus={() => setActiveRowIndex(idx)}
                                  inputMode="decimal"
                                  placeholder="0"
                                  readOnly={(() => {
                                    const matchingItem = catalog?.find(ci =>
                                      ci.item_description?.toLowerCase() === it.description?.toLowerCase() &&
                                      (!ci.reservoir_id || ci.reservoir_id === reservoirId)
                                    );
                                    return !!matchingItem;
                                  })()}
                                  className={(() => {
                                    const matchingItem = catalog?.find(ci =>
                                      ci.item_description?.toLowerCase() === it.description?.toLowerCase() &&
                                      (!ci.reservoir_id || ci.reservoir_id === reservoirId)
                                    );
                                    return matchingItem ? "bg-muted px-2 md:px-3 h-10 font-bold" : "px-2 md:px-3 h-10 font-bold";
                                  })()}
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold text-lg text-primary">
                                {lineTotals[idx]?.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    removeItem(idx);
                                    if (activeRowIndex >= items.length - 1) {
                                      setActiveRowIndex(Math.max(0, items.length - 2));
                                    }
                                  }}
                                  disabled={items.length === 1}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-border">
                      {items.map((it, idx) => (
                        <div key={idx} className="p-4 space-y-4 bg-muted/5" onClick={() => setActiveRowIndex(idx)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Grading / Item Description</Label>
                              <Select
                                value={it.description || ''}
                                onValueChange={(v) => {
                                  updateItem(idx, { description: v });
                                  setActiveRowIndex(idx);
                                }}
                              >
                                <SelectTrigger className="w-full bg-background">
                                  <SelectValue placeholder="Select Grading" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allItemOptions.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                removeItem(idx);
                                if (activeRowIndex >= items.length - 1) {
                                  setActiveRowIndex(Math.max(0, items.length - 2));
                                }
                              }}
                              disabled={items.length === 1}
                              className="mt-6 h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Qty (KG)</Label>
                              <Input
                                value={it.qty}
                                onChange={(e) => updateItem(idx, { qty: e.target.value })}
                                onFocus={() => setActiveRowIndex(idx)}
                                inputMode="decimal"
                                placeholder="0"
                                className="bg-background font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Pieces (Pcs)</Label>
                              <Input
                                value={it.pieces}
                                onChange={(e) => updateItem(idx, { pieces: e.target.value })}
                                onFocus={() => setActiveRowIndex(idx)}
                                inputMode="numeric"
                                placeholder="0"
                                className="bg-background font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Price (LKR)</Label>
                              <Input
                                value={it.unit_price}
                                onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                                onFocus={() => setActiveRowIndex(idx)}
                                inputMode="decimal"
                                placeholder="0"
                                readOnly={(() => {
                                  const matchingItem = catalog?.find(ci =>
                                    ci.item_description?.toLowerCase() === it.description?.toLowerCase() &&
                                    (!ci.reservoir_id || ci.reservoir_id === reservoirId)
                                  );
                                  return !!matchingItem;
                                })()}
                                className={(() => {
                                  const matchingItem = catalog?.find(ci =>
                                    ci.item_description?.toLowerCase() === it.description?.toLowerCase() &&
                                    (!ci.reservoir_id || ci.reservoir_id === reservoirId)
                                  );
                                  return matchingItem ? "bg-muted font-bold" : "bg-background font-bold";
                                })()}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-dashed">
                            <span className="text-xs font-medium text-muted-foreground">Total Value</span>
                            <span className="font-black text-primary">Rs. {lineTotals[idx]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      ))}

                      <div className="p-4 bg-muted/30">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full bg-background border-dashed"
                          onClick={addItem}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Another Item
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 md:mt-0 p-4 md:p-0 flex items-center justify-between border-t border-border md:border-none">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
                        {computedTotalPieces > 0 && (
                          <p className="text-xs font-semibold text-emerald-600">
                            Total Pieces: {computedTotalPieces.toLocaleString()} pcs
                            {computedTotalQty > 0 && ` (${(computedTotalPieces / computedTotalQty).toFixed(1)} pcs/kg)`}
                          </p>
                        )}
                      </div>
                      <p className="text-2xl font-display font-bold text-primary">Rs. {computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t mt-8">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Supplier Reservoir</Label>
                    <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-6 min-h-[80px] flex items-center justify-center text-center">
                      <p className="text-xl font-display font-bold text-primary tracking-tight">
                        {selectedReservoir?.name || 'Please Select Reservoir'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="authorizedPerson" className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Authorized person</Label>
                    <div className="space-y-1">
                      <Input
                        id="authorizedPerson"
                        value={purchaserName}
                        onChange={(e) => setPurchaserName(e.target.value)}
                        placeholder="Name of authorized person..."
                        className="border-b-2 border-t-0 border-x-0 rounded-none focus-visible:ring-0 focus-visible:border-primary h-12 px-0 text-xl font-bold bg-transparent"
                      />
                      <div className="w-full border-t border-dashed border-muted-foreground/30 pt-1">
                        <p className="text-[10px] text-muted-foreground italic">Signature / Digital Verified Name</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2 mt-4">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Remarks (optional)</Label>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={2}
                      placeholder="Any notes / reference numbers…"
                      className="bg-muted/5 focus:bg-background border-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="flex-1">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Bill
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader className="print:hidden">
                        <DialogTitle>Bill Preview</DialogTitle>
                        <DialogDescription>Review the bill format as it will appear.</DialogDescription>
                      </DialogHeader>

                      <div className="mt-4 border rounded-lg bg-slate-50 p-4 print:p-0 print:border-none print:bg-white">
                        <BillInvoice
                          billNo={billNo}
                          billDate={billDate}
                          supplierName={supplierName}
                          supplierTel={supplierTel}
                          supplierEmail={supplierEmail}
                          supplierAddress={supplierAddress}
                          purchaserName={purchaserName}
                          sealingTagNumber={sealingTagNumber}
                          boxNumber={boxNumber}
                          remarks={remarks}
                          total={computedTotal}
                          reservoirName={selectedReservoir?.name}
                          items={items.map((it, idx) => ({
                            description: it.description,
                            qty: it.qty,
                            pieces: it.pieces,
                            unit_price: it.unit_price,
                            line_total: lineTotals[idx]
                          }))}
                        />
                      </div>

                      <DialogFooter className="print:hidden">
                        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                        <Button onClick={handlePrint}>
                          <Printer className="mr-2 h-4 w-4" />
                          Print / Save PDF
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button type="submit" className="flex-[2] h-14 text-lg font-bold gradient-water shadow-lg hover:shadow-xl transition-all" disabled={!canSubmit}>
                    {createBill.isPending || updateBill.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isEditing ? 'Updating…' : 'Saving…'}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Save
                      </>
                    )}
                  </Button>

                  {isEditing && (
                    <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                      Cancel Edit
                    </Button>
                  )}
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>My Bill History</CardTitle>
              <CardDescription>Latest submitted bills and their approval status.</CardDescription>
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Search Reservoir, Bill No..."
                  value={historySearchFilter}
                  onChange={(e) => setHistorySearchFilter(e.target.value)}
                  className="h-8 bg-background border text-xs"
                />
                <div className="flex items-center justify-between">
                  <Input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="h-8 bg-background border text-xs flex-1"
                  />
                  {(historyDateFilter || historySearchFilter) && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => { setHistoryDateFilter(''); setHistorySearchFilter(''); }}
                      className="text-[10px] h-6 p-0 ml-2 text-muted-foreground shrink-0"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {myBillsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : !filteredHistoryBills || filteredHistoryBills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bills matching filter.</p>
              ) : (
                <div className="space-y-3">
                  {filteredHistoryBills.slice(0, 15).map((b: any) => (
                    <div key={b.id} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/50 p-3 shadow-sm transition-all hover:bg-card hover:shadow-md">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold truncate">#{b.bill_no}</p>
                          <Badge variant={(b.status || 'pending') === 'approved' ? 'default' : (b.status === 'rejected' ? 'destructive' : 'secondary')} className="h-4 text-[10px] px-1.5">
                            {(b.status || 'pending') === 'approved' ? 'Approved' : (b.status === 'rejected' ? 'Rejected' : 'Pending')}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-primary truncate">
                          {b.reservoirs?.name || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate font-medium mt-0.5">{b.supplier_name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(b.bill_date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-right">
                          <p className="text-xs font-bold text-emerald-600">Rs. {b.total?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


