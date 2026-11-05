import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Printer, Calendar, BarChart3, Filter, ArrowLeft } from 'lucide-react';
import { useAssociationBills } from '@/hooks/useAssociationBills';
import { useEmployees } from '@/hooks/useEmployees';
import { useReservoirs } from '@/hooks/useReservoirs';
import { useLocations } from '@/hooks/useLocations';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function HarvestDetailsReportPage() {
    const navigate = useNavigate();
    const [reportType, setReportType] = useState<ReportType>('daily');
    const [fieldOfficerId, setFieldOfficerId] = useState<string>('all');
    const [centerManagerId, setCenterManagerId] = useState<string>('all');
    const [reservoirId, setReservoirId] = useState<string>('all');
    const [locationId, setLocationId] = useState<string>('all');
    const [searchBillNo, setSearchBillNo] = useState<string>('');
    const [startDate, setStartDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
    const [endDate, setEndDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

    const { data: bills, isLoading: billsLoading } = useAssociationBills();
    const { data: employees } = useEmployees();
    const { data: reservoirs } = useReservoirs();
    const { data: locations } = useLocations();

    const centerManagers = useMemo(() => {
        if (!employees) return [];
        const managers = employees.filter((e: any) => e.role === 'super_admin' || e.role === 'manager' || (Array.isArray(e.assigned_locations) && e.assigned_locations.length > 0));
        return managers.length > 0 ? managers : employees;
    }, [employees]);

    // Filter bills matching selected parameters
    const filteredBills = useMemo(() => {
        if (!bills) return [];

        return bills.filter((bill: any) => {
            const billDateStr = bill.bill_date.split('T')[0];
            const startStr = startDate.split('T')[0];
            const endStr = endDate.split('T')[0];

            const itemDate = new Date(billDateStr);
            const filterStartDate = new Date(startStr);
            const filterEndDate = new Date(endStr);

            itemDate.setHours(0, 0, 0, 0);
            filterStartDate.setHours(0, 0, 0, 0);
            filterEndDate.setHours(0, 0, 0, 0);

            let dateMatch = false;
            if (reportType === 'daily') {
                dateMatch = itemDate >= filterStartDate && itemDate <= filterEndDate;
            } else if (reportType === 'weekly') {
                const dayOfWeek = filterStartDate.getDay();
                const startOfWeek = new Date(filterStartDate);
                startOfWeek.setDate(filterStartDate.getDate() - dayOfWeek);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                dateMatch = itemDate >= startOfWeek && itemDate <= endOfWeek;
            } else if (reportType === 'monthly') {
                dateMatch = itemDate.getMonth() === filterStartDate.getMonth() && itemDate.getFullYear() === filterStartDate.getFullYear();
            } else if (reportType === 'yearly') {
                dateMatch = itemDate.getFullYear() === filterStartDate.getFullYear();
            }

            const officerMatch = fieldOfficerId === 'all' || bill.field_officer_employee_id === fieldOfficerId;
            const managerMatch = centerManagerId === 'all' || 
                bill.reviewed_by === centerManagerId || 
                employees?.find((e: any) => e.id === centerManagerId)?.user_id === bill.reviewed_by ||
                bill.field_officer_employee_id === centerManagerId;

            const reservoir = reservoirs?.find((r: any) => r.id === bill.reservoir_id);
            const reservoirMatch = reservoirId === 'all' || bill.reservoir_id === reservoirId;
            const locationMatch = locationId === 'all' || reservoir?.location_id === locationId;

            const billNoMatch = !searchBillNo || (bill.bill_no && bill.bill_no.toLowerCase().includes(searchBillNo.toLowerCase()));

            const isApproved = bill.status === 'approved';

            return isApproved && dateMatch && officerMatch && managerMatch && reservoirMatch && locationMatch && billNoMatch;
        });
    }, [bills, reportType, startDate, endDate, fieldOfficerId, centerManagerId, reservoirId, locationId, searchBillNo, reservoirs, employees]);

    // Dynamic item columns present in current dataset (fallback to standard columns if empty)
    const itemColumns = useMemo(() => {
        const found = new Set<string>();
        filteredBills.forEach((bill: any) => {
            const items = Array.isArray(bill.items) ? bill.items : [];
            items.forEach((it: any) => {
                if (it.description) {
                    found.add(it.description.trim());
                }
            });
        });

        if (found.size === 0) {
            return ['250g up', '250g Below', 'Reject', 'Gal Isso'];
        }
        return Array.from(found);
    }, [filteredBills]);

    // Pivoted row data per bill matching Image 3 structure
    const reportRows = useMemo(() => {
        return filteredBills.map((bill: any) => {
            const items = Array.isArray(bill.items) ? bill.items : [];
            const itemQtys: Record<string, number> = {};
            let totalKg = 0;
            let totalAmount = 0;

            items.forEach((it: any) => {
                const desc = (it.description || '').trim();
                const qty = Number(it.qty) || 0;
                const amt = Number(it.line_total || (qty * Number(it.unit_price || 0))) || 0;
                itemQtys[desc] = (itemQtys[desc] || 0) + qty;
                totalKg += qty;
                totalAmount += amt;
            });

            return {
                id: bill.id,
                date: bill.bill_date.split('T')[0],
                reservoir_name: bill.reservoirs?.name || '—',
                collector: bill.supplier_name || bill.purchaser_name || '—',
                field_officer: bill.employees?.full_name || '—',
                box_no: bill.box_number || '—',
                tag_no: bill.sealing_tag_number || '—',
                bill_no: bill.bill_no || '—',
                itemQtys,
                total_kg: totalKg,
                total_amount: totalAmount,
            };
        });
    }, [filteredBills]);

    // Totals per item column and grand totals
    const columnTotals = useMemo(() => {
        const itemTotals: Record<string, number> = {};
        let grandTotalKg = 0;
        let grandTotalAmount = 0;

        reportRows.forEach((row) => {
            itemColumns.forEach((col) => {
                itemTotals[col] = (itemTotals[col] || 0) + (row.itemQtys[col] || 0);
            });
            grandTotalKg += row.total_kg;
            grandTotalAmount += row.total_amount;
        });

        return { itemTotals, grandTotalKg, grandTotalAmount };
    }, [reportRows, itemColumns]);

    const boxTagSummary = useMemo(() => {
        const boxes = new Set<string>();
        const tags = new Set<string>();
        reportRows.forEach((row) => {
            if (row.box_no && row.box_no !== '—') {
                row.box_no.split(',').forEach((b: string) => {
                    const trimmed = b.trim();
                    if (trimmed) boxes.add(trimmed);
                });
            }
            if (row.tag_no && row.tag_no !== '—') {
                row.tag_no.split(',').forEach((t: string) => {
                    const trimmed = t.trim();
                    if (trimmed) tags.add(trimmed);
                });
            }
        });
        const boxList = Array.from(boxes);
        const tagList = Array.from(tags);
        return {
            numberOfBoxes: boxList.length,
            boxNumbersStr: boxList.join(', '),
            tagNumbersStr: tagList.join(', ')
        };
    }, [reportRows]);

    const selectedCenterName = useMemo(() => {
        if (locationId === 'all') return null;
        return locations?.find((l: any) => l.id === locationId)?.name || null;
    }, [locationId, locations]);

    const handlePrint = () => {
        window.print();
    };

    const getReportTitle = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        switch (reportType) {
            case 'daily': 
                return startDate === endDate 
                    ? `Daily Report - ${start.toLocaleDateString()}` 
                    : `Report - ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
            case 'weekly': return `Weekly Report - Week of ${start.toLocaleDateString()}`;
            case 'monthly': return `Monthly Report - ${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`;
            case 'yearly': return `Yearly Report - ${start.getFullYear()}`;
            default: return 'Harvest Report';
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-2 print:hidden">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground px-0">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Harvest Details Report</h1>
                    <p className="text-muted-foreground">View and export structured harvest summaries</p>
                </div>
                <Button onClick={handlePrint} className="gradient-water">
                    <Printer className="h-4 w-4 mr-2" />
                    Print / Save PDF
                </Button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 mb-8 print:hidden">
                <div className="flex-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base">Report Filters</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                                <div className="space-y-2">
                                    <Label>Report Type</Label>
                                    <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                                        <TabsList className="grid grid-cols-2 h-auto p-1">
                                            <TabsTrigger value="daily" className="text-[10px] py-1">Daily</TabsTrigger>
                                            <TabsTrigger value="weekly" className="text-[10px] py-1">Weekly</TabsTrigger>
                                            <TabsTrigger value="monthly" className="text-[10px] py-1">Monthly</TabsTrigger>
                                            <TabsTrigger value="yearly" className="text-[10px] py-1">Yearly</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>

                                <div className="space-y-2">
                                    <Label>Start Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>End Date</Label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
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
                                                <SelectItem key={l.id} value={l.id?.toString()}>{l.name}</SelectItem>
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
                                            {reservoirs?.filter((r: any) => locationId === 'all' || r.location_id === locationId).map((r: any) => (
                                                <SelectItem key={r.id} value={r.id?.toString()}>{r.name}</SelectItem>
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
                                                <SelectItem key={e.id} value={e.id?.toString()}>{e.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4">
                                <div className="space-y-2 w-full max-w-[250px]">
                                    <Label>Center Manager</Label>
                                    <Select value={centerManagerId} onValueChange={setCenterManagerId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Managers" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Managers</SelectItem>
                                            {centerManagers?.map((m: any) => (
                                                <SelectItem key={m.id} value={m.id?.toString()}>{m.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 w-full max-w-[250px]">
                                    <Label>Bill No (Optional)</Label>
                                    <input
                                        type="text"
                                        placeholder="Search bill no..."
                                        value={searchBillNo}
                                        onChange={(e) => setSearchBillNo(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="w-full lg:w-80 print:hidden">
                    <Card className="h-full">
                        <CardHeader className="pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base">Summary</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-3">
                                {itemColumns.map((col) => (
                                    <div key={col} className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">{col}</span>
                                        <span>{(columnTotals.itemTotals[col] || 0).toFixed(3)} kg</span>
                                    </div>
                                ))}

                                <div className="flex flex-col gap-2 pt-2 border-t mt-2">
                                    <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                                        <span className="text-muted-foreground">Total Boxes</span>
                                        <span>{boxTagSummary.numberOfBoxes}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm font-bold">
                                        <span className="text-muted-foreground">Total Qty</span>
                                        <span>{columnTotals.grandTotalKg.toFixed(3)} kg</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm font-bold text-primary">
                                        <span className="text-muted-foreground">Total Amount</span>
                                        <span>Rs. {columnTotals.grandTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Excel Sheet Restructured View */}
            <div id="report-printable" className="bg-white p-6 rounded-lg shadow-sm border border-border print:shadow-none print:border-none print:p-0">
                {/* Red/Coral Banner Header */}
                <div className="bg-[#d96b63] text-white py-2.5 px-4 text-center font-bold text-lg rounded-t-md border-b-2 border-black">
                    {selectedCenterName || 'Harvest Details Report'}
                </div>

                <header className="flex flex-col items-center py-4 bg-slate-50 border-b border-black text-center mb-4">
                    <h2 className="text-xl font-bold uppercase tracking-wide">HARVEST DETAILS REPORT</h2>
                    <p className="text-sm font-semibold text-slate-700 mt-1">{getReportTitle()}</p>
                </header>

                {billsLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : reportRows.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-lg">
                        No harvest data found for the selected criteria.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-black text-[11px]">
                            <thead>
                                <tr className="bg-[#e08982] text-black font-bold">
                                    <th className="border border-black p-1.5 text-left">Date</th>
                                    <th className="border border-black p-1.5 text-left">Reservoir</th>
                                    <th className="border border-black p-1.5 text-left">Collector</th>
                                    <th className="border border-black p-1.5 text-left">Field officer</th>
                                    <th className="border border-black p-1.5 text-left">Bill No</th>
                                    {itemColumns.map((col) => (
                                        <th key={col} className="border border-black p-1.5 text-right">{col}</th>
                                    ))}
                                    <th className="border border-black p-1.5 text-right bg-[#d96b63] text-white">Total kg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportRows.map((row: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="border border-black p-1.5 font-medium">{row.date}</td>
                                        <td className="border border-black p-1.5">{row.reservoir_name}</td>
                                        <td className="border border-black p-1.5">{row.collector}</td>
                                        <td className="border border-black p-1.5">{row.field_officer}</td>
                                        <td className="border border-black p-1.5 font-mono">{row.bill_no}</td>
                                        {itemColumns.map((col) => (
                                            <td key={col} className="border border-black p-1.5 text-right">
                                                {(row.itemQtys[col] || 0).toFixed(3)}
                                            </td>
                                        ))}
                                        <td className="border border-black p-1.5 text-right font-bold bg-slate-50">
                                            {row.total_kg.toFixed(3)}
                                        </td>
                                    </tr>
                                ))}
                                {/* Bottom Totals Row matching Excel Image 3 red footer bar */}
                                <tr className="font-bold bg-[#e08982] text-black">
                                    <td colSpan={5} className="border border-black p-1.5 text-right font-extrabold uppercase tracking-wider">Totals</td>
                                    {itemColumns.map((col) => (
                                        <td key={col} className="border border-black p-1.5 text-right font-bold">
                                            {(columnTotals.itemTotals[col] || 0).toFixed(3)}
                                        </td>
                                    ))}
                                    <td className="border border-black p-1.5 text-right font-black bg-[#c95b53] text-white text-xs">
                                        {columnTotals.grandTotalKg.toFixed(3)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Box Numbers & Sealing Tag Numbers Summary Box above Signatures */}
                <div className="mt-6 mb-4 p-4 bg-slate-50 border border-black rounded text-xs space-y-2 font-medium">
                    <div className="flex items-center gap-2">
                        <span className="font-bold min-w-[140px]">1) Number of boxes:</span>
                        <span className="font-semibold text-slate-900">{boxTagSummary.numberOfBoxes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold min-w-[140px]">2) Box numbers:</span>
                        <span className="font-mono text-slate-900">{boxTagSummary.boxNumbersStr || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold min-w-[140px]">3) Tag numbers:</span>
                        <span className="font-mono text-slate-900">{boxTagSummary.tagNumbersStr || '—'}</span>
                    </div>
                </div>

                <footer className="mt-10 grid grid-cols-2 gap-20 print:grid">
                    <div className="text-center">
                        <div className="border-t border-black border-dotted pt-1 mt-8 text-xs font-semibold">Field Officer Signature</div>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-black border-dotted pt-1 mt-8 text-xs font-semibold">Manager Signature</div>
                    </div>
                </footer>
            </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          /* We rely on tailwind print:hidden classes added to layout */
          #report-printable {
            width: 100%;
            display: block !important;
          }
          .animate-fade-in {
            animation: none !important;
          }
        }
      `}</style>
        </div>
    );
}
