import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, MapPin } from 'lucide-react';
import PermitStatusBadge from './PermitStatusBadge';

export default function PermitCard({ permit }) {
  return (
    <Link
      to={`/permits/${permit.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition border border-slate-200 overflow-hidden group"
    >
      <div className="p-6">
        {/* Header with Status */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-navy-700 transition">
            {permit.serial_number ? `Permit ${permit.serial_number}` : `Permit #${permit.id}`}
          </h3>
          <PermitStatusBadge status={permit.status} size="sm" />
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
          {permit.location && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin size={14} className="flex-shrink-0 text-slate-400" />
              <span>{permit.location}</span>
            </div>
          )}
          {permit.valid_from && permit.valid_to && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar size={14} className="flex-shrink-0 text-slate-400" />
              <span>
                {new Date(permit.valid_from).toLocaleDateString()} -{' '}
                {new Date(permit.valid_to).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Reinitiation Reason (if applicable) */}
        {permit.rejection_reason && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-xs font-semibold text-red-700 mb-1">Reinitiation Reason:</p>
            <p className="text-xs text-red-600">{permit.rejection_reason}</p>
          </div>
        )}

        {/* Footer with Date and Link */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {new Date(permit.created_at).toLocaleDateString()}
          </p>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-navy-700 transition" />
        </div>
      </div>
    </Link>
  );
}
