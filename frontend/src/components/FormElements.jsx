import { Info } from 'lucide-react';
import { cn } from '../utils/cn';

// Controlled input with label + error
export function Field({ label, error, required, className = '', children, ...props }) {
  const id = props.id || props.name;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {required && <span className="text-red-500 normal-case">*</span>}
        </label>
      )}
      {children || (
        <input
          id={id}
          className={cn(
            "field-input transition-all duration-200 focus:ring-2 focus:ring-vms-500/20 hover:border-vms-300",
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
          )}
          {...props}
        />
      )}
      {error && <p className="field-error animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
}

// Grid wrapper with responsive columns
export function FieldGrid({ cols = 2, children, className = '' }) {
  const colMap = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' };
  return (
    <div className={cn(`grid ${colMap[cols] || 'grid-cols-2'} gap-5`, className)}>
      {children}
    </div>
  );
}

// Yes / No toggle button pair
export function YesNo({ id, value, onChange }) {
  return (
    <div className="flex gap-2">
      {['Yes', 'No'].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? '' : opt)}
          className={cn(
            "px-5 py-2 rounded-xl border text-sm font-semibold transition-all duration-200 active:scale-95",
            value === opt
              ? opt === 'Yes'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm shadow-emerald-500/20'
                : 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm shadow-rose-500/20'
              : 'bg-white border-vms-border text-vms-muted hover:border-vms-300 hover:bg-vms-shell'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// Checkbox pill
export function CheckPill({ label, checked, onChange }) {
  return (
    <label className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all duration-200 select-none",
      checked
        ? 'border-vms-600 bg-vms-50 text-vms-800 shadow-sm shadow-vms-500/10'
        : 'border-vms-border text-vms-body hover:border-vms-300 hover:bg-vms-shell'
    )}>
      <input
        type="checkbox"
        className="w-4 h-4 accent-vms-600 rounded border-vms-border transition-all duration-200"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// Section separator
export function SectionLabel({ children }) {
  return <div className="section-label text-vms-800 font-semibold tracking-tight">{children}</div>;
}

export function InfoHint({ text }) {
  return (
    <span className="relative inline-flex items-center group">
      <button
        type="button"
        tabIndex={-1}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-vms-border text-vms-muted bg-white hover:text-vms-700 hover:border-vms-400 transition-colors"
      >
        <Info size={12} />
      </button>
      <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-56 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium leading-relaxed text-white shadow-lg group-hover:block">
        {text}
      </span>
    </span>
  );
}

// Spinner
export function Spinner({ size = 5 }) {
  return (
    <svg
      className={`animate-spin w-${size} h-${size} text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-vms-tint text-vms-700">
        <Spinner size={6} />
      </div>
      <p className="text-sm font-medium text-vms-body">{label}</p>
    </div>
  );
}

// Status badge
export function StatusBadge({ status }) {
  const map = {
    approved:  'bg-emerald-100 text-emerald-800 border-emerald-200',
    draft:     'bg-vms-tint text-vms-body border-vms-border',
    stage_1_rejected:  'bg-rose-100 text-rose-800 border-rose-200',
    stage_2_rejected:  'bg-rose-100 text-rose-800 border-rose-200',
    pending:   'bg-amber-100 text-amber-800 border-amber-200'
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold border", map[status] || map['draft'])}>
      {status === 'stage_1_rejected' ? 'Stage 1 Reinitiated' :
       status === 'stage_2_rejected' ? 'Stage 2 Reinitiated' :
       status.toUpperCase()}
    </span>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-vms-tint rounded-full flex items-center justify-center mb-4">
        <Icon size={24} className="text-vms-muted" />
      </div>
      <p className="font-semibold text-vms-body mb-1">{title}</p>
      <p className="text-sm text-vms-muted mb-6 max-w-xs">{subtitle}</p>
      {action}
    </div>
  );
}

export function AuthFooter() {
  return (
    <p className="mt-6 text-center text-xs font-medium text-vms-100/80">
      Copyright &copy; 2026 Work Permit System. Powered by M-Neo.
    </p>
  );
}

export function AppLogo({ className = '' }) {
  return (
    <img
      src="/mneo.png"
      alt="Mneo logo"
      className={cn('h-10 w-10 object-contain', className)}
    />
  );
}
