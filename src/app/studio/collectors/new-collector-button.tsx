'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CollectorForm } from './collector-form';

export function NewCollectorButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 text-white"><Plus className="mr-1 h-4 w-4" aria-hidden />New collector</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>New collector</DialogTitle></DialogHeader>
        <CollectorForm onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
