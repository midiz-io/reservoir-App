import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Download, FileSpreadsheet, Save, Loader2, Calculator, Camera, Trash2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CameraCapture } from '@/components/ui/camera-capture';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToPDF, captureAsImage } from '@/lib/exportUtils';
import { Share2, Image as ImageIcon, FileText } from 'lucide-react';

interface ExpenseRecord {
  id: string;
  date: string;
  balance: number;
  transfer1: number;
  transfer2: number;
  transfer3: number;
  iceQuantity: number;
  ice: number;
  fuel: number;
  mileage: number;
  food: number;
  otherOps: number;
  purchasingKg: number;
  purchasingCenter: number;
  otherPurchasing: number;
  capital: number;
  spending: number;
  remainder: number;
  receipts?: { id: string; type: string; category: string; amount: number; fileUrl?: string }[];
}

export default function CenterExpensesPage() {
  const [records, setRecords] = useState<ExpenseRecord[]>([
    {
      id: '1',
      date: new Date().toISOString().split('T')[0],
      balance: 50000,
      transfer1: 10000,
      transfer2: 5000,
      transfer3: 0,
      iceQuantity: 500,
      ice: 2500,
      fuel: 3000,
      mileage: 1500,
      food: 1000,
      otherOps: 500,
      purchasingKg: 120,
      purchasingCenter: 4000,
      otherPurchasing: 0,
      capital: 15000,
      spending: 12500,
      remainder: 2500,
    }
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ExpenseRecord>>({
    date: new Date().toISOString().split('T')[0],
    balance: 0,
    transfer1: 0,
    transfer2: 0,
    transfer3: 0,
    iceQuantity: 0,
    ice: 0,
    fuel: 0,
    mileage: 0,
    food: 0,
    otherOps: 0,
    purchasingCenter: 0,
    otherPurchasing: 0,
    capital: 0,
  });

  const [receipts, setReceipts] = useState<{ id: string; type: string; category: string; amount: number; file: File | null; preview: string; fileUrl?: string }[]>([]);
  const [cameraOpenFor, setCameraOpenFor] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  const handleAddReceipt = () => {
    setReceipts([...receipts, { id: Math.random().toString(), type: 'Bill', category: 'Ice', amount: 0, file: null, preview: '' }]);
  };

  const handleRemoveReceipt = (id: string) => {
    setReceipts(receipts.filter(r => r.id !== id));
  };

  const handleReceiptChange = (id: string, field: string, value: any) => {
    setReceipts(receipts.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleCapture = async (id: string, blob: Blob, previewUrl: string) => {
    setReceipts(prev => prev.map(r => r.id === id ? { ...r, preview: previewUrl, file: new File([blob], 'receipt.jpg', { type: 'image/jpeg' }) } : r));
    
    setIsUploading(prev => ({ ...prev, [id]: true }));
    try {
      const formData = new FormData();
      formData.append('file', blob, 'receipt.jpg');
      
      const response = await fetch('https://img.geekhirusha.com/upload.php', {
        method: 'POST',
        body: formData,
      });
      
      const text = await response.text();
      let uploadedUrl = text;
      try {
        const json = JSON.parse(text);
        if (json.url) uploadedUrl = json.url;
        else if (json.fileUrl) uploadedUrl = json.fileUrl;
      } catch (e) {
        // plain text
      }
      
      setReceipts(prev => prev.map(r => r.id === id ? { ...r, fileUrl: uploadedUrl } : r));
      toast.success('Image uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload image');
      console.error(err);
    } finally {
      setIsUploading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleInputChange = (field: keyof ExpenseRecord, value: string) => {
    setFormData(prev => ({ ...prev, [field]: field === 'date' ? value : (Number(value) || 0) }));
  };

  const calculatedSpending = useMemo(() => {
    return (
      (formData.ice || 0) +
      (formData.fuel || 0) +
      (formData.mileage || 0) +
      (formData.food || 0) +
      (formData.otherOps || 0) +
      (formData.purchasingCenter || 0) +
      (formData.otherPurchasing || 0)
    );
  }, [formData]);

  const calculatedRemainder = useMemo(() => {
    const totalIncome = (formData.transfer1 || 0) + (formData.transfer2 || 0) + (formData.transfer3 || 0);
    return ((formData.capital || 0) + totalIncome) - calculatedSpending;
  }, [formData, calculatedSpending]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Mock API call
      await new Promise(r => setTimeout(r, 800));
      
      const newRecord: ExpenseRecord = {
        id: Math.random().toString(),
        date: formData.date || new Date().toISOString().split('T')[0],
        balance: formData.balance || 0,
        transfer1: formData.transfer1 || 0,
        transfer2: formData.transfer2 || 0,
        transfer3: formData.transfer3 || 0,
        iceQuantity: formData.iceQuantity || 0,
        ice: formData.ice || 0,
        fuel: formData.fuel || 0,
        mileage: formData.mileage || 0,
        food: formData.food || 0,
        otherOps: formData.otherOps || 0,
        purchasingKg: formData.purchasingKg || 0,
        purchasingCenter: formData.purchasingCenter || 0,
        otherPurchasing: formData.otherPurchasing || 0,
        capital: formData.capital || 0,
        spending: calculatedSpending,
        remainder: calculatedRemainder,
        receipts: receipts.map(r => ({ 
          id: r.id, 
          type: r.type, 
          category: r.category, 
          amount: r.amount, 
          fileUrl: r.fileUrl 
        })),
      };

      setRecords([newRecord, ...records]);
      setIsDialogOpen(false);
      setReceipts([]); // Clear receipts
      toast.success('Expense record added successfully.');
    } catch (e) {
      toast.error('Failed to save record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
            Center Expenses Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage field office income, operations, purchasing, and budget.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-border/50 shadow-sm font-medium hidden sm:flex">
                <Download className="mr-2 h-4 w-4 text-primary" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => exportToCSV(records, 'Center_Expenses')}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Export as Excel / CSV</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.promise(exportToPDF('center-expenses-report', 'Center_Expenses'), { loading: 'Generating PDF...', success: 'PDF Exported!', error: 'Failed to export PDF' })}>
                <FileText className="mr-2 h-4 w-4 text-rose-600" />
                <span>Export as PDF</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.promise(captureAsImage('center-expenses-report', 'Center_Expenses', false), { loading: 'Generating Image...', success: 'Image Exported!', error: 'Failed to export image' })}>
                <ImageIcon className="mr-2 h-4 w-4 text-blue-600" />
                <span>Download as Image</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.promise(captureAsImage('center-expenses-report', 'Center_Expenses', true), { loading: 'Preparing WhatsApp Share...', success: 'Ready to share!', error: 'Failed to prepare share' })}>
                <Share2 className="mr-2 h-4 w-4 text-green-600" />
                <span>Share via WhatsApp</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setIsDialogOpen(true)} className="gradient-water text-white shadow-lg font-bold">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Card id="center-expenses-report" className="border-none shadow-elevated bg-card/65 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-muted/10 border-b border-border/40">
          <CardTitle>Daily Expense Sheet</CardTitle>
          <CardDescription>Comprehensive view of center budgets and expenditures.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="whitespace-nowrap">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead rowSpan={2} className="border-r font-bold align-middle">Date</TableHead>
                <TableHead rowSpan={2} className="border-r font-bold align-middle">Balance</TableHead>
                <TableHead colSpan={3} className="border-r text-center font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400">Center Income</TableHead>
                <TableHead rowSpan={2} className="border-r font-bold align-middle text-center bg-rose-500/10 text-rose-700 dark:text-rose-400">Ice Quantity</TableHead>
                <TableHead colSpan={5} className="border-r text-center font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">Center Operations</TableHead>
                <TableHead colSpan={3} className="border-r text-center font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400">Purchasing</TableHead>
                <TableHead colSpan={3} className="text-center font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Center Budget</TableHead>
              </TableRow>
              <TableRow className="text-xs">
                {/* Income */}
                <TableHead className="font-semibold bg-blue-500/5">Transfer 1</TableHead>
                <TableHead className="font-semibold bg-blue-500/5">Transfer 2</TableHead>
                <TableHead className="border-r font-semibold bg-blue-500/5">Transfer 3</TableHead>
                {/* Operations */}
                <TableHead className="font-semibold bg-amber-500/5">Ice</TableHead>
                <TableHead className="font-semibold bg-amber-500/5">Fuel</TableHead>
                <TableHead className="font-semibold bg-amber-500/5">DAF 1779</TableHead>
                <TableHead className="font-semibold bg-amber-500/5">Food</TableHead>
                <TableHead className="border-r font-semibold bg-amber-500/5">Other</TableHead>
                {/* Purchasing */}
                <TableHead className="font-semibold bg-rose-500/5">KG</TableHead>
                <TableHead className="font-semibold bg-rose-500/5">Center</TableHead>
                <TableHead className="border-r font-semibold bg-rose-500/5">Other</TableHead>
                {/* Budget */}
                <TableHead className="font-semibold bg-emerald-500/5">Capital</TableHead>
                <TableHead className="font-semibold bg-emerald-500/5 text-destructive">Spending</TableHead>
                <TableHead className="font-bold bg-emerald-500/5">Remainder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(record => (
                <TableRow key={record.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="border-r font-medium">{record.date}</TableCell>
                  <TableCell className="border-r text-right">{record.balance.toLocaleString()}</TableCell>
                  <TableCell className="text-right bg-blue-500/5">{record.transfer1.toLocaleString()}</TableCell>
                  <TableCell className="text-right bg-blue-500/5">{record.transfer2.toLocaleString()}</TableCell>
                  <TableCell className="border-r text-right bg-blue-500/5">{record.transfer3.toLocaleString()}</TableCell>
                  <TableCell className="border-r text-center font-bold bg-rose-500/5">{record.iceQuantity}</TableCell>
                  <TableCell className="text-right bg-amber-500/5">{record.ice.toLocaleString()}</TableCell>
                  <TableCell className="text-right bg-amber-500/5">{record.fuel.toLocaleString()}</TableCell>
                  <TableCell className="text-right bg-amber-500/5">{record.mileage.toLocaleString()}</TableCell>
                  <TableCell className="text-right bg-amber-500/5">{record.food.toLocaleString()}</TableCell>
                  <TableCell className="border-r text-right bg-amber-500/5">{record.otherOps.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-bold bg-rose-500/5">{record.purchasingKg}</TableCell>
                  <TableCell className="text-right bg-rose-500/5">{record.purchasingCenter.toLocaleString()}</TableCell>
                  <TableCell className="border-r text-right bg-rose-500/5">{record.otherPurchasing.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold bg-emerald-500/5">{record.capital.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-destructive bg-emerald-500/5">{record.spending.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-emerald-600 bg-emerald-500/5">{record.remainder.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Submitted Bills & Receipts Viewer */}
      <Card className="border-none shadow-elevated bg-card/65 backdrop-blur-sm">
        <CardHeader className="bg-muted/10 border-b border-border/40">
          <CardTitle>Submitted Bills & Receipts</CardTitle>
          <CardDescription>View all uploaded bills and receipts attached to expense records.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {records.flatMap(record => 
              (record.receipts || []).map(receipt => (
                <Card key={receipt.id} className="overflow-hidden shadow-sm border-border/50 hover:shadow-md transition-shadow">
                  <div className="aspect-[4/3] bg-muted/30 relative group">
                    {receipt.fileUrl ? (
                      <a href={receipt.fileUrl} target="_blank" rel="noreferrer" className="block w-full h-full">
                        <img 
                          src={receipt.fileUrl} 
                          alt={receipt.category} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                      </a>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                        <FileSpreadsheet className="h-10 w-10 mb-2 opacity-20" />
                        <span className="text-sm font-medium">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Badge className={receipt.type === 'Bill' ? 'bg-primary' : 'bg-accent'}>
                        {receipt.type}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-foreground">{receipt.category}</p>
                        <p className="text-xs text-muted-foreground">Date: {record.date}</p>
                      </div>
                      <p className="font-bold text-primary">LKR {receipt.amount.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {records.every(r => !r.receipts || r.receipts.length === 0) && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground bg-muted/5 rounded-xl border border-dashed border-border/50">
                <Inbox className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">No bills or receipts submitted yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl">
          <div className="bg-primary p-6 text-primary-foreground">
            <DialogTitle className="text-2xl font-display font-bold">Add Expense Record</DialogTitle>
            <DialogDescription className="text-primary-foreground/80 mt-1">
              Enter the daily values for center income, operations, and purchasing.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                <Input type="date" value={formData.date as string} onChange={(e) => handleInputChange('date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</Label>
                <Input type="number" value={formData.balance} onChange={(e) => handleInputChange('balance', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Income */}
              <div className="border rounded-xl p-4 bg-blue-500/5 border-blue-500/20 space-y-4">
                <h4 className="font-bold text-blue-700 dark:text-blue-400 border-b border-blue-500/20 pb-2">Center Income</h4>
                <div className="space-y-2"><Label>Transfer 1</Label><Input type="number" value={formData.transfer1} onChange={(e) => handleInputChange('transfer1', e.target.value)} /></div>
                <div className="space-y-2"><Label>Transfer 2</Label><Input type="number" value={formData.transfer2} onChange={(e) => handleInputChange('transfer2', e.target.value)} /></div>
                <div className="space-y-2"><Label>Transfer 3</Label><Input type="number" value={formData.transfer3} onChange={(e) => handleInputChange('transfer3', e.target.value)} /></div>
              </div>

              {/* Operations */}
              <div className="border rounded-xl p-4 bg-amber-500/5 border-amber-500/20 space-y-4">
                <h4 className="font-bold text-amber-700 dark:text-amber-400 border-b border-amber-500/20 pb-2">Operations</h4>
                <div className="space-y-2"><Label>Ice Qty</Label><Input type="number" value={formData.iceQuantity} onChange={(e) => handleInputChange('iceQuantity', e.target.value)} /></div>
                <div className="space-y-2"><Label>Ice Exp</Label><Input type="number" value={formData.ice} onChange={(e) => handleInputChange('ice', e.target.value)} /></div>
                <div className="space-y-2"><Label>Fuel</Label><Input type="number" value={formData.fuel} onChange={(e) => handleInputChange('fuel', e.target.value)} /></div>
                <div className="space-y-2"><Label>DAF 1779</Label><Input type="number" value={formData.mileage} onChange={(e) => handleInputChange('mileage', e.target.value)} /></div>
                <div className="space-y-2"><Label>Food</Label><Input type="number" value={formData.food} onChange={(e) => handleInputChange('food', e.target.value)} /></div>
                <div className="space-y-2"><Label>Other</Label><Input type="number" value={formData.otherOps} onChange={(e) => handleInputChange('otherOps', e.target.value)} /></div>
              </div>

              {/* Purchasing */}
              <div className="border rounded-xl p-4 bg-rose-500/5 border-rose-500/20 space-y-4">
                <h4 className="font-bold text-rose-700 dark:text-rose-400 border-b border-rose-500/20 pb-2">Purchasing</h4>
                <div className="space-y-2"><Label>Purchasing KG</Label><Input type="number" value={formData.purchasingKg} onChange={(e) => handleInputChange('purchasingKg', e.target.value)} /></div>
                <div className="space-y-2"><Label>Center</Label><Input type="number" value={formData.purchasingCenter} onChange={(e) => handleInputChange('purchasingCenter', e.target.value)} /></div>
                <div className="space-y-2"><Label>Other</Label><Input type="number" value={formData.otherPurchasing} onChange={(e) => handleInputChange('otherPurchasing', e.target.value)} /></div>
              </div>

              {/* Budget & Totals */}
              <div className="border rounded-xl p-4 bg-emerald-500/5 border-emerald-500/20 space-y-4">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/20 pb-2">Center Budget</h4>
                <div className="space-y-2"><Label>Capital</Label><Input type="number" value={formData.capital} onChange={(e) => handleInputChange('capital', e.target.value)} /></div>
                
                <div className="mt-8 p-4 bg-background border rounded-xl space-y-3 shadow-inner">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-muted-foreground">Spending</span>
                    <span className="font-mono text-destructive font-bold">{calculatedSpending.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t pt-2">
                    <span className="font-bold text-muted-foreground">Remainder</span>
                    <span className="font-mono text-emerald-600 font-bold text-lg">{calculatedRemainder.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expense Bills & Receipts */}
              <div className="md:col-span-4 border rounded-xl p-4 bg-slate-50/50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300">Expense Bills & Receipts</h4>
                  <Button variant="outline" size="sm" onClick={handleAddReceipt} className="h-8 text-xs font-bold border-2">
                    <Plus className="h-3 w-3 mr-1" /> Add Bill
                  </Button>
                </div>
                
                {receipts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-background rounded-lg border-2 border-dashed">
                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No bills added yet</p>
                    <p className="text-xs">Add receipts for Ice, Food, Rent, Electricity, Service Bills etc.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {receipts.map((receipt) => (
                      <div key={receipt.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-background p-3 rounded-lg border-2 shadow-sm">
                        <div className="w-full sm:w-[20%]">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Type</Label>
                          <select 
                            className="flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            value={receipt.type || 'Bill'}
                            onChange={(e) => handleReceiptChange(receipt.id, 'type', e.target.value)}
                          >
                            <option value="Bill">Bill</option>
                            <option value="Receipt">Receipt</option>
                          </select>
                        </div>
                        <div className="w-full sm:w-[25%]">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Category</Label>
                          <select 
                            className="flex h-10 w-full rounded-md border-2 border-input bg-background px-3 py-2 text-sm font-bold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            value={receipt.category}
                            onChange={(e) => handleReceiptChange(receipt.id, 'category', e.target.value)}
                          >
                            <option value="Ice">Ice</option>
                            <option value="Service Bill">Service Bill</option>
                            <option value="Food">Food</option>
                            <option value="Rent">Rent</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="w-full sm:w-[20%]">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Amount</Label>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            className="font-bold border-2"
                            value={receipt.amount || ''}
                            onChange={(e) => handleReceiptChange(receipt.id, 'amount', Number(e.target.value))}
                          />
                        </div>
                        <div className="w-full sm:w-[35%] flex items-end gap-2">
                          <div className="flex-1">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Photo</Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-10 border-2 bg-muted/50 hover:bg-muted transition-colors text-sm font-bold"
                                onClick={() => setCameraOpenFor(receipt.id)}
                                disabled={isUploading[receipt.id]}
                              >
                                {isUploading[receipt.id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                                {isUploading[receipt.id] ? 'Uploading...' : receipt.preview ? 'Retake' : 'Camera'}
                              </Button>
                              {receipt.preview && (
                                <div className="h-10 w-10 shrink-0 border-2 rounded overflow-hidden relative">
                                  <img src={receipt.preview} alt="Receipt" className="h-full w-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveReceipt(receipt.id)} className="h-10 w-10 border-2 text-destructive hover:bg-destructive/10 shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving} className="gradient-water text-white font-bold px-8">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraCapture 
        open={!!cameraOpenFor} 
        onClose={() => setCameraOpenFor(null)} 
        onCapture={(blob, previewUrl) => {
          if (cameraOpenFor) handleCapture(cameraOpenFor, blob, previewUrl);
        }}
      />
    </div>
  );
}
