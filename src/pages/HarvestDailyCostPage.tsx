import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Printer, Calendar, BarChart3, Filter, Search, FileDown } from 'lucide-react';
import { useAssociationBills } from '@/hooks/useAssociationBills';
import { useEmployees } from '@/hooks/useEmployees';
import { useReservoirs } from '@/hooks/useReservoirs';
import { useLocations } from '@/hooks/useLocations';
import { cn } from '@/lib/utils';

export default function HarvestDailyCostPage() {
    const [startDate, setStartDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
    const [endDate, setEndDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
    const [fieldOfficerId, setFieldOfficerId] = useState<string>('all');
    const [centerManagerId, setCenterManagerId] = useState<string>('all');
    const [locationId, setLocationId] = useState<string>('all');
    const [reservoirId, setReservoirId] = useState<string>('all');
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const { data: bills, isLoading: billsLoading } = useAssociationBills();
    const { data: employees } = useEmployees();
    const { data: reservoirs } = useReservoirs();
    const { data: locations } = useLocations();

    const centerManagers = useMemo(() => {
        if (!employees) return [];
        const managers = employees.filter((e: any) => e.role === 'super_admin' || e.role === 'manager' || (Array.isArray(e.assigned_locations) && e.assigned_locations.length > 0));
        return managers.length > 0 ? managers : employees;
    }, [employees]);

    const reportData = useMemo(() => {
        if (!bills) return [];

        const filteredBills = bills.filter((bill: any) => {
            const billDate = new Date(bill.bill_date.split('T')[0]);
            const start = new Date(startDate);
            const end = new Date(endDate);

            billDate.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            const isApproved = bill.status === 'approved';
            const dateMatch = billDate >= start && billDate <= end;
            const officerMatch = fieldOfficerId === 'all' || bill.field_officer_employee_id === fieldOfficerId;
            const managerMatch = centerManagerId === 'all' ||
                bill.reviewed_by === centerManagerId ||
                employees?.find((e: any) => e.id === centerManagerId)?.user_id === bill.reviewed_by ||
                bill.field_officer_employee_id === centerManagerId;

            const reservoir = reservoirs?.find((r: any) => r.id === bill.reservoir_id);
            const locationMatch = locationId === 'all' || reservoir?.location_id === locationId;
            const resMatch = reservoirId === 'all' || bill.reservoir_id === reservoirId;

            return isApproved && dateMatch && officerMatch && managerMatch && locationMatch && resMatch;
        });

        return filteredBills.map((bill: any) => {
            const items = Array.isArray(bill.items) ? bill.items : [];
            const pivotedItems: Record<string, number> = {
                '250 Up': 0,
                '250 Below': 0,
                'Grade B': 0,
                'Gal Isso': 0,
                'Live Freshwater Prawn': 0,
                'Other': 0
            };

            let totalKg = 0;
            items.forEach((item: any) => {
                const desc = (item.description || '').trim();
                const qty = Number(item.qty) || 0;

                // Robust matching to handle both legacy and new master grades
                const descLower = desc.toLowerCase();
                if (descLower.includes('250 up') || descLower.includes('250g up') || descLower.includes('1250g')) {
                    pivotedItems['250 Up'] += qty;
                } else if (descLower.includes('250 below') || descLower.includes('250g below')) {
                    pivotedItems['250 Below'] += qty;
                } else if (descLower.includes('reject') || descLower.includes('grade b')) {
                    pivotedItems['Grade B'] += qty;
                } else if (descLower.includes('gal isso') || descLower.includes('galisso')) {
                    pivotedItems['Gal Isso'] += qty;
                } else if (descLower.includes('live')) {
                    pivotedItems['Live Freshwater Prawn'] += qty;
                } else {
                    pivotedItems['Other'] += qty;
                }

                totalKg += qty;
            });

            return {
                id: bill.id,
                date: bill.bill_date.split('T')[0],
                reservoir_name: bill.reservoirs?.name || '—',
                collector: bill.supplier_name || '—',
                field_officer: bill.employees?.full_name || '—',
                box_no: bill.box_number || '—',
                tag_no: bill.sealing_tag_number || '—',
                bill_no: bill.bill_no || '—',
                ...pivotedItems,
                total_kg: totalKg,
                amount: Number(bill.total) || 0
            };
        });
    }, [bills, startDate, endDate, fieldOfficerId, centerManagerId, locationId, reservoirs, employees]);

    const totals = useMemo(() => {
        const res = {
            '250 Up': 0,
            '250 Below': 0,
            'Grade B': 0,
            'Gal Isso': 0,
            'Live Freshwater Prawn': 0,
            'Other': 0,
            totalQty: 0,
            totalAmount: 0
        };

        reportData.forEach((row: any) => {
            res['250 Up'] += row['250 Up'] || 0;
            res['250 Below'] += row['250 Below'] || 0;
            res['Grade B'] += row['Grade B'] || 0;
            res['Gal Isso'] += row['Gal Isso'] || 0;
            res['Live Freshwater Prawn'] += row['Live Freshwater Prawn'] || 0;
            res['Other'] += row['Other'] || 0;
            res.totalQty += row.total_kg;
            res.totalAmount += row.amount;
        });
        return res;
    }, [reportData]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Daily Harvest and Cost</h1>
                    <p className="text-muted-foreground">Comprehensive report of daily harvest items and costs</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPreviewMode(!isPreviewMode)}>
                        {isPreviewMode ? <Filter className="h-4 w-4 mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                        {isPreviewMode ? "Edit Filters" : "Preview Summary"}
                    </Button>
                </div>
            </div>

            <div className={cn("grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 print:hidden", isPreviewMode && "lg:grid-cols-1")}>
                {!isPreviewMode && (
                    <Card className="lg:col-span-3">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base">Report Filters</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Location (Center)</Label>
                                    <Select value={locationId} onValueChange={setLocationId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Centers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Centers</SelectItem>
                                            {locations?.map((l: any) => (
                                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Field Officer</Label>
                                    <Select value={fieldOfficerId} onValueChange={setFieldOfficerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Officers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Officers</SelectItem>
                                            {employees?.map((e: any) => (
                                                <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Reservoir</Label>
                                    <Select value={reservoirId} onValueChange={setReservoirId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Reservoirs" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Reservoirs</SelectItem>
                                            {reservoirs?.map((r: any) => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Center Manager</Label>
                                    <Select value={centerManagerId} onValueChange={setCenterManagerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Managers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Managers</SelectItem>
                                            {centerManagers?.map((m: any) => (
                                                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className={cn(isPreviewMode ? "w-full" : "w-full", "print:hidden")}>
                    <CardHeader className="pb-3 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Summary Preview</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">250g Up</span>
                                    <span className="font-medium">{totals['250 Up'].toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">250g below</span>
                                    <span className="font-medium">{totals['250 Below'].toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Grade B / Reject</span>
                                    <span className="font-medium">{totals['Grade B'].toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Gal isso</span>
                                    <span className="font-medium">{totals['Gal Isso'].toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Live FW Prawn</span>
                                    <span className="font-medium">{totals['Live Freshwater Prawn'].toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Other</span>
                                    <span className="font-medium">{totals['Other'].toFixed(3)} kg</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-border/50 space-y-2">
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Total Qty</span>
                                    <span>{totals.totalQty.toFixed(3)} kg</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold text-primary">
                                    <span>Total Amount</span>
                                    <span>Rs. {totals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div id="report-printable" className="bg-white p-6 rounded-lg shadow-sm border border-border print:shadow-none print:border-none print:p-0">
                <header className="flex flex-col items-center mb-8 border-b-2 border-black pb-4 text-center relative">
                    <div className="absolute top-0 right-0 print:hidden">
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            size="sm"
                            className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary transition-all duration-200"
                        >
                            <FileDown className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                    <h2 className="text-2xl font-bold uppercase">Daily Harvest and Cost</h2>
                    <div className="flex gap-4 mt-2 text-sm font-semibold">
                        <span>Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</span>
                    </div>
                </header>

                {billsLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                        No harvest data found for the selected criteria.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-black text-[10px]">
                                <thead>
                                    <tr className="bg-slate-50 print:bg-transparent">
                                        <th className="border border-black p-1 text-left">Date</th>
                                        <th className="border border-black p-1 text-left">Reservoir</th>
                                        <th className="border border-black p-1 text-left">Collector</th>
                                        <th className="border border-black p-1 text-left">Field Officer</th>
                                        <th className="border border-black p-1 text-left">Box No</th>
                                        <th className="border border-black p-1 text-left">Sealing Tag No</th>
                                        <th className="border border-black p-1 text-left">Bill No</th>
                                        <th className="border border-black p-1 text-right">250g Up</th>
                                        <th className="border border-black p-1 text-right">250g below</th>
                                        <th className="border border-black p-1 text-right">Grade B / Reject</th>
                                        <th className="border border-black p-1 text-right">Gal isso</th>
                                        <th className="border border-black p-1 text-right">Live FW Prawn</th>
                                        <th className="border border-black p-1 text-right">Other</th>
                                        <th className="border border-black p-1 text-right bg-slate-100 font-bold">Total KG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((row: any, idx: number) => (
                                        <tr key={idx}>
                                            <td className="border border-black p-1">{row.date}</td>
                                            <td className="border border-black p-1">{row.reservoir_name}</td>
                                            <td className="border border-black p-1">{row.collector}</td>
                                            <td className="border border-black p-1">{row.field_officer}</td>
                                            <td className="border border-black p-1">{row.box_no}</td>
                                            <td className="border border-black p-1">{row.tag_no}</td>
                                            <td className="border border-black p-1">{row.bill_no}</td>
                                            <td className="border border-black p-1 text-right">{row['250 Up'].toFixed(3)}</td>
                                            <td className="border border-black p-1 text-right">{row['250 Below'].toFixed(3)}</td>
                                            <td className="border border-black p-1 text-right">{row['Grade B'].toFixed(3)}</td>
                                            <td className="border border-black p-1 text-right">{row['Gal Isso'].toFixed(3)}</td>
                                            <td className="border border-black p-1 text-right">{row['Live Freshwater Prawn'].toFixed(3)}</td>
                                            <td className="border border-black p-1 text-right">{row['Other'].toFixed(3)}</td>
                                            <td className="border border-black p-1 text-right font-bold bg-slate-50">{row.total_kg.toFixed(3)}</td>
                                        </tr>
                                    ))}
                                    <tr className="font-bold bg-slate-100 print:bg-transparent">
                                        <td colSpan={7} className="border border-black p-1 text-right">TOTALS</td>
                                        <td className="border border-black p-1 text-right">{totals['250 Up'].toFixed(3)}</td>
                                        <td className="border border-black p-1 text-right">{totals['250 Below'].toFixed(3)}</td>
                                        <td className="border border-black p-1 text-right">{totals['Grade B'].toFixed(3)}</td>
                                        <td className="border border-black p-1 text-right">{totals['Gal Isso'].toFixed(3)}</td>
                                        <td className="border border-black p-1 text-right">{totals['Live Freshwater Prawn'].toFixed(3)}</td>
                                        <td className="border border-black p-1 text-right">{totals['Other'].toFixed(3)}</td>
                                        <td className="border border-black p-1 text-right">{totals.totalQty.toFixed(3)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-12 hidden print:grid grid-cols-2 gap-20">
                            <div className="text-center">
                                <div className="border-t border-black border-dotted pt-1 mt-8 text-xs font-semibold">Field Officer Signature</div>
                            </div>
                            <div className="text-center">
                                <div className="border-t border-black border-dotted pt-1 mt-8 text-xs font-semibold">Manager Signature</div>
                            </div>
                        </div>

                        <div className="mt-8 hidden print:block text-[8px] text-muted-foreground text-right italic">
                            Report generated on: {new Date().toLocaleString()}
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 10mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #report-printable {
                        width: 100%;
                        display: block !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    table { 
                        font-size: 9pt; 
                        width: 100% !important;
                        border-collapse: collapse !important;
                    }
                    th, td { 
                        border: 1pt solid black !important;
                        padding: 4px !important; 
                    }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
