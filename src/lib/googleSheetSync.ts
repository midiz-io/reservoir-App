import { supabase } from '@/integrations/supabase/client';

const LOCAL_CONFIG_KEY = 'reservoir_watch_gsheet_sync_config';

export interface GoogleSheetSyncConfig {
  id?: string;
  config_key: string;
  sheet_url: string;
  apps_script_url: string;
  auto_sync_enabled: boolean;
  last_synced_at: string | null;
  last_synced_count: number | null;
}

export interface ValuationSheetRow {
  date: string;
  reservoir: string;
  collector: string;
  fieldOfficer: string;
  billNo: string;
  billReceived: string;
  qty250: number;
  rate250: number;
  val250: number;
  qty150: number;
  rate150: number;
  val150: number;
  qtyRej: number;
  rateRej: number;
  valRej: number;
  qtyGalIsso: number;
  rateGalIsso: number;
  valGalIsso: number;
  otherQty: number;
  totalQty: number;
  totalVal: number;
}

export const VALUATION_SHEET_HEADERS = [
  'Date',
  'Reservoir',
  'Collector',
  'Field Officer',
  'Bill n',
  'Bill Received',
  '250g up EXP',
  '250g up Rate',
  'Value',
  '150g up EXP',
  '150g up Rate',
  'Value',
  'Rej',
  'Reject Rate',
  'Value',
  'Gal isso',
  'Rate',
  'Value',
  'Other',
  'Total Qty',
  'Value',
];

export function formatSheetDate(rawDate: string | null | undefined): string {
  if (!rawDate) return '';
  const datePart = rawDate.split('T')[0];
  const d = new Date(datePart);
  if (isNaN(d.getTime())) return datePart;
  const day = d.getDate();
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const yr = d.getFullYear();
  return `${day} ${mon} ${yr}`;
}

export function buildValuationSheetRows(bills: any[]): ValuationSheetRow[] {
  const sorted = [...(bills || [])].sort((a, b) =>
    (a.bill_date || '').localeCompare(b.bill_date || '')
  );

  return sorted.map((bill: any) => {
    let items = bill.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }
    if (!Array.isArray(items)) items = [];

    let qty250 = 0;
    let val250 = 0;
    let rate250 = 0;

    let qty150 = 0;
    let val150 = 0;
    let rate150 = 0;

    let qtyRej = 0;
    let valRej = 0;
    let rateRej = 0;

    let qtyGalIsso = 0;
    let valGalIsso = 0;
    let rateGalIsso = 0;

    let otherQty = 0;
    let otherVal = 0;

    items.forEach((it: any) => {
      const desc = (it.description || '').toLowerCase().trim();
      const qty = Number(it.qty) || 0;
      const price = Number(it.unit_price) || 0;
      const amt = Number(it.line_total || qty * price) || 0;

      if (
        desc.includes('250 up') ||
        desc.includes('250g up') ||
        desc.includes('250g exp') ||
        desc.includes('250 exp') ||
        desc.includes('1250g') ||
        desc.includes('>250')
      ) {
        qty250 += qty;
        val250 += amt;
        if (price > 0) rate250 = price;
      } else if (
        desc.includes('150 up') ||
        desc.includes('150g up') ||
        desc.includes('150g exp') ||
        desc.includes('250 below') ||
        desc.includes('250g below') ||
        desc.includes('150g')
      ) {
        qty150 += qty;
        val150 += amt;
        if (price > 0) rate150 = price;
      } else if (
        desc.includes('rej') ||
        desc.includes('reject') ||
        desc.includes('grade b') ||
        desc.includes('b grade')
      ) {
        qtyRej += qty;
        valRej += amt;
        if (price > 0) rateRej = price;
      } else if (
        desc.includes('gal isso') ||
        desc.includes('galisso') ||
        desc.includes('gal_isso')
      ) {
        qtyGalIsso += qty;
        valGalIsso += amt;
        if (price > 0) rateGalIsso = price;
      } else {
        otherQty += qty;
        otherVal += amt;
      }
    });

    if (rate250 === 0 && qty250 > 0 && val250 > 0) rate250 = val250 / qty250;
    if (rate150 === 0 && qty150 > 0 && val150 > 0) rate150 = val150 / qty150;
    if (rateRej === 0 && qtyRej > 0 && valRej > 0) rateRej = valRej / qtyRej;
    if (rateGalIsso === 0 && qtyGalIsso > 0 && valGalIsso > 0) rateGalIsso = valGalIsso / qtyGalIsso;

    const totalQty = qty250 + qty150 + qtyRej + qtyGalIsso + otherQty;
    const totalVal = val250 + val150 + valRej + valGalIsso + otherVal;

    return {
      date: formatSheetDate(bill.bill_date),
      reservoir: bill.reservoirs?.name || '—',
      collector: bill.supplier_name || bill.purchaser_name || '—',
      fieldOfficer: bill.employees?.full_name || '—',
      billNo: bill.bill_no || '—',
      billReceived: bill.status === 'approved' ? 'Yes' : bill.status || 'Pending',
      qty250,
      rate250,
      val250,
      qty150,
      rate150,
      val150,
      qtyRej,
      rateRej,
      valRej,
      qtyGalIsso,
      rateGalIsso,
      valGalIsso,
      otherQty,
      totalQty,
      totalVal,
    };
  });
}

