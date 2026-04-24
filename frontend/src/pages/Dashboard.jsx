import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText, Plus, Download, Trash2, Eye,
  Calendar, MapPin, Hash, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { permitsAPI } from '../api/client';
import useAuthStore from '../store/authStore';
import { Breadcrumb } from '../components/Layout';
import { Spinner, StatusBadge, EmptyState } from '../components/FormElements';
import ApproverDashboardPanel from '../components/approver/ApproverDashboardPanel';

function PermitCard({ permit, onDelete }) {
  const navigate = useNavigate();

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete permit ${permit.serial_number || permit.id}?`)) return;
    try {
      await permitsAPI.remove(permit.id);
      toast.success('Permit deleted.');
      onDelete(permit.id);
    } catch {
      toast.error('Could not delete permit.');
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!permit.pdf_url) { toast.error('No PDF attached.'); return; }
    try {
      const { data } = await permitsAPI.download(permit.id);
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `permit_${permit.serial_number || permit.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF.');
    }
  };

  return (
    <div
      onClick={() => navigate(`/permits/${permit.id}`)}
      className="permit-card group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-navy-50 rounded-lg flex items-center justify-center
                          flex-shrink-0 group-hover:bg-navy-100 transition-colors">
            <FileText size={16} className="text-navy-700" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900 leading-tight">
              {permit.serial_number || <span className="text-slate-400 italic">No serial</span>}
            </p>
            <p className="text-xs text-slate-400">{permit.owner_name}</p>
          </div>
        </div>
        <StatusBadge status={permit.status} />
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        {permit.location && (
          <span className="flex items-center gap-1.5">
            <MapPin size={11} className="text-slate-400 flex-shrink-0" />
            <span className="capitalize truncate">{permit.location}</span>
          </span>
        )}
        {permit.valid_from && (
          <span className="flex items-center gap-1.5">
            <Calendar size={11} className="text-slate-400 flex-shrink-0" />
            {permit.valid_from} → {permit.valid_to || '…'}
          </span>
        )}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-slate-400 mt-3">
        Created {new Date(permit.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────
function StatsBar({ permits }) {
  const total     = permits.length;
  const submitted = permits.filter((p) => p.status === 'stage_1' || p.status === 'stage_2').length;
  const approved  = permits.filter((p) => p.status === 'approved').length;
  const rejected  = permits.filter((p) => p.status === 'stage_1_rejected' || p.status === 'stage_2_rejected').length;

  const tiles = [
    { label: 'Total',     value: total,     color: 'bg-navy-50  text-navy-700' },
    { label: 'Submitted', value: submitted, color: 'bg-blue-50  text-blue-700' },
    { label: 'Approved',  value: approved,  color: 'bg-green-50 text-green-700' },
    { label: 'Reinitiated',  value: rejected,  color: 'bg-red-50 text-red-700' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {tiles.map(({ label, value, color }) => (
        <div key={label}
          className={`rounded-xl p-4 ${color} border border-current/10`}>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs font-medium mt-1 opacity-70">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [permits, setPermits] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPermits = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await permitsAPI.list();
      setPermits(data);
    } catch {
      toast.error('Could not load permits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPermits(); }, [loadPermits]);

  const handleDelete = (id) => setPermits((prev) => prev.filter((p) => p.id !== id));

  if (user?.approver_stages?.length) {
    return <ApproverDashboardPanel />;
  }

  return (
    <>
      {/* <Breadcrumb items={[{ label: 'Dashboard' }]} /> */}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Work Permits
          </h1>
          {/* <p className="text-sm text-slate-500 mt-0.5">
            Logged in as <span className="font-medium text-slate-700">{user?.full_name}</span>
            {user?.department && ` · ${user.department}`}
          </p> */}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPermits} disabled={loading}
            className="btn-ghost btn-md">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {!user?.approver_stages?.length && (
            <Link to="/permits/new" className="btn-primary btn-md">
              <Plus size={15} /> New Permit
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      {!loading && permits.length > 0 && <StatsBar permits={permits} />}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size={8} />
        </div>
      ) : permits.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No work permits yet"
          subtitle="Fill in your first work permit and it will appear here."
          action={
            !user?.approver_stages?.length ? (
              <Link to="/permits/new" className="btn-primary btn-md">
                <Plus size={15} /> Create first permit
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {permits.map((p) => (
            <PermitCard key={p.id} permit={p} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  );
}
