import { AlertCircle, Clock, CheckCircle, XCircle, Archive } from 'lucide-react';

const STATUS_CONFIG = {
  draft: { icon: Clock, bg: 'bg-slate-100', text: 'text-slate-700', label: 'Draft' },
  submitted: { icon: Clock, bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
  stage_1: { icon: Clock, bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Stage 1 Review' },
  stage_1_rejected: { icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', label: 'Stage 1 Reinitiated' },
  stage_2: { icon: Clock, bg: 'bg-orange-100', text: 'text-orange-700', label: 'Stage 2 Review' },
  stage_2_rejected: { icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', label: 'Stage 2 Reinitiated' },
  approved: { icon: CheckCircle, bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
  cancelled: { icon: Archive, bg: 'bg-slate-100', text: 'text-slate-600', label: 'Cancelled' },
};

export default function PermitStatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div className={`${config.bg} ${config.text} rounded-full font-medium inline-flex items-center gap-2 ${sizeClasses[size]}`}>
      <Icon size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />
      {config.label}
    </div>
  );
}
