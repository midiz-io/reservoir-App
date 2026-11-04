import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Search,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Plus,
  FileText,
  Download,
  MessageCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useEmployees, useDeleteEmployee, useCreateEmployee, useUpdateEmployee, EmployeeWithRole } from '@/hooks/useEmployees';
import { toast } from 'sonner';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import { useLocations } from '@/hooks/useLocations';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';

type Employee = Database['public']['Tables']['employees']['Row'];

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sessionPasswords, setSessionPasswords] = useState<Record<string, { current?: string, updated?: string }>>({});

  const { data: employees, isLoading } = useEmployees();
  const { data: locations } = useLocations();
  const deleteEmployee = useDeleteEmployee();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const filteredEmployees = (employees as EmployeeWithRole[])?.filter(e =>
    e.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.role?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const groupedEmployees = useMemo(() => {
    const groups: Record<string, typeof filteredEmployees> = {};
    
    // Initialize groups with all known locations safely
    if (Array.isArray(locations)) {
      locations.forEach(loc => {
        if (loc && loc.name) {
          groups[loc.name] = [];
        }
      });
    }
    groups['Unassigned / General'] = [];

    filteredEmployees.forEach(emp => {
      if (emp && Array.isArray(emp.assigned_locations) && emp.assigned_locations.length > 0) {
        emp.assigned_locations.forEach(locId => {
          const loc = Array.isArray(locations) ? locations.find(l => l.id === locId) : undefined;
          if (loc && loc.name) {
            groups[loc.name].push(emp);
          } else {
            const safeId = typeof locId === 'string' ? locId : String(locId || '');
            const label = safeId ? `Location ${safeId.slice(0, 4)}` : 'Location Unknown';
            if (!groups[label]) groups[label] = [];
            groups[label].push(emp);
          }
        });
      } else {
        groups['Unassigned / General'].push(emp);
      }
    });

    // Remove empty groups to keep layout clean
    return Object.fromEntries(
      Object.entries(groups).filter(([_, list]) => list && list.length > 0)
    );
  }, [filteredEmployees, locations]);

  console.log('Employees total:', employees?.length);
  console.log('Filtered total:', filteredEmployees.length);

  const activeCount = employees?.filter(e => e.status === 'active').length || 0;
  const inactiveCount = employees?.filter(e => e.status === 'inactive').length || 0;

  const filteredActiveCount = filteredEmployees.filter(e => e.status === 'active').length;
  const filteredTotalCount = filteredEmployees.length;

  console.log('Active Count:', activeCount, 'Inactive Count:', inactiveCount);

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee.mutateAsync(id);
      toast.success('Employee deleted');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete employee: ${error.message || 'Unknown error'}`);
    }
  };

  const shareViaWhatsApp = () => {
    try {
      const generatedDate = new Date().toLocaleString();
      let text = `*🌟 Employee Login Credentials 🌟*\n_Generated on: ${generatedDate}_\n\n`;
      
      const list = employees || [];
      if (list.length === 0) {
        toast.info("No employees to share.");
        return;
      }
      
      list.forEach((emp, index) => {
        const currentPass = (emp as any).current_password || sessionPasswords[emp.email]?.current || 'N/A';
        const updatedPass = (emp as any).updated_password || sessionPasswords[emp.email]?.updated || 'N/A';
        const passToShow = updatedPass !== 'N/A' ? updatedPass : currentPass;
        
        text += `*${index + 1}. ${emp.full_name}*\n`;
        text += `📧 Email: ${emp.email}\n`;
        text += `🔑 Password: ${passToShow}\n`;
        text += `📞 Phone: ${emp.phone || 'N/A'}\n`;
        text += `📌 Status: ${emp.status}\n`;
        text += `----------------------------------\n`;
      });
      
      text += `\n_Please keep these credentials secure._`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
      toast.success("Opened WhatsApp for sharing");
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast.error("Failed to share via WhatsApp");
    }
  };

  const shareSingleViaWhatsApp = (emp: any) => {
    try {
      const currentPass = (emp as any).current_password || sessionPasswords[emp.email]?.current || 'N/A';
      const updatedPass = (emp as any).updated_password || sessionPasswords[emp.email]?.updated || 'N/A';
      const passToShow = updatedPass !== 'N/A' ? updatedPass : currentPass;

      let text = `*🌟 Employee Login Credentials 🌟*\n\n`;
      text += `👤 *Name:* ${emp.full_name}\n`;
      text += `📧 *Email:* ${emp.email}\n`;
      text += `🔑 *Password:* ${passToShow}\n`;
      text += `📞 *Phone:* ${emp.phone || 'N/A'}\n`;
      text += `💼 *Role:* ${emp.role?.replace('_', ' ') || 'Employee'}\n`;
      text += `📌 *Status:* ${emp.status}\n\n`;
      text += `_Please keep these credentials secure._`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
      toast.success("Opened WhatsApp for sharing");
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast.error("Failed to share via WhatsApp");
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setDialogOpen(true);
  };

  const generateReportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Employee Credential Sheet", 14, 22);
      
      const generatedDate = new Date().toLocaleString();
      doc.setFontSize(11);
      doc.text(`Generated on: ${generatedDate}`, 14, 30);
      
      const tableData = (employees || []).map(emp => [
        emp.full_name,
        emp.phone || 'N/A',
        new Date(emp.created_at).toLocaleString(),
        (emp as any).current_password || sessionPasswords[emp.email]?.current || 'N/A',
        (emp as any).updated_password || sessionPasswords[emp.email]?.updated || 'N/A'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Name', 'Phone', 'Registration Date', 'Current Password', 'Updated Password']],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] },
      });
      
      doc.save('Employees_Report.pdf');
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error('Failed to generate PDF report');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const { password, ...employeeData } = data;

      // Normalize email (trim and lowercase)
      const normalizedEmail = data.email?.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      if (selectedEmployee) {
        // Update existing employee password if provided
        if (password && password.trim().length > 0) {
          const { error: pwdError } = await (supabase as any).rpc('admin_reset_employee_password', {
            _employee_user_id: selectedEmployee.user_id,
            _new_password: password.trim(),
          });

          if (pwdError) {
            console.error('Password reset error:', pwdError);
            toast.error(`Failed to update password: ${pwdError.message}`);
            return; // Abort further updates if password reset fails
          } else {
            toast.success('Password updated successfully');
            setSessionPasswords(prev => ({
              ...prev,
              [normalizedEmail]: {
                ...prev[normalizedEmail],
                updated: password.trim()
              }
            }));
          }
        }

        const { role, user_id, ...dbData } = employeeData;

        await updateEmployee.mutateAsync({
          id: selectedEmployee.id,
          ...dbData,
          email: normalizedEmail,
        });

        // Update the role in user_roles table if it's provided
        if (role && selectedEmployee.user_id) {
          await (supabase as any)
            .from('user_roles')
            .update({ role: role as any })
            .eq('user_id', selectedEmployee.user_id);

          await queryClient.invalidateQueries({ queryKey: ['employees'] });
        }

        toast.success('Employee updated');
        setDialogOpen(false);
      } else {
        // Create new employee - password is required
        if (!password || password.trim().length < 6) {
          throw new Error('Password is required and must be at least 6 characters');
        }

        // Validate email format one more time
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
          throw new Error('Please enter a valid email address');
        }

        // Create new employee - use edge function with a robust client-side signup fallback
        let userId: string | null = null;
        let edgeFunctionSucceeded = false;

        // Try using the Edge Function first
        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('create-employee-user', {
            body: {
              email: normalizedEmail,
              password: password.trim(),
              full_name: data.full_name.trim(),
            },
          });

          if (functionError) {
            throw functionError;
          }

          if (functionData?.user?.id) {
            userId = functionData.user.id;
            edgeFunctionSucceeded = true;
          }
        } catch (funcError: any) {
          console.warn("Edge function invocation failed, attempting client-side fallback:", funcError);
          
          // Propagate user input errors (like email already exists)
          const errorMsg = funcError?.message || String(funcError);
          if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('User already registered')) {
            throw new Error('An account with this email already exists');
          }
        }

        // If Edge Function failed or was not deployed, run the client-side signup fallback
        if (!edgeFunctionSucceeded) {
          console.log("Running client-side signup fallback...");
          const { createClient } = await import('@supabase/supabase-js');
          
          const tempSupabase = createClient(
            import.meta.env.VITE_SUPABASE_URL || '',
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
              }
            }
          );

          const { data: signUpData, error: signUpError } = await tempSupabase.auth.signUp({
            email: normalizedEmail,
            password: password.trim(),
            options: {
              data: {
                full_name: data.full_name.trim(),
              }
            }
          });

          if (signUpError) {
            console.error("Client-side signup fallback failed:", signUpError);
            const errMsg = signUpError.message || '';
            if (errMsg.includes('already registered') || errMsg.includes('already exists') || errMsg.includes('User already registered')) {
              throw new Error('An account with this email already exists');
            }
            throw new Error(signUpError.message || 'Failed to create employee account');
          }

          if (signUpData?.user?.id) {
            userId = signUpData.user.id;
          } else {
            throw new Error('Failed to create user account');
          }
        }

        if (!userId) {
          throw new Error('Failed to obtain a valid user ID');
        }

        // Prepare cleaned data for the database (remove password/role as they shouldn't be in employees table)
        const { password: _, role, ...dbData } = data;

        console.log('Inserting employee record into DB:', dbData);
        
        await createEmployee.mutateAsync({
          ...dbData,
          email: normalizedEmail,
          user_id: userId,
        });
        console.log('Employee record inserted successfully');

        setSessionPasswords(prev => ({
          ...prev,
          [normalizedEmail]: {
            ...prev[normalizedEmail],
            current: password.trim()
          }
        }));

        // Update the role in user_roles table if it's not the default 'employee'
        if (role && role !== 'employee') {
          console.log('Updating user role to:', role);
          const { error: roleError } = await (supabase as any)
            .from('user_roles')
            .update({ role: role as any })
            .eq('user_id', userId);

          if (roleError) {
            console.warn('Failed to update user role:', roleError);
            toast.warning('Employee created, but role assignment failed');
          }
        }

        // Important: Invalidate queries to refresh the list
        await queryClient.invalidateQueries({ queryKey: ['employees'] });
        toast.success('Employee created successfully');
        
        // Generate PDF report for the new employee
        try {
          const doc = new jsPDF();
          doc.setFontSize(20);
          doc.text("Employee Registration Details", 14, 22);
          
          doc.setFontSize(11);
          doc.text("Please share these details with HR.", 14, 30);
          
          const joinedDate = new Date().toLocaleString();
          
          autoTable(doc, {
            startY: 40,
            head: [['Field', 'Value']],
            body: [
              ['Name', data.full_name],
              ['Email', normalizedEmail],
              ['Password', password],
              ['Phone Number', data.phone || 'N/A'],
              ['Role', role || 'employee'],
              ['Joined Date', joinedDate],
            ],
          });
          
          doc.save(`${data.full_name.replace(/\s+/g, '_')}_Registration.pdf`);
          
          // Show alert to user
          alert(`Successfully added employee: ${data.full_name}\nA PDF report has been downloaded. Please share it with HR.`);
        } catch (pdfError) {
          console.error("Failed to generate PDF:", pdfError);
          toast.error("Employee added, but failed to generate PDF report");
          alert(`Successfully added employee: ${data.full_name}, but failed to generate PDF report.`);
        }

        setDialogOpen(false);
      }
    } catch (error: any) {
      console.error('FAILED TO SAVE EMPLOYEE DETAILS:', error);
      toast.error(error.message || 'Failed to save employee');
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
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground">
            {activeCount} of {employees?.length || 0} employees active
          </p>
        </div>
        <div className="flex w-full sm:w-auto gap-2">
          <Button variant="outline" onClick={shareViaWhatsApp} title="Share All to WhatsApp" className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200 px-2 sm:px-4">
            <MessageCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Share All</span>
          </Button>
          <Button variant="outline" onClick={() => setReportOpen(true)} title="View Report" className="px-2 sm:px-4">
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Report</span>
          </Button>
          <Button onClick={handleAdd} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employees?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10 text-success">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-full sm:max-w-md"
        />
      </div>

      {/* Employees Grouped by Location - Desktop */}
      <div className="hidden md:block space-y-6">
        {Object.entries(groupedEmployees).map(([locationName, list]) => (
          <Card key={locationName} className="border-none shadow-md overflow-hidden bg-card/60 backdrop-blur-sm">
            <CardHeader className="bg-muted/20 border-b py-3 px-6 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary font-display">📍 {locationName}</span>
                <Badge variant="secondary" className="text-xs">{list.length} {list.length === 1 ? 'employee' : 'employees'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Assigned Locations</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((employee, index) => (
                    <TableRow
                      key={employee.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
                            employee.status === 'active'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {(employee.full_name || '').trim().split(/\s+/).map(n => n[0] || '').join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{employee.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate w-24">ID: {(employee.id || '').slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {employee.role?.replace('_', ' ') || 'employee'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            {employee.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{employee.phone || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {employee.assigned_locations?.slice(0, 2).map((id, i) => {
                            const loc = Array.isArray(locations) ? locations.find(l => l.id === id) : undefined;
                            const safeId = typeof id === 'string' ? id : String(id || '');
                            return (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {loc?.name || `L-${safeId ? safeId.slice(0, 4) : '?'}`}
                              </Badge>
                            );
                          })}
                          {(employee.assigned_locations?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{employee.assigned_locations!.length - 2}
                            </Badge>
                          )}
                          {!employee.assigned_locations?.length && (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => shareSingleViaWhatsApp(employee)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Share Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {filteredEmployees.length === 0 && (
          <Card className="border-none shadow-md">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Employee" to create one
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Employees Grouped by Location - Mobile */}
      <div className="md:hidden space-y-6">
        {Object.entries(groupedEmployees).map(([locationName, list]) => (
          <div key={locationName} className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">📍 {locationName}</span>
              <Badge variant="secondary" className="text-[10px] h-4 py-0">{list.length}</Badge>
            </div>
            
            {list.map((employee, index) => (
              <Card
                key={employee.id}
                className="animate-slide-up border-none shadow-sm"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
                        employee.status === 'active'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}>
                        {(employee.full_name || '').trim().split(/\s+/).map(n => n[0] || '').join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{employee.full_name}</p>
                          <Badge variant="outline" className="text-[9px] h-4 py-0 capitalize">
                            {employee.role?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <Badge
                          variant={employee.status === 'active' ? 'default' : 'secondary'}
                          className="text-[10px] mt-1"
                        >
                          {employee.status}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => shareSingleViaWhatsApp(employee)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Share Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(employee)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(employee.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                    {employee.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span className="text-[9px] font-semibold bg-primary/5 px-1.5 py-0.5 rounded text-primary">TEL</span>
                        <span>{employee.phone}</span>
                      </div>
                    )}
                  </div>

                  {employee.assigned_locations && employee.assigned_locations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {employee.assigned_locations.slice(0, 3).map((id, i) => {
                        const loc = Array.isArray(locations) ? locations.find(l => l.id === id) : undefined;
                        const safeId = typeof id === 'string' ? id : String(id || '');
                        return (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {loc?.name || `L-${safeId ? safeId.slice(0, 4) : '?'}`}
                          </Badge>
                        );
                      })}
                      {employee.assigned_locations.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{employee.assigned_locations.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

        {filteredEmployees.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add Employee" to create one
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmployee}
        onSubmit={handleSubmit}
        isLoading={createEmployee.isPending || updateEmployee.isPending}
      />

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Employee Credential Sheet</DialogTitle>
            <div className="flex gap-2 mr-8">
              <Button onClick={shareViaWhatsApp} size="sm" variant="outline" className="bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200">
                <MessageCircle className="h-4 w-4 mr-2" />
                Share WhatsApp
              </Button>
              <Button onClick={generateReportPDF} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Save PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Current Password</TableHead>
                  <TableHead>Updated Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.full_name}</TableCell>
                    <TableCell>{emp.phone || 'N/A'}</TableCell>
                    <TableCell>{new Date(emp.created_at).toLocaleString()}</TableCell>
                    <TableCell>{(emp as any).current_password || sessionPasswords[emp.email]?.current || 'N/A'}</TableCell>
                    <TableCell>{(emp as any).updated_password || sessionPasswords[emp.email]?.updated || 'N/A'}</TableCell>
                  </TableRow>
                ))}
                {(!employees || employees.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">No employees found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
}
