import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FileText, Eye, XCircle, Calendar, MapPin, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import PermitStatusBadge from './PermitStatusBadge';
import { permitsAPI } from '../api/client';
import { Spinner } from './FormElements';

function canCancelPermit(status) {
  return !['stage_1_rejected', 'stage_2_rejected', 'approved', 'cancelled'].includes(status);
}

export default function EmployeePermitCard({ permit, onCancelled }) {
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async (event) => {
    event.stopPropagation();
    if (!canCancelPermit(permit.status)) return;
    if (!window.confirm(`Cancel permit ${permit.serial_number || permit.id}?`)) return;

    setCancelling(true);
    try {
      await permitsAPI.cancel(permit.id);
      toast.success('Permit cancelled.');
      onCancelled?.(permit.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not cancel permit.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div onClick={() => navigate(`/permits/${permit.id}`)} className="permit-card group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-vms-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-vms-100 transition-colors">
            <FileText size={16} className="text-vms-700" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 leading-tight">
              {permit.serial_number || <span className="text-slate-400 italic">No serial</span>}
            </p>
            <p className="text-xs text-slate-400">{permit.owner_name}</p>
          </div>
        </div>
        <PermitStatusBadge status={permit.status} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-4">
        {permit.location && (
          <span className="flex items-center gap-1.5 col-span-2">
            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
            <span className="truncate">{permit.location}</span>
          </span>
        )}
        {permit.valid_from && (
          <span className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-400" />
            {permit.valid_from} → {permit.valid_to || '…'}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Hash size={11} className="text-slate-400" />
          ID {permit.id}
        </span>
      </div>

      {permit.rejection_reason && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-red-700">Reinitiation reason</p>
          <p className="mt-1 text-xs text-red-600">{permit.rejection_reason}</p>
        </div>
      )}

      <p className="text-[10px] text-slate-400 mb-3">
        Created {new Date(permit.created_at).toLocaleString()}
      </p>

      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/permits/${permit.id}`);
          }}
          className="btn-ghost btn-sm gap-1"
        >
          <Eye size={12} /> Review
        </button>
        {canCancelPermit(permit.status) && (
          <button onClick={handleCancel} disabled={cancelling} className="btn-ghost btn-sm gap-1 text-red-500 hover:bg-red-50 ml-auto disabled:opacity-70">
            {cancelling ? <Spinner size={3} /> : <XCircle size={12} />} {cancelling ? 'Cancelling...' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}
