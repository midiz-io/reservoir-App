import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchSheetSyncConfig,
  GoogleSheetSyncConfig,
  postBillsToGoogleSheet,
  setCachedSheetSyncConfig,
} from '@/lib/googleSheetSync';

const db = supabase as any;

export function useGoogleSheetSyncConfig() {
  return useQuery({
    queryKey: ['google_sheet_sync_config'],
    queryFn: fetchSheetSyncConfig,
  });
}

export function useSaveGoogleSheetSyncConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      config: Partial<GoogleSheetSyncConfig> & {
        sheet_url: string;
        apps_script_url: string;
        auto_sync_enabled: boolean;
      }
    ) => {
      const payload = {
        config_key: 'collection_bills',
        sheet_url: config.sheet_url.trim(),
        apps_script_url: config.apps_script_url.trim(),
        auto_sync_enabled: config.auto_sync_enabled,
        last_synced_at: config.last_synced_at ?? null,
        last_synced_count: config.last_synced_count ?? 0,
      };

      setCachedSheetSyncConfig(payload);

      try {
        const { data, error } = await db
          .from('google_sheet_sync_configs')
          .upsert(payload, { onConflict: 'config_key' })
          .select()
          .single();
        if (error) throw error;
        setCachedSheetSyncConfig(data);
        return data as GoogleSheetSyncConfig;
      } catch {
        // Return cached config if DB migration hasn't been applied yet
        return payload as GoogleSheetSyncConfig;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google_sheet_sync_config'] });
    },
  });
}

export function useSyncCollectionBillsToSheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bills,
      config,
      sheetTitle,
    }: {
      bills: any[];
      config: GoogleSheetSyncConfig;
      sheetTitle?: string;
    }) => {
      if (!config.apps_script_url?.trim()) {
        throw new Error('Google Apps Script Web App URL is not configured.');
      }

      const result = await postBillsToGoogleSheet(
        config.apps_script_url,
        bills,
        sheetTitle || 'Collection Bills'
      );

      const finalSheetUrl = config.sheet_url?.trim() || result.sheetUrl || '';
      const syncedAt = new Date().toISOString();

      const updated: GoogleSheetSyncConfig = {
        ...config,
        sheet_url: finalSheetUrl,
        last_synced_at: syncedAt,
        last_synced_count: result.rowCount,
      };
      setCachedSheetSyncConfig(updated);

      try {
        await db
          .from('google_sheet_sync_configs')
          .upsert(
            {
              config_key: 'collection_bills',
              sheet_url: finalSheetUrl,
              apps_script_url: config.apps_script_url.trim(),
              auto_sync_enabled: config.auto_sync_enabled,
              last_synced_at: syncedAt,
              last_synced_count: result.rowCount,
            },
            { onConflict: 'config_key' }
          );
      } catch {
        // Ignore if table not migrated yet; cache is already updated
      }

      return {
        sheetUrl: finalSheetUrl,
        rowCount: result.rowCount,
        syncedAt,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google_sheet_sync_config'] });
    },
  });
}
