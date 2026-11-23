import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import reservoirLogo from '@/assets/reservoir-logo.png';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  MapPin,
  Droplets,
  Users,
  FileText,
  Settings,
  LogOut,
  MapPinned,
  ChevronLeft,
  Menu,
  Receipt,
  Inbox,
  TrendingUp,
  BarChart3,
  ClipboardList,
  Bug,
  Package,
  Activity,
  History,
  Bell,
  Hash,
  Layers,
  ThermometerSnowflake,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'employee'] },
  { to: '/association/bills/new', icon: Receipt, label: 'Bill Entry', roles: ['fisheries_association'] },
  { to: '/packing/bills', icon: Package, label: 'Packing Check', roles: ['packing_staff'] },
  { to: '/admin/association-bills', icon: Inbox, label: 'Bill Approvals', roles: ['super_admin', 'employee'] },
  { to: '/tags', icon: Hash, label: 'Tag Tracking', roles: ['super_admin', 'employee'] },
  { to: '/ice-details', icon: ThermometerSnowflake, label: 'Ice Details', roles: ['super_admin', 'employee'] },
  { to: '/center/expenses', icon: Receipt, label: 'Center Expenses', roles: ['super_admin', 'employee'] },
  { to: '/admin/association-registration', icon: ClipboardList, label: 'Association Registration', roles: ['super_admin'] },
  { to: '/reservoirs', icon: Droplets, label: 'Reservoirs', roles: ['super_admin'], end: true },
  { to: '/reservoirs/breakdown', icon: Layers, label: 'Reservoir Breakdown', roles: ['super_admin', 'employee'] },
  { to: '/reservoirs/kpis', icon: Activity, label: 'Reservoir KPIs', roles: ['super_admin'] },
  { to: '/locations', icon: MapPin, label: 'Locations', roles: ['super_admin'] },
  { to: '/suppliers', icon: Users, label: 'Suppliers', roles: ['super_admin'] },
  { to: '/prices-items', icon: TrendingUp, label: 'Prices & Items', roles: ['super_admin'] },
  { to: '/reports/harvest', icon: BarChart3, label: 'Harvest Reports', roles: ['super_admin'] },
  { to: '/reports/daily-harvest-cost', icon: TrendingUp, label: 'Daily Harvest & Cost', roles: ['super_admin'] },
  { to: '/employees', icon: Users, label: 'Employees', roles: ['super_admin'] },
  { to: '/audit-logs', icon: History, label: 'Audit Logs', roles: ['super_admin'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin'] },
];

// Desktop Sidebar
export function Sidebar() {
  const { user, userRole, signOut, hasRole } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(
    item => item.roles.some(role => hasRole(role as any))
  );

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex-col hidden lg:flex print:hidden',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
          <img src={reservoirLogo} alt="Reservoir" className="h-8 w-8" />
          {!isCollapsed && (
            <span className="font-display font-bold text-lg text-foreground">ReservoirApp</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-muted-foreground hover:text-foreground"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                isCollapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border">
        {!isCollapsed && user && (
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
              {userRole === 'super_admin' ? 'Admin' : userRole === 'fisheries_association' ? 'Association' : 'Employee'}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            'w-full text-destructive hover:text-destructive hover:bg-destructive/10',
            isCollapsed ? 'justify-center px-2' : 'justify-start'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}

// Mobile Header with Sheet
export function MobileHeader() {
  const { user, userRole, signOut, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close sheet on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const filteredNavItems = navItems.filter(
    item => item.roles.some(role => hasRole(role as any))
  );

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <img src={reservoirLogo} alt="Reservoir" className="h-8 w-8" />
        <span className="font-display font-bold text-lg text-foreground">ReservoirApp</span>
      </div>

      <div className="flex items-center gap-2">
        <Link to="/notifications" className="p-2 rounded-full hover:bg-muted transition-colors relative">
          <Bell className="h-5 w-5 text-amber-700 dark:text-amber-600" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <div className="flex flex-col h-full">
            {/* Sheet Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <img src={reservoirLogo} alt="Reservoir" className="h-8 w-8" />
                <span className="font-display font-bold text-lg">Menu</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {filteredNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-border">
              {user && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary">
                    {userRole === 'super_admin' ? 'Admin' : userRole === 'fisheries_association' ? 'Association' : 'Employee'}
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={signOut}
                className="w-full text-destructive border-destructive/20 hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </header>
  );
}
