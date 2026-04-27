import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, RotateCcw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';

function ActionModal({
  title,
  description,
  confirmLabel,
  confirmClassName,
  loading,
  value,
  onChange,
  onConfirm,
  onCancel,
  label,
  placeholder,
  required = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label} {required ? <span className="text-red-500">*</span> : null}
          </label>
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            rows="4"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-700 text-sm"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition disabled:bg-slate-400 ${confirmClassName}`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalCard({ permit, onApprove, onReject }) {
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [reinitiateReason, setReinitiateReason] = useState('');

  const availableActions = permit.available_actions || ['approve', 'reinitiate'];
  const canApprove = availableActions.includes('approve');
  const canFinalApprove = availableActions.includes('final_approve');
  const canReinitiate = availableActions.includes('reinitiate');

  const closeModal = () => {
    setActiveModal(null);
    setApprovalReason('');
    setReinitiateReason('');
  };

  const handleApproval = async () => {
    setActionLoading(true);
    try {
      const approvalType = activeModal === 'final_approve' ? 'final_approve' : 'approve';
      const { data } = await client.post(`/permits/approvals/${permit.id}/approve/`, {
        reason: approvalReason.trim(),
        approval_type: approvalType,
      });
      
      // Show special message for final approval
      if (activeModal === 'final_approve') {
        toast.custom((t) => (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="rounded-2xl bg-white shadow-2xl border border-emerald-200 p-8 max-w-sm pointer-events-auto">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Approval Confirmed</h3>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                    PDF copy of your approval has been mailed to the Gate No. 2 facility.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    The permit holder will be notified of the final approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ), {
          duration: 5000,
        });
      } else {
        toast.success(data.detail || 'Permit approved.');
      }
      
      closeModal();
      onApprove?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve permit.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReinitiate = async () => {
    if (!reinitiateReason.trim()) {
      toast.error('Please provide a reason for reinitiation.');
      return;
    }

    setActionLoading(true);
    try {
      const { data } = await client.post(`/permits/approvals/${permit.id}/reject/`, {
        reason: reinitiateReason.trim(),
      });
      toast.success(data.detail || 'Permit sent back for reinitiation.');
      closeModal();
      onReject?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reinitiate permit.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-slate-900">
                Permit {permit.serial_number || `#${permit.id}`}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                From: <span className="font-medium">{permit.owner_name}</span>
              </p>
            </div>
            <div className="shrink-0 self-start rounded-xl bg-slate-50 px-3 py-2 text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stage {permit.current_stage}</p>
              <p className="mt-1 text-xs text-slate-400">{permit.owner_email}</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {permit.location && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                <p className="text-xs text-slate-500">Location</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{permit.location}</p>
              </div>
            )}
            {permit.valid_from && permit.valid_to && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                <p className="text-xs text-slate-500">Valid Period</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {new Date(permit.valid_from).toLocaleDateString()} -{' '}
                  {new Date(permit.valid_to).toLocaleDateString()}
                </p>
              </div>
            )}
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3 sm:col-span-2">
              <p className="text-xs text-slate-500">Submitted</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {new Date(permit.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {canApprove && (
              <button
                type="button"
                onClick={() => setActiveModal('approve')}
                className="min-h-11 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                Approve
              </button>
            )}
            {canFinalApprove && (
              <button
                type="button"
                onClick={() => setActiveModal('final_approve')}
                className="min-h-11 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                Final Approval
              </button>
            )}
            {canReinitiate && (
              <button
                type="button"
                onClick={() => setActiveModal('reinitiate')}
                className="min-h-11 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Reinitiate
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate(`/reviews/${permit.id}`)}
              className="min-h-11 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 flex items-center justify-center gap-2"
            >
              <Eye size={15} />
              View Details
            </button>
          </div>
        </div>
      </div>

      {(activeModal === 'approve' || activeModal === 'final_approve') && (
        <ActionModal
          title={activeModal === 'final_approve' ? 'Confirm final approval' : 'Confirm approval'}
          description={
            activeModal === 'final_approve'
              ? 'This will finalize the permit and mark it as fully approved.'
              : permit.current_stage === 2
                ? 'This records the authority approval, but the permit will still need a final approval from one of the other Stage 2 approvers.'
                : 'Approve this permit and move it forward in the workflow?'
          }
          confirmLabel={activeModal === 'final_approve' ? 'Confirm Final Approval' : 'Confirm Approval'}
          confirmClassName="bg-green-600 hover:bg-green-700"
          loading={actionLoading}
          value={approvalReason}
          onChange={setApprovalReason}
          onConfirm={handleApproval}
          onCancel={closeModal}
          label="Optional note"
          placeholder="Add an optional note for the record..."
        />
      )}

      {activeModal === 'reinitiate' && (
        <ActionModal
          title="Confirm reinitiation"
          description="This will stop the current permit and require the employee to create a new one."
          confirmLabel="Confirm Reinitiation"
          confirmClassName="bg-red-600 hover:bg-red-700"
          loading={actionLoading}
          value={reinitiateReason}
          onChange={setReinitiateReason}
          onConfirm={handleReinitiate}
          onCancel={closeModal}
          label="Reason for reinitiation"
          placeholder="Explain why the permit must be reinitiated..."
          required
        />
      )}
    </>
  );
}
