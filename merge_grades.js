import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sjfmjigrsjiqvlpzzkus.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZm1qaWdyc2ppcXZscHp6a3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTg2ODYsImV4cCI6MjA4MTE3NDY4Nn0.61eFj5G5EDqRWi1rccedCcKk8l58_NJ-TNv7hIlUSbI";
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMerge() {
  console.log('Fetching all association bills...');
  const { data: bills, error: fetchError } = await supabase
    .from('association_bills')
    .select('*');

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  let updatedCount = 0;

  for (const bill of bills) {
    if (!bill.items || !Array.isArray(bill.items)) continue;

    let modified = false;
    const newItems = bill.items.map(item => {
      let desc = (item.description || '').trim();
      const lower = desc.toLowerCase();
      
      let newDesc = desc;

      if (lower.includes('fwp') || lower.includes('live')) {
        newDesc = 'Live Freshwater Prawn';
      } else if (lower.includes('1250g') || lower.includes('250 up') || lower.includes('250g up')) {
        newDesc = '250 Up';
      } else if (lower.includes('250 below') || lower.includes('250g below')) {
        newDesc = '250 Below';
      } else if (lower.includes('reject') || lower.includes('grade b')) {
        newDesc = 'Grade B';
      } else if (lower.includes('gal isso') || lower.includes('galisso')) {
        newDesc = 'Gal Isso';
      } else {
        // Leave as is if it doesn't match known mappings, but maybe we should map to 'Other' if we wanted strictly master grades.
        // The instructions say "Merge existing free-text entries into the correct grades."
        // We'll assume the above covers the FWP ones.
      }

      if (newDesc !== desc) {
        modified = true;
      }

      return { ...item, description: newDesc };
    });

    if (modified) {
      const { error: updateError } = await supabase
        .from('association_bills')
        .update({ items: newItems })
        .eq('id', bill.id);
      
      if (updateError) {
        console.error(`Failed to update bill ${bill.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} bills.`);
}

runMerge();
