import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import ApprovalCard from '../components/ApprovalCard';
import { Breadcrumb } from '../components/Layout';
import { Spinner } from '../components/FormElements';
import SignatureUploadCard from '../components/approver/SignatureUploadCard';

export default function ApprovalDashboard() {
  const navigate = useNavigate();
  const [permits, setPermits] = useState([]);
  const [approverStages, setApproverStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPermits = useCallback(async ({ silent = false } = {}) => {
    if (startDate && endDate && startDate > endDate) {
      toast.error('End date cannot be before start date.', { id: 'approver-date-error' });
      return;
    }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await client.get('/permits/approvals/pending/', {
        params: {
          ...(startDate ? { start_date: startDate } : {}),
          ...(endDate ? { end_date: endDate } : {}),
        },
      });
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
  }, [navigate, startDate, endDate]);

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
            <ClipboardCheck size={18} className="text-vms-700" />
            Review Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Showing permits pending your action as a{' '}
            <span className="font-semibold text-vms-700">{stageLabel}</span> approver.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live count badge */}
          {permits.length > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vms-50 text-vms-700 text-xs font-bold border border-vms-100">
              <ShieldCheck size={12} />
              {permits.length} pending
            </span>
          )}
          <div className="hidden lg:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              max={endDate || undefined}
              className="field-input min-w-[140px] !py-2 !text-sm bg-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
              className="field-input min-w-[140px] !py-2 !text-sm bg-white"
            />
          </div>
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

      <div className="mb-6 flex flex-wrap items-center gap-2 lg:hidden">
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          max={endDate || undefined}
          className="field-input min-w-[150px] !py-2 !text-sm bg-white"
        />
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          min={startDate || undefined}
          className="field-input min-w-[150px] !py-2 !text-sm bg-white"
        />
      </div>

      <SignatureUploadCard className="mb-8" />

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
