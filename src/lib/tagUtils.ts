import { TagDispatch } from '@/hooks/useTagDispatches';

export const MAX_EXPANDED_TAGS_PER_DISPATCH = 5000;

export interface BillTagReference {
  billId: string;
  billNo: string;
  billDate: string;
  status: string;
  reservoirId: string;
  reservoirName: string;
  supplierName: string;
  boxNumber: string | null;
}

export interface DispatchedTagEntry {
  tagCode: string;
  normalizedCode: string;
  numericValue: number;
  dispatchId: string;
  sentDate: string;
  prefix: string;
  reservoirId: string | null;
  reservoirName: string | null;
  locationName: string | null;
  officerName: string | null;
  arrived: boolean;
  matchedBills: BillTagReference[];
}

export function formatTagNumber(prefix: string, num: number, padLength: number): string {
  const safePrefix = prefix || '';
  const numStr = padLength > 0 ? String(num).padStart(padLength, '0') : String(num);
  return `${safePrefix}${numStr}`;
}

export function normalizeTagCode(tag: string): string {
  return tag.trim().toUpperCase();
}

export function parseBillTags(sealingTagNumber: string | null | undefined): string[] {
  if (!sealingTagNumber) return [];
  return sealingTagNumber
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Parses a start & end tag string (e.g. "TAG-0010" & "TAG-0050" or "1001" & "1050")
 * into prefix, start_number, end_number, and pad_length.
 */
export function parseTagRangeStrings(
  startInput: string,
  endInput: string,
  explicitPrefix?: string
): {
  prefix: string;
  startNumber: number;
  endNumber: number;
  padLength: number;
  error?: string;
} {
  const s = startInput.trim();
  const e = endInput.trim();

  if (!s || !e) {
    return { prefix: '', startNumber: 0, endNumber: 0, padLength: 0, error: 'Start and End tag numbers are required.' };
  }

  const startMatch = s.match(/^(.*?)(\d+)$/);
  const endMatch = e.match(/^(.*?)(\d+)$/);

  if (!startMatch || !endMatch) {
    return { prefix: '', startNumber: 0, endNumber: 0, padLength: 0, error: 'Tag range must end with numbers (e.g. 1001 or TAG-1001).' };
  }

  const startPrefix = startMatch[1];
  const endPrefix = endMatch[1];

  if (startPrefix.toUpperCase() !== endPrefix.toUpperCase()) {
    return {
      prefix: '',
      startNumber: 0,
      endNumber: 0,
      padLength: 0,
      error: `Start prefix "${startPrefix}" does not match end prefix "${endPrefix}".`,
    };
  }

  const startNumStr = startMatch[2];
  const endNumStr = endMatch[2];
  const startNumber = parseInt(startNumStr, 10);
  const endNumber = parseInt(endNumStr, 10);

  if (endNumber < startNumber) {
    return {
      prefix: '',
      startNumber: 0,
      endNumber: 0,
      padLength: 0,
      error: 'End tag number must be greater than or equal to Start tag number.',
    };
  }

  if (endNumber - startNumber + 1 > MAX_EXPANDED_TAGS_PER_DISPATCH) {
    return {
      prefix: '',
      startNumber: 0,
      endNumber: 0,
      padLength: 0,
      error: `Single dispatch range cannot exceed ${MAX_EXPANDED_TAGS_PER_DISPATCH} tags.`,
    };
  }

  const prefix = explicitPrefix !== undefined && explicitPrefix.trim() !== '' ? explicitPrefix.trim() : startPrefix;
  const padLength = startNumStr.startsWith('0') && startNumStr.length > 1 ? startNumStr.length : 0;

  return { prefix, startNumber, endNumber, padLength };
}

/**
 * Generates an index of all tags recorded on bills (excluding rejected bills).
 */
export function buildBillTagIndex(bills: any[] | undefined): Map<string, BillTagReference[]> {
  const index = new Map<string, BillTagReference[]>();
  if (!bills) return index;

  for (const bill of bills) {
    if (bill.status === 'rejected') continue;
    const tags = parseBillTags(bill.sealing_tag_number);
    for (const rawTag of tags) {
      const norm = normalizeTagCode(rawTag);
      const ref: BillTagReference = {
        billId: bill.id,
        billNo: bill.bill_no,
        billDate: bill.bill_date,
        status: bill.status || 'pending',
        reservoirId: bill.reservoir_id,
        reservoirName: bill.reservoirs?.name || '—',
        supplierName: bill.supplier_name || '—',
        boxNumber: bill.box_number || null,
      };
      const existing = index.get(norm) || [];
      existing.push(ref);
      index.set(norm, existing);
    }
  }
  return index;
}

/**
 * Expands dispatches into individual tag entries and cross-references against bills.
 */
export function buildDispatchedTagsList(
  dispatches: TagDispatch[] | undefined,
  bills: any[] | undefined
): DispatchedTagEntry[] {
  if (!dispatches || dispatches.length === 0) return [];
  const billIndex = buildBillTagIndex(bills);
  const result: DispatchedTagEntry[] = [];

  for (const d of dispatches) {
    const count = Math.min(
      Math.max(0, d.end_number - d.start_number + 1),
      MAX_EXPANDED_TAGS_PER_DISPATCH
    );
    for (let i = 0; i < count; i++) {
      const num = d.start_number + i;
      const tagCode = formatTagNumber(d.prefix || '', num, d.pad_length || 0);
      const normalizedCode = normalizeTagCode(tagCode);

      // Check exact match or unpadded numeric match if no prefix
      let matchedBills = billIndex.get(normalizedCode) || [];
      if (matchedBills.length === 0 && !d.prefix) {
        const unpaddedNorm = String(num);
        if (unpaddedNorm !== normalizedCode) {
          matchedBills = billIndex.get(unpaddedNorm) || [];
        }
      }

      result.push({
        tagCode,
        normalizedCode,
        numericValue: num,
        dispatchId: d.id,
        sentDate: d.sent_date,
        prefix: d.prefix || '',
        reservoirId: d.reservoir_id,
        reservoirName: d.reservoirs?.name || null,
        locationName: d.locations?.name || null,
        officerName: d.employees?.full_name || null,
        arrived: matchedBills.length > 0,
        matchedBills,
      });
    }
  }

  return result;
}

/**
 * Matches a user-typed single tag string against dispatched tags.
 * Supports exact match (case-insensitive) and numeric match when unambiguous.
 */
export function findMatchingDispatchedTag(
  rawInput: string,
  dispatchedTags: DispatchedTagEntry[]
): DispatchedTagEntry | null {
  const norm = normalizeTagCode(rawInput);
  if (!norm) return null;

  const exact = dispatchedTags.find((t) => t.normalizedCode === norm);
  if (exact) return exact;

  // Fallback: if input is purely numeric, check if a dispatched tag with no prefix matches its integer value
  if (/^\d+$/.test(norm)) {
    const inputNum = parseInt(norm, 10);
    const numMatch = dispatchedTags.find(
      (t) => !t.prefix && t.numericValue === inputNum
    );
    if (numMatch) return numMatch;
  }

  return null;
}
