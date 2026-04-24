import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import ApprovalCard from '../ApprovalCard';
import AdminPermitStatsExplorer from '../admin/AdminPermitStatsExplorer';
import { EmptyState, Spinner } from '../FormElements';

export default function ApproverDashboardPanel() {
  const [loading, setLoading] = useState(true);
  const [permits, setPermits] = useState([]);
  const [approverStages, setApproverStages] = useState([]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryResponse, permitsResponse] = await Promise.all([client.get('/permits/approvals/summary/'), client.get('/permits/approvals/pending/')]);
      setApproverStages(summaryResponse.data.approver_stages || []);
      setPermits(permitsResponse.data.permits || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load your review dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={8} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Review Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            You are assigned to Stage{approverStages.length === 1 ? ` ${approverStages[0]}` : `s ${approverStages.join(', ')}`}.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <AdminPermitStatsExplorer />
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Review Queue</h2>
          <p className="text-sm text-slate-500">Permits currently waiting for your action.</p>
        </div>
        <span className="text-sm font-medium text-slate-400">{permits.length}</span>
      </div>

      {permits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {permits.map((permit) => (
            <ApprovalCard
              key={permit.id}
              permit={permit}
              onApprove={loadDashboard}
              onReject={loadDashboard}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="Review queue is clear"
          subtitle="There are no permits waiting for your approval right now."
        />
      )}
    </div>
  );
}
