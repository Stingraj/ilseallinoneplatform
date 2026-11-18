import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { LinkEditor, type LinkRow } from './link-editor';

export const dynamic = 'force-dynamic';

export default async function LinksPage() {
  const supabase = await requireOwnerPage();
  const { data, error } = await supabase.from('website_links').select('id, label, url, is_visible, sort_order').order('sort_order').order('created_at');
  const missing = isMissingSchema(error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Link in bio"
        description="One page for your Instagram bio: your links, a few selected works and the newsletter sign-up. Works, exhibitions and contact are always included."
        actions={<Button asChild variant="outline"><a href="/links" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" aria-hidden />View page</a></Button>}
      />
      {missing ? (
        <SetupNotice title="Link in bio is waiting for the database update">
          Apply supabase/migrations/20261118000000_studio_quick_wins.sql (staging first). Until then /links shows the standard links only.
        </SetupNotice>
      ) : error ? (
        <SetupNotice title="Links could not be loaded">{error.message}</SetupNotice>
      ) : (
        <LinkEditor initial={(data ?? []) as LinkRow[]} />
      )}
    </div>
  );
}
