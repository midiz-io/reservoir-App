import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-700" /> Notifications
          </h1>
          <p className="text-muted-foreground">View your recent alerts and updates</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>You have no new notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p>You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
