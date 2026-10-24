'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export function PdfPriceSwitch() {
  const supabase = useMemo(() => createClient(), []);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSetting() {
      const { data, error } = await supabase
        .from('site_settings')
        .select('id,show_price_on_pdf')
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error(`Could not load PDF price setting: ${error.message}`);
        return;
      }
      if (data) setEnabled(data.show_price_on_pdf);
    }
    loadSetting();
  }, [supabase]);

  async function handleChange(nextValue: boolean) {
    setSaving(true);
    const { data, error: fetchError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (fetchError || !data) {
      toast.error(fetchError?.message || 'PDF price setting is unavailable');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('site_settings')
      .update({ show_price_on_pdf: nextValue, updated_at: new Date().toISOString() })
      .eq('id', data.id);
    if (error) {
      toast.error(`Could not save PDF price setting: ${error.message}`);
    } else {
      setEnabled(nextValue);
      toast.success(nextValue ? 'PDF prices will be shown' : 'PDF prices will be hidden');
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="text-right">
        <Label htmlFor="show-price-on-pdf" className="text-xs font-semibold text-slate-700">Show prices in PDF exports</Label>
        <p className="text-[10px] text-slate-400">Shared across Dashboard and Catalog</p>
      </div>
      <Switch id="show-price-on-pdf" checked={enabled} disabled={saving} onCheckedChange={handleChange} />
    </div>
  );
}
