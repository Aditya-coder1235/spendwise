import { WalletCards } from 'lucide-react';

export function Logo({ compact = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <WalletCards size={19} strokeWidth={2.25} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="text-[19px] font-bold tracking-[-0.035em] text-ink">
          Spend<span className="text-brand-600 dark:text-brand-400">Wise</span>
        </span>
      )}
    </div>
  );
}
