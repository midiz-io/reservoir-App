import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          created_at,
          action,
          entity_type,
          entity_id,
          details,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      if (data && data.length > 0) {
        // Fetch user profiles to display names instead of IDs
        const userIds = [...new Set(data.map((d: any) => d.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);
            
          if (profilesData) {
            const profileMap = Object.fromEntries(profilesData.map(p => [p.id, p.full_name]));
            return data.map((d: any) => ({
              ...d,
              user_name: d.user_id ? (profileMap[d.user_id] || d.user_id) : 'System'
            }));
          }
        }
      }
      return data;
    },
  });

  const filteredLogs = logs?.filter((log: any) =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.user_name && log.user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (log.user_id && log.user_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDetails = (log: any) => {
    if (!log.details) return '-';
    try {
      const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      
      if (log.action === 'UPDATE' && details.old && details.new) {
         const changedKeys = Object.keys(details.new).filter(k => 
           details.new[k] !== details.old[k] && k !== 'updated_at'
         );
         if (changedKeys.length === 0) return <span className="text-xs text-muted-foreground">No visible changes</span>;
         return (
           <div className="flex flex-wrap gap-1">
             {changedKeys.map(key => {
               const oldVal = details.old[key];
               const newVal = details.new[key];
               const formatVal = (v: any) => {
                 if (v === null || v === undefined) return 'None';
                 if (typeof v === 'object') return JSON.stringify(v);
                 return String(v);
               };
               
               return (
                 <div key={key} className="text-xs bg-muted/60 px-2 py-1.5 rounded border border-border flex items-center gap-1.5 flex-wrap">
                   <span className="font-medium text-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                   <span className="text-muted-foreground line-through decoration-destructive/50">{formatVal(oldVal)}</span>
                   <span className="text-muted-foreground">→</span>
                   <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatVal(newVal)}</span>
                 </div>
               );
             })}
           </div>
         );
      } else if (log.action === 'INSERT') {
         return <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 px-2 py-1 rounded">New record created</span>;
      } else if (log.action === 'DELETE') {
         return <span className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 px-2 py-1 rounded">Record deleted</span>;
      }
      
      return <span className="text-xs text-muted-foreground truncate block max-w-[200px]">{JSON.stringify(details)}</span>;
    } catch (e) {
      return '-';
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-display font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground">Track system activities and changes</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by action, entity or user..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs?.map((log: any) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {log.user_name || (log.user_id ? log.user_id.slice(0, 8) + '...' : 'System')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{log.entity_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      {formatDetails(log)}
                    </td>
                  </tr>
                ))}
                {(!filteredLogs || filteredLogs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
