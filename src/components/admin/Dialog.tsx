import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { buttonBaseStyle } from '../../styles';

type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ open, title, onClose, children }: DialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    closeRef.current?.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-white border-4 border-neutral-900 w-full max-w-lg p-6 shadow-[10px_10px_0_0_rgba(23,23,23,1)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4 gap-4">
          <h2 id={titleId} className="text-xl font-black">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${buttonBaseStyle} p-2`}
            aria-label="Itxi"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
