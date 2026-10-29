import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/ui/Logo.jsx';
import { Input } from '../components/ui/FormControls.jsx';

export function AuthLayout({ title, description, children, footer }) {
  useEffect(() => {
    document.title = `${title} · SpendWise`;
  }, [title]);

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-[#07241d] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-12">
        <div
          className="absolute -right-28 -top-24 size-[430px] rounded-full border border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute -right-10 top-8 size-[300px] rounded-full border border-white/[0.07]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 h-1/2 w-full bg-[linear-gradient(to_top,rgba(5,150,105,0.14),transparent)]"
          aria-hidden="true"
        />
        <div className="relative z-10">
          <Logo className="[&_span:last-child]:text-white" />
        </div>

        <div className="relative z-10 my-auto max-w-xl py-16">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-emerald-100">
            <ShieldCheck size={14} aria-hidden="true" />
            Private by design
          </p>
          <h1 className="text-[42px] font-bold leading-[1.08] tracking-[-0.045em] xl:text-[52px]">
            Know exactly where your money goes.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-emerald-50/75">
            Track everyday spending, plan monthly budgets, and see the full picture — without
            spreadsheets or guesswork.
          </p>

          <div className="mt-10 grid max-w-md gap-3">
            {[
              ['Everyday clarity', 'Income, expenses, savings, and budgets in one calm view.'],
              ['Plan with intent', 'Monthly limits and category budgets that warn you early.'],
              ['Your data only', 'Every record is private to your account and protected server-side.'],
            ].map(([heading, copy], index) => (
              <div
                key={heading}
                className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.045] p-4"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-400/15 text-[11px] font-bold text-emerald-300">
                  0{index + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold">{heading}</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-50/60">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-emerald-50/45">
          SpendWise · Personal finance, made clear
        </p>
      </aside>

      <main className="flex min-h-dvh flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-20">
        <div className="mb-10 flex items-center justify-between lg:hidden">
          <Logo />
        </div>
        <div className="my-auto mx-auto w-full max-w-[420px] py-6 lg:py-10">
          <div className="mb-7">
            <h2 className="text-[28px] font-bold tracking-[-0.035em] text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
          </div>
          {children}
          {footer && <div className="mt-7 text-center text-sm text-ink-muted">{footer}</div>}
        </div>
        <p className="mt-10 text-center text-[11px] text-ink-subtle lg:text-left">
          © {new Date().getFullYear()} SpendWise. Your financial data stays yours.
        </p>
      </main>
    </div>
  );
}

export function PasswordInput({ id, value, onChange, placeholder, autoComplete, invalid, name }) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="relative">
      <Input
        id={inputId}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        invalid={invalid}
        className="pr-11"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function AuthFooterLink({ prompt, linkText, to }) {
  return (
    <p>
      {prompt}{' '}
      <Link
        to={to}
        className="font-semibold text-brand-700 underline-offset-4 hover:underline dark:text-brand-400"
      >
        {linkText}
      </Link>
    </p>
  );
}
