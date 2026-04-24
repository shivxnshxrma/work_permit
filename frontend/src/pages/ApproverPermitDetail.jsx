import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { permitsAPI } from '../api/client';
import { Spinner } from '../components/FormElements';
import { Breadcrumb } from '../components/Layout';
import PermitReviewContent, { PermitApprovalTimeline } from '../components/permit/PermitReviewContent';

export default function ApproverPermitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    permitsAPI.approverDetail(id)
      .then(({ data }) => setPermit(data))
      .catch((error) => {
        toast.error(error.response?.data?.detail || 'Permit not found.');
        navigate('/reviews');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size={8} /></div>;
  }

  if (!permit) return null;

  return (
    <>
      <Breadcrumb items={[
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/reviews', label: 'Review Queue' },
        { label: permit.serial_number || `Permit ${permit.id}` },
      ]} />

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Permit Review</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Permit {permit.serial_number || `#${permit.id}`} for {permit.owner_name}
          </p>
        </div>
        <div>
          <button onClick={() => navigate('/reviews')} className="btn-ghost btn-md">
            <ArrowLeft size={14} /> Back to queue
          </button>
        </div>
      </div>

      <PermitReviewContent permit={permit} />
      <div className="mt-4">
        <PermitApprovalTimeline permit={permit} />
      </div>
    </>
  );
}
