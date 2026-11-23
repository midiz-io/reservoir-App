import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, AlertTriangle, ChevronDown, Hash, Search, Calendar } from 'lucide-react';
import { useTagDispatches } from '@/hooks/useTagDispatches';
import { useAssociationBills } from '@/hooks/useAssociationBills';
import {
  buildDispatchedTagsList,
  findMatchingDispatchedTag,
  parseBillTags,
  DispatchedTagEntry,
} from '@/lib/tagUtils';
import { cn } from '@/lib/utils';

interface TagNumberInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  reservoirId?: string | null;
  excludeBillId?: string | null;
  placeholder?: string;
  className?: string;
  /** When true, clicking a suggestion appends it to a comma-separated list instead of replacing */
  allowMultiple?: boolean;
}

export function TagNumberInput({
  id,
  value,
  onChange,
  reservoirId,
  excludeBillId,
  placeholder = 'Tag Number',
  className,
  allowMultiple = false,
}: TagNumberInputProps) {
  const [open, setOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const { data: dispatches } = useTagDispatches();
  const { data: bills } = useAssociationBills();

  const dispatchedTags = useMemo(
    () => buildDispatchedTagsList(dispatches, bills),
    [dispatches, bills]
  );

  // Match all entered tags (handles comma-separated tags too)
  const enteredTags = useMemo(() => parseBillTags(value), [value]);

  const tagMatchStatuses = useMemo(() => {
    return enteredTags.map((raw) => {
      const matched = findMatchingDispatchedTag(raw, dispatchedTags);
      if (!matched) {
        return { raw, status: 'unregistered' as const, matched: null };
      }
      const otherBills = matched.matchedBills.filter((b) => b.billId !== excludeBillId);
      if (otherBills.length > 0) {
        return { raw, status: 'duplicate' as const, matched, otherBills };
      }
      return { raw, status: 'matched' as const, matched };
    });
  }, [enteredTags, dispatchedTags, excludeBillId]);

  // Sort suggestions: pending tags for this reservoir first, then other pending tags, then arrived tags
  const suggestions = useMemo(() => {
    const q = (dropdownSearch || (!allowMultiple ? value : '')).trim().toLowerCase();

    const filtered = dispatchedTags.filter((t) => {
      if (!q) return true;
      return (
        t.tagCode.toLowerCase().includes(q) ||
        (t.reservoirName || '').toLowerCase().includes(q) ||
        t.sentDate.includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const aArrived = a.matchedBills.some((m) => m.billId !== excludeBillId);
      const bArrived = b.matchedBills.some((m) => m.billId !== excludeBillId);
      if (aArrived !== bArrived) return aArrived ? 1 : -1;

      if (reservoirId) {
        const aResMatch = a.reservoirId === reservoirId ? 0 : 1;
        const bResMatch = b.reservoirId === reservoirId ? 0 : 1;
        if (aResMatch !== bResMatch) return aResMatch - bResMatch;
      }

      return a.numericValue - b.numericValue;
    });

    return sorted.slice(0, 60);
  }, [dispatchedTags, dropdownSearch, value, allowMultiple, reservoirId, excludeBillId]);

  const handleSelectTag = (entry: DispatchedTagEntry) => {
    if (allowMultiple) {
      const existing = parseBillTags(value);
      const alreadyInInput = existing.some(
        (t) => t.toUpperCase() === entry.tagCode.toUpperCase()
      );
      if (!alreadyInInput) {
        onChange(existing.length > 0 ? `${existing.join(', ')}, ${entry.tagCode}` : entry.tagCode);
      }
    } else {
      onChange(entry.tagCode);
      setOpen(false);
    }
    setDropdownSearch('');
  };

  const handleInputChange = (nextVal: string) => {
    // Auto-select canonical tag casing/prefix if user typed exact match
    if (!allowMultiple) {
      const match = findMatchingDispatchedTag(nextVal, dispatchedTags);
      if (match && nextVal.trim().toUpperCase() === match.normalizedCode) {
        onChange(match.tagCode);
        return;
      }
    }
    onChange(nextVal);
  };

  const hasDispatches = dispatchedTags.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Input
            id={id}
            value={value}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className={cn('font-mono', className)}
          />
        </div>
        {hasDispatches && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 px-2.5 shrink-0 border-2 text-xs font-semibold gap-1"
                title="Select from sent tag numbers"
              >
                <Hash className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Sent Tags</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                    placeholder="Search sent tag number..."
                    className="h-8 pl-8 text-xs"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No matching sent tags found.
                    </p>
                  ) : (
                    suggestions.map((entry) => {
                      const usedOnOther = entry.matchedBills.filter((b) => b.billId !== excludeBillId);
                      const isUsed = usedOnOther.length > 0;
                      const isSelected = enteredTags.some(
                        (t) => t.toUpperCase() === entry.tagCode.toUpperCase()
                      );

                      return (
                        <button
                          key={`${entry.dispatchId}-${entry.tagCode}`}
                          type="button"
                          onClick={() => handleSelectTag(entry)}
                          className={cn(
                            'w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center justify-between gap-2 transition-colors',
                            isSelected
                              ? 'bg-primary/15 border border-primary/40'
                              : isUsed
                              ? 'bg-muted/40 opacity-70 hover:bg-muted'
                              : 'hover:bg-primary/10'
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-foreground">
                                {entry.tagCode}
                              </span>
                              {entry.reservoirName && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  ({entry.reservoirName})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              <span>Sent: {entry.sentDate}</span>
                            </div>
                          </div>
                          {isUsed ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                              Arrived (#{usedOnOther[0].billNo})
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] px-1.5 py-0 shrink-0">
                              Available
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Live Match Status Pills */}
      {tagMatchStatuses.length > 0 && hasDispatches && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tagMatchStatuses.map((item, idx) => {
            if (item.status === 'matched' && item.matched) {
              return (
                <Badge
                  key={`${item.raw}-${idx}`}
                  className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-medium gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>
                    {item.matched.tagCode} matched (Sent {item.matched.sentDate}) — Arrived
                  </span>
                </Badge>
              );
            }
            if (item.status === 'duplicate' && item.matched && item.otherBills) {
              return (
                <Badge
                  key={`${item.raw}-${idx}`}
                  className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] font-medium gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>
                    {item.matched.tagCode} already used on Bill #{item.otherBills[0].billNo}
                  </span>
                </Badge>
              );
            }
            return (
              <Badge
                key={`${item.raw}-${idx}`}
                variant="outline"
                className="text-[11px] text-muted-foreground font-normal"
              >
                {item.raw}: Not in sent tag ranges
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
