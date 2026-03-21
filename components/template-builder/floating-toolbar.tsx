'use client';

import { BringToFront, Copy, SendToBack, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingToolbarProps {
  disabled?: boolean;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onDelete: () => void;
}

export function FloatingToolbar({
  disabled,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onDelete,
}: FloatingToolbarProps) {
  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
      <Button size="icon-sm" variant="ghost" disabled={disabled} onClick={onDuplicate}>
        <Copy className="h-4 w-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" disabled={disabled} onClick={onBringToFront}>
        <BringToFront className="h-4 w-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" disabled={disabled} onClick={onSendToBack}>
        <SendToBack className="h-4 w-4" />
      </Button>
      <Button size="icon-sm" variant="ghost" disabled={disabled} onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
