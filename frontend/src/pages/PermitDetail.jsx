import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, FileText, Download, Printer, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { permitsAPI } from '../api/client';
import { Breadcrumb } from '../components/Layout';
import { Spinner } from '../components/FormElements';
import PermitStatusBadge from '../components/PermitStatusBadge';
import PermitReviewContent, { PermitApprovalTimeline } from '../components/permit/PermitReviewContent';

function canCancelPermit(status) {
  return !['stage_1_rejected', 'stage_2_rejected', 'approved', 'cancelled'].includes(status);
}

export default function PermitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [permit, setPermit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    permitsAPI.detail(id)
      .then(({ data }) => setPermit(data))
      .catch(() => { toast.error('Permit not found.'); navigate('/dashboard'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!window.confirm('Cancel this permit?')) return;
    setCancelling(true);
    try {
      await permitsAPI.cancel(id);
      toast.success('Permit cancelled.');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Could not cancel permit.');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await permitsAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${permit.serial_number || `permit_${permit.id}`}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to download permit PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const { data } = await permitsAPI.download(id);
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        toast.error('Unable to open print preview.');
        return;
      }
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to print permit PDF.');
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size={8} /></div>
  );
  if (!permit) return null;

  return (
    <>
      <Breadcrumb items={[
        { to: '/dashboard', label: 'Dashboard' },
        { label: `Permit ${permit.serial_number || permit.id}` },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-vms-50 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-vms-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {permit.serial_number || `Permit #${permit.id}`}
              </h1>
              <PermitStatusBadge status={permit.status} size="sm" />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Saved {new Date(permit.created_at).toLocaleString()} by {permit.owner_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost btn-md">
            <ArrowLeft size={14} /> Back
          </button>
          {(permit.status === 'stage_1_rejected' || permit.status === 'stage_2_rejected') && (
            <button onClick={() => navigate(`/permits/${permit.id}/edit`)} className="btn-secondary btn-md">
              <Edit size={14} /> Re-edit & Resubmit
            </button>
          )}
          {['approved'].includes(permit.status) && (
            <button onClick={handleDownload} disabled={downloading} className="btn-secondary btn-md">
              {downloading ? <Spinner size={4} /> : <Download size={14} />} {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
          )}
          {/* {canCancelPermit(permit.status) && (
            <button onClick={handleCancel} disabled={cancelling} className="btn-danger btn-md">
              {cancelling ? <Spinner size={4} /> : <XCircle size={14} />} {cancelling ? 'Cancelling...' : 'Cancel Permit'}
            </button>
          )} */}
        </div>
      </div>

      <PermitReviewContent permit={permit} />
      <div className="mt-4">
        <PermitApprovalTimeline permit={permit} />
      </div>
    </>
  );
}
