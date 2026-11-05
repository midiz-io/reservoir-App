import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReservoirs } from '@/hooks/useReservoirs';
import { Loader2, Droplets, ArrowUpRight, Activity, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter, ReferenceLine, ZAxis, Cell } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';  
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function ReservoirKPIsPage() {
  const [reservoirId, setReservoirId] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'rank', direction: 'asc' });

  const { data: reservoirs, isLoading: isLoadingReservoirs } = useReservoirs();

  const { data: bills, isLoading: isLoadingBills } = useQuery({
    queryKey: ['association-bills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('association_bills').select('*');
      if (error) throw error;
      return data;
    },
  });

  // generic KPIs will be calculated below
  const approvedBills = (bills || []).filter(b => b.status === 'approved');
  const filteredBills = reservoirId === 'all' 
    ? approvedBills 
    : approvedBills.filter(b => b.reservoir_id === reservoirId);

  let totalHarvest = 0;
  let totalRevenue = 0;
  const harvestTrendData: any[] = [];
  const mapData: Record<string, { qty: number; val: number }> = {};

  filteredBills?.forEach(bill => {
    const dateStr = bill.bill_date ? new Date(bill.bill_date).toLocaleDateString() : 'Unknown';
    if (!mapData[dateStr]) mapData[dateStr] = { qty: 0, val: 0 };
    
    let qty = 0;
    let items = bill.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch(e) { items = []; }
    }
    if (Array.isArray(items)) {
      items.forEach((it: any) => qty += Number(it.qty || 0));
    }
    
    mapData[dateStr].qty += qty;
    mapData[dateStr].val += Number(bill.total || 0);
    totalHarvest += qty;
    totalRevenue += Number(bill.total || 0);
  });

  Object.keys(mapData).forEach(key => {
    harvestTrendData.push({
      date: key,
      harvest: mapData[key].qty,
      revenue: mapData[key].val
    });
  });

  // Calculate per-reservoir stats for the Matrix & Table
  let reservoirStats = reservoirs?.map(r => {
    const resBills = bills?.filter(b => b.reservoir_id === r.id) || [];
    let totalKg = 0;
    let exportKg = 0;
    let rejectKg = 0;
    let galIssoKg = 0;
    let purchaseValue = 0;

    resBills.forEach(b => {
      purchaseValue += Number(b.total || 0);
      let items = b.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = []; }
      }
      if (Array.isArray(items)) {
        items.forEach((it: any) => {
          const q = Number(it.qty || 0);
          totalKg += q;
          const desc = String(it.description || it.itemName || '').toLowerCase();
          
          if (desc.includes('reject')) {
            rejectKg += q;
          } else if (desc.includes('gal isso') || desc.includes('galisso')) {
            galIssoKg += q;
          } else {
            // Assume anything else (e.g. 250g up) is Export-grade
            exportKg += q;
          }
        });
      }
    });

    const exportPercent = totalKg > 0 ? (exportKg / totalKg) * 100 : 0;
    const rejectPercent = totalKg > 0 ? (rejectKg / totalKg) * 100 : 0;
    const galIssoPercent = totalKg > 0 ? (galIssoKg / totalKg) * 100 : 0;

    return {
      id: r.id,
      name: r.name,
      totalKg,
      exportPercent,
      rejectPercent,
      galIssoPercent,
      purchaseValue
    };
  }).filter(r => r.totalKg > 0) || [];
  
  // Assign rank based on Total Kg
  reservoirStats.sort((a, b) => b.totalKg - a.totalKg);
  reservoirStats.forEach((r, idx) => {
    (r as any).rank = idx + 1;
  });

  // Calculate Averages for the 4-box grid
  const avgKg = reservoirStats.length > 0 ? reservoirStats.reduce((sum, r) => sum + r.totalKg, 0) / reservoirStats.length : 0;
  const avgExport = reservoirStats.length > 0 ? reservoirStats.reduce((sum, r) => sum + r.exportPercent, 0) / reservoirStats.length : 0;

  // Z-Score calculation for new Scatter Chart
  const calcMean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const calcStdDev = (arr: number[], mean: number) => {
    if (arr.length <= 1) return 1;
    const variance = arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
    return Math.sqrt(variance) || 1;
  };

  const purchaseValues = reservoirStats.map(r => r.purchaseValue);
  const exportPercents = reservoirStats.map(r => r.exportPercent);
  const meanRevenue = calcMean(purchaseValues);
  const stdDevRevenue = calcStdDev(purchaseValues, meanRevenue);
  const meanProfitability = calcMean(exportPercents);
  const stdDevProfitability = calcStdDev(exportPercents, meanProfitability);

  const statsWithZ = reservoirStats.map(r => ({
    ...r,
    revenueIndex: (r.purchaseValue - meanRevenue) / stdDevRevenue,
    profitabilityIndex: (r.exportPercent - meanProfitability) / stdDevProfitability
  }));

  let maxAbsZ = 1;
  statsWithZ.forEach(r => {
    if (Math.abs(r.revenueIndex) > maxAbsZ) maxAbsZ = Math.abs(r.revenueIndex);
    if (Math.abs(r.profitabilityIndex) > maxAbsZ) maxAbsZ = Math.abs(r.profitabilityIndex);
  });
  const domainLimit = Math.ceil(maxAbsZ) + 0.5;

  // Sorting logic for table
  const sortedStats = useMemo(() => {
    let sortableItems = [...reservoirStats];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = (a as any)[sortConfig.key];
        const bVal = (b as any)[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [reservoirStats, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getDotColorZ = (x: number, y: number) => {
    if (x >= 0 && y >= 0) return '#22c55e'; // Cash Cow (Green)
    if (x < 0 && y >= 0) return '#3b82f6';  // Low Impact (Blue)
    if (x >= 0 && y < 0) return '#ef4444';  // Margin Risk (Red)
    return '#64748b';                       // Unproductive (Slate)
  };

  const CustomScatterTooltipZ = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-xl text-sm min-w-[220px] dark:bg-zinc-950 dark:border-zinc-800">
          <p className="font-bold mb-3 text-gray-800 dark:text-gray-100">{data.name}</p>
          <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
            <p className="flex justify-between gap-4"><span>Total Harvest:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{data.totalKg.toFixed(2)} kg</span></p>
            <p className="flex justify-between gap-4"><span>Purchase Value:</span> <span className="font-medium text-gray-900 dark:text-gray-100">Rs. {data.purchaseValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
            <p className="flex justify-between gap-4"><span>Export Grade:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{data.exportPercent.toFixed(1)}%</span></p>
            <div className="border-t border-gray-100 dark:border-zinc-800 my-2 pt-2 space-y-1.5">
              <p className="flex justify-between gap-4"><span>Revenue Index:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{data.revenueIndex.toFixed(2)}</span></p>
              <p className="flex justify-between gap-4"><span>Profitability Index:</span> <span className="font-medium text-gray-900 dark:text-gray-100">{data.profitabilityIndex.toFixed(2)}</span></p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoadingReservoirs || isLoadingBills) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Reservoir Analytics & KPIs</h1>
          <p className="text-muted-foreground">Comprehensive performance and comparative analysis</p>
        </div>
        <div className="w-64">
          <Select value={reservoirId} onValueChange={setReservoirId}>
            <SelectTrigger>
              <SelectValue placeholder="All Reservoirs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reservoirs</SelectItem>
              {reservoirs?.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-primary/10 text-primary rounded-full">
              <Droplets className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Harvest</p>
              <h3 className="text-2xl font-bold">{totalHarvest.toFixed(2)} kg</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-success/10 text-emerald-500 rounded-full">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <h3 className="text-2xl font-bold">Rs. {(totalRevenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-warning/10 text-amber-500 rounded-full">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Yield/Day</p>
              <h3 className="text-2xl font-bold">{(harvestTrendData.length > 0 ? (totalHarvest || 0) / harvestTrendData.length : 0).toFixed(2)} kg</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="xl:col-span-2 shadow-sm border-gray-200 dark:border-zinc-800">
          <CardHeader className="pb-0 border-b-0">
            <div className="flex justify-center items-center space-x-6 text-sm font-medium">
              <div className="flex items-center text-gray-600 dark:text-gray-300"><span className="w-3 h-3 rounded-full bg-[#22c55e] mr-2"></span> Cash Cow</div>
              <div className="flex items-center text-gray-600 dark:text-gray-300"><span className="w-3 h-3 rounded-full bg-[#3b82f6] mr-2"></span> Low Impact</div>
              <div className="flex items-center text-gray-600 dark:text-gray-300"><span className="w-3 h-3 rounded-full bg-[#ef4444] mr-2"></span> Margin Risk</div>
              <div className="flex items-center text-gray-600 dark:text-gray-300"><span className="w-3 h-3 rounded-full bg-[#64748b] mr-2"></span> Unproductive</div>
            </div>
          </CardHeader>
          <CardContent className="h-[500px] relative pt-6">
            {/* Quadrant labels */}
            <div className="absolute inset-0 pointer-events-none p-6 pt-12 pb-[60px] pl-[60px] pr-8">
              <div className="relative w-full h-full">
                <div className="absolute top-10 left-1/4 -translate-x-1/2 text-[#3b82f6] font-semibold tracking-wider text-sm opacity-80">LOW IMPACT</div>
                <div className="absolute top-10 right-1/4 translate-x-1/2 text-[#22c55e] font-semibold tracking-wider text-sm opacity-80">CASH COW</div>
                <div className="absolute bottom-10 left-1/4 -translate-x-1/2 text-[#64748b] font-semibold tracking-wider text-sm opacity-80">UNPRODUCTIVE</div>
                <div className="absolute bottom-10 right-1/4 translate-x-1/2 text-[#ef4444] font-semibold tracking-wider text-sm opacity-80">MARGIN RISK</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={true} horizontal={true} />
                <XAxis 
                  type="number" 
                  dataKey="revenueIndex" 
                  name="Revenue Index (Z-Score)" 
                  label={{ value: 'Revenue Index (Z-Score)', position: 'bottom', offset: 0, fill: '#888', fontSize: 12 }} 
                  domain={[-domainLimit, domainLimit]}
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickCount={7}
                />
                <YAxis 
                  type="number" 
                  dataKey="profitabilityIndex" 
                  name="Profitability Index (Z-Score)" 
                  label={{ value: 'Profitability Index (Z-Score)', angle: -90, position: 'insideLeft', fill: '#888', fontSize: 12 }} 
                  domain={[-domainLimit, domainLimit]}
                  tick={{ fontSize: 12, fill: '#888' }}
                  tickCount={7}
                />
                <ZAxis type="category" dataKey="name" name="Reservoir" />
                <RechartsTooltip content={<CustomScatterTooltipZ />} cursor={{strokeDasharray: '3 3'}} />
                
                <ReferenceLine x={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                
                <Scatter data={statsWithZ} shape="circle">
                  {statsWithZ.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getDotColorZ(entry.revenueIndex, entry.profitabilityIndex)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Reservoir Data Comparison</CardTitle>
          <CardDescription>Comprehensive metrics across all active reservoirs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('rank')} className="font-bold px-0 hover:bg-transparent flex items-center">
                      Rank <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('name')} className="font-bold px-0 hover:bg-transparent flex items-center">
                      Reservoir <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('totalKg')} className="font-bold px-0 hover:bg-transparent flex items-center ml-auto">
                      Total (kg) <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('exportPercent')} className="font-bold px-0 hover:bg-transparent flex items-center ml-auto">
                      Export-grade % <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('rejectPercent')} className="font-bold px-0 hover:bg-transparent flex items-center ml-auto">
                      Reject % <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('galIssoPercent')} className="font-bold px-0 hover:bg-transparent flex items-center ml-auto">
                      Gal Isso % <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" onClick={() => requestSort('purchaseValue')} className="font-bold px-0 hover:bg-transparent flex items-center ml-auto">
                      Purchase Value (Rs) <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{(stat as any).rank}</TableCell>
                    <TableCell className="font-medium">{stat.name}</TableCell>
                    <TableCell className="text-right">{stat.totalKg.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={stat.exportPercent >= avgExport ? 'text-emerald-600 font-medium' : ''}>
                        {stat.exportPercent.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={stat.rejectPercent > 20 ? 'text-red-500 font-medium' : ''}>
                        {stat.rejectPercent.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{stat.galIssoPercent.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {stat.purchaseValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </TableCell>
                  </TableRow>
                ))}
                {sortedStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No reservoir data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
