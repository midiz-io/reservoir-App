import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAssociationBills } from '@/hooks/useAssociationBills';
import { Loader2, DollarSign, Scale, AlertOctagon, Fish } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { startOfWeek, startOfMonth, startOfYear } from 'date-fns';

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const { data: bills, isLoading } = useAssociationBills();

  const filteredData = useMemo(() => {
    if (!bills) return { bills: [], chartData: [] };

    const now = new Date();
    let startDate = new Date();
    
    if (timeFilter === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'week') {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
    } else if (timeFilter === 'month') {
      startDate = startOfMonth(now);
    } else if (timeFilter === 'year') {
      startDate = startOfYear(now);
    }

    const filtered = bills.filter(b => {
      if (b.status !== 'approved') return false;
      const bDate = new Date(b.bill_date);
      // For 'today', match exact date. For others, >= startDate.
      if (timeFilter === 'today') {
        const bd = new Date(b.bill_date.split('T')[0]);
        const td = new Date();
        bd.setHours(0,0,0,0);
        td.setHours(0,0,0,0);
        return bd.getTime() === td.getTime();
      }
      return bDate >= startDate;
    });

    // Group for chart
    const groups: Record<string, any> = {};
    filtered.forEach(b => {
      const bDate = new Date(b.bill_date.split('T')[0]);
      let key = bDate.toLocaleDateString();
      if (timeFilter === 'year') {
        key = bDate.toLocaleString('default', { month: 'short' });
      }

      if (!groups[key]) {
        groups[key] = { name: key, qty: 0, amount: 0, order: bDate.getTime() };
      }
      
      let billQty = 0;
      if (Array.isArray(b.items)) {
        b.items.forEach((it: any) => billQty += (Number(it.qty) || 0));
      }
      
      groups[key].qty += billQty;
      groups[key].amount += Number(b.total) || 0;
    });

    return {
      bills: filtered,
      chartData: Object.values(groups).sort((a, b) => a.order - b.order)
    };
  }, [bills, timeFilter]);

  const stats = useMemo(() => {
    let totalQty = 0;
    let totalAmount = 0;
    let rejectQty = 0;
    let galIssoQty = 0;

    filteredData.bills.forEach((bill: any) => {
      totalAmount += Number(bill.total) || 0;
      if (Array.isArray(bill.items)) {
        bill.items.forEach((it: any) => {
          const qty = Number(it.qty) || 0;
          const descLower = (it.description || '').toLowerCase();
          
          totalQty += qty;
          
          if (descLower.includes('reject') || descLower.includes('grade b')) {
            rejectQty += qty;
          }
          if (descLower.includes('gal isso') || descLower.includes('galisso')) {
            galIssoQty += qty;
          }
        });
      }
    });

    return {
      totalQty,
      totalAmount,
      rejectPercent: totalQty > 0 ? (rejectQty / totalQty) * 100 : 0,
      galIssoPercent: totalQty > 0 ? (galIssoQty / totalQty) * 100 : 0
    };
  }, [filteredData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">How's the operation going?</p>
        </div>
        <div className="w-48">
          <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Quantity" value={`${stats.totalQty.toFixed(2)} kg`} icon={Scale} color="primary" />
        <StatCard title="Total Value" value={`Rs. ${stats.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={DollarSign} color="success" />
        <StatCard title="Reject Rate" value={`${stats.rejectPercent.toFixed(1)}%`} icon={AlertOctagon} color="warning" />
        <StatCard title="Gal Isso Rate" value={`${stats.galIssoPercent.toFixed(1)}%`} icon={Fish} color="accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Collection Volume Trend</CardTitle>
            <CardDescription>Total kg collected over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="qty" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Quantity (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Value Trend</CardTitle>
            <CardDescription>Total value (Rs) collected over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{r: 4}} name="Amount (Rs)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = 'primary' }: any) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-emerald-500/10 text-emerald-500',
    warning: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-display mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
