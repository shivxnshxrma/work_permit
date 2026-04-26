import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import ApprovalCard from '../components/ApprovalCard';
import { Breadcrumb } from '../components/Layout';
import { Spinner } from '../components/FormElements';

export default function ApprovalDashboard() {
  const navigate = useNavigate();
  const [permits, setPermits] = useState([]);
  const [approverStages, setApproverStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPermits = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await client.get('/permits/approvals/pending/');
      setPermits(response.data.permits || []);
      setApproverStages(response.data.approver_stages || []);
      if (silent) toast.success('Queue refreshed.');
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('You are not configured as an approver.');
        navigate('/dashboard');
      } else {
        toast.error('Failed to load permits.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchPermits();
  }, [fetchPermits]);

  const stageLabel = approverStages.length === 1
    ? `Stage ${approverStages[0]}`
    : `Stages ${approverStages.join(' & ')}`;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={8} />
      </div>
    );
  }

  return (
    <>
      <Breadcrumb items={[
        { to: '/dashboard', label: 'Dashboard' },
        { label: 'Review Queue' },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-navy-700" />
            Review Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Showing permits pending your action as a{' '}
            <span className="font-semibold text-navy-700">{stageLabel}</span> approver.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live count badge */}
          {permits.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-50 text-navy-700 text-xs font-bold border border-navy-100">
              <ShieldCheck size={12} />
              {permits.length} pending
            </span>
          )}
          <button
            onClick={() => fetchPermits({ silent: true })}
            disabled={refreshing}
            className="btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Permit Cards */}
      {permits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {permits.map((permit) => (
            <ApprovalCard
              key={permit.id}
              permit={permit}
              onApprove={() => fetchPermits({ silent: true })}
              onReject={() => fetchPermits({ silent: true })}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4 opacity-70" />
          <h4 className="text-base font-bold text-slate-700">Queue is clear</h4>
          <p className="text-sm text-slate-500 mt-2">
            No permits are currently waiting for your review as a {stageLabel} approver.
          </p>
          <button
            onClick={() => fetchPermits({ silent: true })}
            disabled={refreshing}
            className="btn-ghost btn-sm mt-6 mx-auto"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Check for new permits
          </button>
        </div>
      )}
    </>
  );
}