export function getCachedSheetSyncConfig(): GoogleSheetSyncConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedSheetSyncConfig(config: GoogleSheetSyncConfig) {
  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export async function fetchSheetSyncConfig(): Promise<GoogleSheetSyncConfig> {
  const db = supabase as any;
  try {
    const { data, error } = await db
      .from('google_sheet_sync_configs')
      .select('*')
      .eq('config_key', 'collection_bills')
      .maybeSingle();
    if (!error && data) {
      setCachedSheetSyncConfig(data);
      return data as GoogleSheetSyncConfig;
    }
  } catch {
    // fallback to cache
  }
  return (
    getCachedSheetSyncConfig() || {
      config_key: 'collection_bills',
      sheet_url: '',
      apps_script_url: '',
      auto_sync_enabled: true,
      last_synced_at: null,
      last_synced_count: 0,
    }
  );
}

export async function postBillsToGoogleSheet(
  appsScriptUrl: string,
  bills: any[],
  sheetTitle = 'Collection Bills'
): Promise<{ sheetUrl?: string; rowCount: number }> {
  const rows = buildValuationSheetRows(bills);
  const payload = {
    action: 'sync_collection_bills',
    sheetName: sheetTitle,
    headers: VALUATION_SHEET_HEADERS,
    rows: rows.map((r) => [
      r.date,
      r.reservoir,
      r.collector,
      r.fieldOfficer,
      r.billNo,
      r.billReceived,
      r.qty250 > 0 ? Number(r.qty250.toFixed(3)) : '',
      r.rate250 > 0 ? Math.round(r.rate250) : '',
      r.val250 > 0 ? Math.round(r.val250) : 0,
      r.qty150 > 0 ? Number(r.qty150.toFixed(3)) : '',
      r.rate150 > 0 ? Math.round(r.rate150) : '',
      r.val150 > 0 ? Math.round(r.val150) : 0,
      r.qtyRej > 0 ? Number(r.qtyRej.toFixed(3)) : '',
      r.rateRej > 0 ? Math.round(r.rateRej) : '',
      r.valRej > 0 ? Math.round(r.valRej) : 0,
      r.qtyGalIsso > 0 ? Number(r.qtyGalIsso.toFixed(3)) : '',
      r.rateGalIsso > 0 ? Math.round(r.rateGalIsso) : '',
      r.valGalIsso > 0 ? Math.round(r.valGalIsso) : 0,
      r.otherQty > 0 ? Number(r.otherQty.toFixed(3)) : '',
      Number(r.totalQty.toFixed(3)),
      r.totalVal > 0 ? Math.round(r.totalVal) : 0,
    ]),
    syncedAt: new Date().toISOString(),
  };

  // Use text/plain to avoid CORS preflight with Google Apps Script Web App
  try {
    const res = await fetch(appsScriptUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      try {
        const json = await res.json();
        return { sheetUrl: json.sheetUrl, rowCount: rows.length };
      } catch {
        return { rowCount: rows.length };
      }
    }
    throw new Error(`Google Sheet sync returned status ${res.status}`);
  } catch (err) {
    // Fallback to no-cors if Apps Script redirect blocks reading response
    await fetch(appsScriptUrl.trim(), {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return { rowCount: rows.length };
  }
}

export async function triggerAutoSyncIfEnabled() {
  try {
    const config = await fetchSheetSyncConfig();
    if (!config.auto_sync_enabled || !config.apps_script_url?.trim()) {
      return;
    }

    const db = supabase as any;
    const { data: bills, error } = await db
      .from('association_bills')
      .select('*, employees(full_name, email), reservoirs(name)')
      .eq('status', 'approved')
      .order('bill_date', { ascending: true })
      .limit(5000);

    if (error || !bills) return;

    const result = await postBillsToGoogleSheet(config.apps_script_url, bills);
    const updatedAt = new Date().toISOString();

    setCachedSheetSyncConfig({
      ...config,
      last_synced_at: updatedAt,
      last_synced_count: result.rowCount,
      sheet_url: config.sheet_url || result.sheetUrl || '',
    });

    await db
      .from('google_sheet_sync_configs')
      .upsert(
        {
          config_key: 'collection_bills',
          sheet_url: config.sheet_url || result.sheetUrl || '',
          apps_script_url: config.apps_script_url,
          auto_sync_enabled: config.auto_sync_enabled,
          last_synced_at: updatedAt,
          last_synced_count: result.rowCount,
        },
        { onConflict: 'config_key' }
      );
  } catch (err) {
    console.warn('Background Google Sheet auto-sync skipped:', err);
  }
}

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = payload.sheetName || 'Collection Bills';
    var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    sheet.clear();

    var headers = payload.headers || [
      'Date','Reservoir','Collector','Field Officer','Bill n','Bill Received',
      '250g up EXP','250g up Rate','Value',
      '150g up EXP','150g up Rate','Value',
      'Rej','Reject Rate','Value',
      'Gal isso','Rate','Value',
      'Other','Total Qty','Value'
    ];
    var rows = payload.rows || [];
    var numCols = headers.length;

    // Header Row (Row 1)
    sheet.getRange(1, 1, 1, numCols).setValues([headers])
      .setBackground('#a9d08e')
      .setFontColor('#000000')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle')
      .setWrap(true);
    sheet.setRowHeight(1, 32);

    // Highlight Reject and Gal Isso header text in red
    sheet.getRange(1, 13, 1, 6).setFontColor('#c00000');

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, numCols).setValues(rows);

      // Quantity columns (3 decimals)
      [7, 10, 13, 16, 19, 20].forEach(function(col) {
        sheet.getRange(2, col, rows.length, 1).setNumberFormat('0.000');
      });

      // Rate & Value columns (currency integer format)
      [8, 9, 11, 12, 14, 15, 17, 18, 21].forEach(function(col) {
        sheet.getRange(2, col, rows.length, 1).setNumberFormat('#,##0');
      });

      // Blue rates for 250g up & 150g up
      sheet.getRange(2, 8, rows.length, 1).setFontColor('#0000ff');
      sheet.getRange(2, 11, rows.length, 1).setFontColor('#0000ff');
      // Red rates for Reject & Gal Isso
      sheet.getRange(2, 14, rows.length, 1).setFontColor('#c00000');
      sheet.getRange(2, 17, rows.length, 1).setFontColor('#c00000');

      // Totals Row
      var totalRowIdx = rows.length + 2;
      var lastDataRow = rows.length + 1;
      sheet.getRange(totalRowIdx, 1).setValue('Total');
      sheet.getRange(totalRowIdx, 7).setFormula('=SUM(G2:G' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 8).setFormula('=IFERROR(I' + totalRowIdx + '/G' + totalRowIdx + ',0)');
      sheet.getRange(totalRowIdx, 9).setFormula('=SUM(I2:I' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 10).setFormula('=SUM(J2:J' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 11).setFormula('=IFERROR(L' + totalRowIdx + '/J' + totalRowIdx + ',0)');
      sheet.getRange(totalRowIdx, 12).setFormula('=SUM(L2:L' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 13).setFormula('=SUM(M2:M' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 14).setFormula('=IFERROR(O' + totalRowIdx + '/M' + totalRowIdx + ',0)');
      sheet.getRange(totalRowIdx, 15).setFormula('=SUM(O2:O' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 16).setFormula('=SUM(P2:P' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 17).setFormula('=IFERROR(R' + totalRowIdx + '/P' + totalRowIdx + ',0)');
      sheet.getRange(totalRowIdx, 18).setFormula('=SUM(R2:R' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 19).setFormula('=SUM(S2:S' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 20).setFormula('=SUM(T2:T' + lastDataRow + ')');
      sheet.getRange(totalRowIdx, 21).setFormula('=SUM(U2:U' + lastDataRow + ')');

      sheet.getRange(totalRowIdx, 1, 1, numCols)
        .setBackground('#e2efda')
        .setFontWeight('bold');
      [7, 10, 13, 16, 19, 20].forEach(function(col) {
        sheet.getRange(totalRowIdx, col).setNumberFormat('0.000');
      });
      [8, 9, 11, 12, 14, 15, 17, 18, 21].forEach(function(col) {
        sheet.getRange(totalRowIdx, col).setNumberFormat('#,##0.000');
      });

      // Borders across entire table
      sheet.getRange(1, 1, rows.length + 2, numCols).setBorder(true, true, true, true, true, true);
    }

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, numCols);

    var sheetUrl = ss.getUrl() + '#gid=' + sheet.getSheetId();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sheetUrl: sheetUrl, rows: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
