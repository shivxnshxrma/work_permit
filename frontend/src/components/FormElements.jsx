import { Info } from 'lucide-react';

// Controlled input with label + error
export function Field({ label, error, required, className = '', children, ...props }) {
  const id = props.id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="field-label">
          {label} {required && <span className="text-red-500 normal-case">*</span>}
        </label>
      )}
      {children || (
        <input
          id={id}
          className={`field-input ${error ? 'error' : ''}`}
          {...props}
        />
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// Grid wrapper with responsive columns
export function FieldGrid({ cols = 2, children, className = '' }) {
  const colMap = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' };
  return (
    <div className={`grid ${colMap[cols] || 'grid-cols-2'} gap-4 ${className}`}>
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
          className={`px-4 py-1.5 rounded-full border text-xs font-semibold transition-all ${
            value === opt
              ? opt === 'Yes'
                ? 'bg-green-100 border-green-500 text-green-700'
                : 'bg-red-100 border-red-500 text-red-600'
              : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'
          }`}
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
    <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs
                       font-medium cursor-pointer transition-all select-none ${
      checked
        ? 'border-navy-700 bg-navy-50 text-navy-700'
        : 'border-slate-200 text-slate-500 hover:border-navy-300'
    }`}>
      <input
        type="checkbox"
        className="w-4 h-4 accent-navy-700 rounded border-slate-300"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

// Section separator
export function SectionLabel({ children }) {
  return <div className="section-label text-navy-700">{children}</div>;
}

export function InfoHint({ text }) {
  return (
    <span className="relative inline-flex items-center group">
      <button
        type="button"
        tabIndex={-1}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-slate-300 text-slate-500 bg-white hover:text-navy-700 hover:border-navy-400 transition-colors"
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

// Status badge
export function StatusBadge({ status }) {
  const map = {
    approved:  'badge-approved',
    draft:     'badge-draft',
    stage_1_rejected:  'badge-rejected',
    stage_2_rejected:  'badge-rejected',
  };
  return (
    <span className={`badge ${map[status] || 'badge-draft'}`}>
      {status === 'stage_1_rejected' ? 'Stage 1 Reinitiated' :
       status === 'stage_2_rejected' ? 'Stage 2 Reinitiated' :
       map[status]?.replace('badge-', '').toUpperCase() || status.toUpperCase()}
    </span>
  );
}

// Empty state
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Icon size={24} className="text-slate-400" />
      </div>
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">{subtitle}</p>
      {action}
    </div>
  );
}
