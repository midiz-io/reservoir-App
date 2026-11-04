import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sjfmjigrsjiqvlpzzkus.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZm1qaWdyc2ppcXZscHp6a3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTg2ODYsImV4cCI6MjA4MTE3NDY4Nn0.61eFj5G5EDqRWi1rccedCcKk8l58_NJ-TNv7hIlUSbI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('employees').insert({
    user_id: '12345678-1234-1234-1234-123456789012',
    email: 'test@example.com',
    full_name: 'Test Employee',
    phone: '1234567890',
    status: 'active'
  }).select();

  console.log('Error:', error);
  console.log('Data:', data);
}

testInsert();
