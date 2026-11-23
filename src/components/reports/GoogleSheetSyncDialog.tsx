import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/googleSheetSync';
import {
  useGoogleSheetSyncConfig,
  useSaveGoogleSheetSyncConfig,
  useSyncCollectionBillsToSheet,
} from '@/hooks/useGoogleSheetSync';

interface GoogleSheetSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bills: any[];
  sheetTitle?: string;
}

export function GoogleSheetSyncDialog({
  open,
  onOpenChange,
  bills,
  sheetTitle = 'Collection Bills',
}: GoogleSheetSyncDialogProps) {
  const { data: config } = useGoogleSheetSyncConfig();
  const saveConfig = useSaveGoogleSheetSyncConfig();
  const syncMutation = useSyncCollectionBillsToSheet();

  const [sheetUrl, setSheetUrl] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    if (config) {
      setSheetUrl(config.sheet_url || '');
      setAppsScriptUrl(config.apps_script_url || '');
      setAutoSync(config.auto_sync_enabled ?? true);
    }
  }, [config, open]);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      toast.success('Apps Script code copied! Paste it into Extensions → Apps Script in your Google Sheet.');
      setTimeout(() => setCopiedScript(false), 3000);
    } catch {
      toast.error('Failed to copy script');
    }
  };

  const handleSaveOnly = async () => {
    try {
      await saveConfig.mutateAsync({
        sheet_url: sheetUrl,
        apps_script_url: appsScriptUrl,
        auto_sync_enabled: autoSync,
      });
      toast.success('Google Sheet sync settings saved.');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save sync settings');
    }
  };

  const handleSaveAndSync = async () => {
    if (!appsScriptUrl.trim()) {
      toast.error('Please enter your Google Apps Script Web App URL first.');
      return;
    }

    try {
      const saved = await saveConfig.mutateAsync({
        sheet_url: sheetUrl,
        apps_script_url: appsScriptUrl,
        auto_sync_enabled: autoSync,
      });

      const res = await syncMutation.mutateAsync({
        bills,
        config: saved,
        sheetTitle,
      });

      toast.success(`Synced ${res.rowCount} collection bills to Google Sheet!`);

      if (res.sheetUrl) {
        window.open(res.sheetUrl, '_blank', 'noopener,noreferrer');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to sync with Google Sheet');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            Google Sheet Auto-Sync Setup
          </DialogTitle>
          <DialogDescription>
            Connect your Google Sheet so collection bills automatically sync in the Rate & Valuation format and open in a new tab when clicking Sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="gsheet_url" className="font-bold">
              1. Google Sheet URL (Opens in New Tab on Sync)
            </Label>
            <Input
              id="gsheet_url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apps_script_url" className="font-bold">
              2. Google Apps Script Web App URL (Receives Auto-Sync Data)
            </Label>
            <Input
              id="apps_script_url"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20">
            <div className="space-y-0.5">
              <Label className="font-bold">Auto-Sync Collection Bills</Label>
              <p className="text-xs text-muted-foreground">
                Automatically sync approved collection bills to Google Sheet whenever bills are approved or updated.
              </p>
            </div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>

          {config?.last_synced_at && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span>
                Last synced: <strong>{new Date(config.last_synced_at).toLocaleString()}</strong>
              </span>
              <Badge variant="outline" className="text-emerald-700 border-emerald-500/30">
                {config.last_synced_count || 0} rows
              </Badge>
            </div>
          )}

          {/* Setup Instructions & Script */}
          <div className="rounded-xl border bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold">One-Time Google Sheet Script Setup</h4>
                <p className="text-xs text-muted-foreground">
                  Open your Google Sheet → Extensions → Apps Script → Paste code → Deploy as Web App (Anyone).
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleCopyScript}>
                {copiedScript ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copiedScript ? 'Copied' : 'Copy Apps Script'}
              </Button>
            </div>
            <pre className="text-[10px] leading-relaxed bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto max-h-40">
              {GOOGLE_APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={handleSaveOnly} disabled={saveConfig.isPending}>
            <Save className="h-4 w-4 mr-1.5" />
            Save Settings
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndSync}
            disabled={syncMutation.isPending || saveConfig.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Now & Open Sheet
            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
