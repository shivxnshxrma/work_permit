import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import ApprovalCard from '../components/ApprovalCard';
import { Breadcrumb } from '../components/Layout';

export default function ApprovalDashboard() {
  const navigate = useNavigate();
  const [permits, setPermits] = useState([]);
  const [approverStages, setApproverStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchPermits();
  }, []);

  const fetchPermits = async () => {
    try {
      const response = await client.get('/permits/approvals/pending/');
      setPermits(response.data.permits || []);
      setApproverStages(response.data.approver_stages || []);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('You are not configured as an approver.');
        navigate('/dashboard');
      } else {
        toast.error('Failed to load permits.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalChange = () => {
    fetchPermits();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-600">Loading permits for approval...</p>
      </div>
    );
  }

  const filteredPermits = permits.filter((p) => {
    if (filter === 'stage1') return p.current_stage === 1;
    if (filter === 'stage2') return p.current_stage === 2;
    return true;
  });

  return (
    <>
      <Breadcrumb items={[
        { to: '/dashboard', label: 'Dashboard' },
        { label: 'Review Queue' },
      ]} />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-navy-700" />
            Review Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            You can review permits assigned to Stage{approverStages.length === 1 ? ` ${approverStages[0]}` : `s ${approverStages.join(', ')}`}.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex gap-3 flex-wrap">
          {[
            { value: 'pending', label: 'All Reviews' },
            { value: 'stage1', label: 'Stage 1' },
            { value: 'stage2', label: 'Stage 2' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f.value
                  ? 'bg-navy-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filteredPermits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPermits.map((permit) => (
            <ApprovalCard
              key={permit.id}
              permit={permit}
              onApprove={handleApprovalChange}
              onReject={handleApprovalChange}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4 opacity-50" />
          <p className="text-slate-600 text-lg">Your review queue is clear.</p>
          <p className="text-slate-500 text-sm mt-1">No permits are waiting for action in this filter.</p>
        </div>
      )}
    </>
  );
}
