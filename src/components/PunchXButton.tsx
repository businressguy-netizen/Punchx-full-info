import React from 'react';
import { Loader2 } from 'lucide-react';

export type PunchXButtonState = 'default' | 'loading' | 'success' | 'disabled';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  success?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

/** Shared production button primitive with deterministic interaction states. */
export default function PunchXButton({
  children,
  loading = false,
  success = false,
  disabled = false,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: Props) {
  const state: PunchXButtonState = loading ? 'loading' : success ? 'success' : disabled ? 'disabled' : 'default';
  const variants = {
    primary: 'bg-[#7358d7] text-white shadow-sm hover:bg-[#6247c7] active:scale-[0.98]',
    secondary: 'border border-[#7358d7]/25 bg-white text-[#7358d7] hover:bg-[#f7f4ff] active:scale-[0.98]',
    ghost: 'bg-transparent text-[#17191d] hover:bg-black/[0.04] active:scale-[0.98]',
    danger: 'bg-[#dc3545] text-white hover:bg-[#c52f3e] active:scale-[0.98]',
  };

  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-punchx-state={state}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7358d7] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {success && !loading && <span aria-hidden="true">✓</span>}
      <span>{children}</span>
    </button>
  );
}
