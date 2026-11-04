import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sjfmjigrsjiqvlpzzkus.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZm1qaWdyc2ppcXZscHp6a3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTg2ODYsImV4cCI6MjA4MTE3NDY4Nn0.61eFj5G5EDqRWi1rccedCcKk8l58_NJ-TNv7hIlUSbI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostics() {
  console.log('Running diagnostics on employee update...');
  
  // 1. Get an existing employee to test with
  const { data: employees, error: fetchError } = await supabase
    .from('employees')
    .select('*')
    .limit(1);

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  if (!employees || employees.length === 0) {
    console.log('No employees found to test with.');
    return;
  }

  const testEmployee = employees[0];
  console.log('Found test employee:', testEmployee.full_name, 'ID:', testEmployee.id);

  // 2. Attempt to update the employee (simulating EmployeesPage handleSubmit)
  const { data: updateData, error: updateError } = await supabase
    .from('employees')
    .update({
      full_name: testEmployee.full_name,
      phone: testEmployee.phone || '',
      status: testEmployee.status,
      assigned_locations: testEmployee.assigned_locations || [],
      email: testEmployee.email
    })
    .eq('id', testEmployee.id)
    .select();

  if (updateError) {
    console.error('DATABASE UPDATE ERROR:', updateError);
  } else {
    console.log('Database update SUCCEEDED! Result:', updateData);
  }
}

runDiagnostics();
