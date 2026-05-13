import { useEffect, useState } from 'react';
import { Download, FileText, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import PermitStatusBadge from '../PermitStatusBadge';
import PermitReviewContent, { PermitApprovalTimeline } from '../permit/PermitReviewContent';

const STAT_CONFIG = [
  { key: 'total', label: 'Total', color: 'bg-slate-100 text-slate-900' },
  { key: 'stage_1', label: 'Stage 1', color: 'bg-yellow-100 text-yellow-900' },
  { key: 'stage_2', label: 'Stage 2', color: 'bg-orange-100 text-orange-900' },
  { key: 'approved', label: 'Approved', color: 'bg-green-100 text-green-900' },
  { key: 'rejected', label: 'Reinitiated', color: 'bg-red-100 text-red-900' },
];

function StatSelector({ activeKey, stats, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      {STAT_CONFIG.map(({ key, label, color }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={`rounded-2xl p-5 text-left transition-all duration-200 border-2 relative overflow-hidden group ${color} ${activeKey === key ? 'border-vms-700 shadow-md ring-2 ring-vms-700/20' : 'border-transparent hover:brightness-95 hover:shadow-sm'
            }`}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2 opacity-80 group-hover:opacity-100">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{stats[key] ?? 0}</p>
        </button>
      ))}
    </div>
  );
}

function PermitListCard({ permit, isActive, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(permit.id)}
      className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 group ${isActive ? 'border-vms-700 bg-vms-50/30 shadow-md' : 'border-slate-100 bg-white hover:border-vms-200 hover:shadow-sm hover:-translate-y-0.5'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-bold tracking-tight ${isActive ? 'text-vms-900' : 'text-slate-900 group-hover:text-vms-700'}`}>
            {permit.serial_number || `Permit #${permit.id}`}
          </p>
          <p className="text-xs font-medium text-slate-500 mt-1">{permit.owner_name} · {permit.owner_email}</p>
        </div>
        <PermitStatusBadge status={permit.status} size="sm" />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100/60 space-y-2">
        {permit.location && <p className="text-sm font-medium text-slate-700">{permit.location}</p>}
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {new Date(permit.created_at).toLocaleString()}
        </p>
        {permit.rejection_reason && (
          <p className="text-xs font-medium text-rose-600 bg-rose-50 p-2 rounded-lg line-clamp-2 mt-2 border border-rose-100">
            {permit.rejection_reason}
          </p>
        )}
      </div>
    </button>
  );
}

function buildFilterParams(activeFilter, startDate, endDate) {
  const params = { filter: activeFilter };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return params;
}

export default function AdminPermitStatsExplorer({ refreshKey = 0, onDashboardLoaded }) {
  const [activeFilter, setActiveFilter] = useState('total');
  const [stats, setStats] = useState({
    total: 0,
    stage_1: 0,
    stage_2: 0,
    approved: 0,
    rejected: 0,
  });
  const [permits, setPermits] = useState([]);
  const [selectedPermitId, setSelectedPermitId] = useState(null);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const validateDates = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.error('End date cannot be before start date.', { id: 'date-error' });
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (validateDates()) {
      loadDashboardStats();
    }
  }, [refreshKey, refreshCounter, startDate, endDate]);

  useEffect(() => {
    if (validateDates()) {
      loadPermits(activeFilter);
    }
  }, [activeFilter, refreshKey, refreshCounter, startDate, endDate]);

  const loadDashboardStats = async () => {
    setLoadingStats(true);
    try {
      const response = await client.get('/permits/admin/dashboard/', {
        params: buildFilterParams(activeFilter, startDate, endDate),
      });
      setStats(response.data.permits || {});
      onDashboardLoaded?.(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load permit statistics.');
      setStats({
        total: 0,
        stage_1: 0,
        stage_2: 0,
        approved: 0,
        rejected: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadPermits = async (filterKey) => {
    setLoadingList(true);
    setSelectedPermit(null);
    try {
      const response = await client.get('/permits/admin/permits/', {
        params: buildFilterParams(filterKey, startDate, endDate),
      });
      const nextPermits = response.data.permits || [];
      setPermits(nextPermits);
      const nextSelectedId = nextPermits[0]?.id || null;
      setSelectedPermitId(nextSelectedId);
      if (nextSelectedId) {
        loadPermitDetail(nextSelectedId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load permits.');
      setPermits([]);
      setSelectedPermitId(null);
      setSelectedPermit(null);
    } finally {
      setLoadingList(false);
    }
  };

  const loadPermitDetail = async (permitId) => {
    setLoadingDetail(true);
    try {
      const response = await client.get(`/permits/admin/permits/${permitId}/`);
      setSelectedPermit(response.data);
      setSelectedPermitId(permitId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load permit detail.');
      setSelectedPermit(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadApprovedPermit = async () => {
    if (!selectedPermit || selectedPermit.status !== 'approved') return;

    setDownloading(true);
    try {
      const response = await client.get(`/permits/admin/permits/${selectedPermit.id}/download/`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedPermit.serial_number || `permit-${selectedPermit.id}`}.pdf`;
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

  return (
    <div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 transition-shadow hover:shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="text-vms-600" size={20} />
              Permit Statistics
            </h3>
            <p className="text-sm text-slate-500 mt-1.5">
              Explore all workflow permits by stage and filter them by date range.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="field-input min-w-[150px] !py-2 !text-sm bg-white"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field-input min-w-[150px] !py-2 !text-sm bg-white"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="btn-ghost btn-sm h-[38px]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setRefreshCounter((value) => value + 1)}
                className="btn-secondary btn-sm h-[38px]"
              >
                <RefreshCw size={14} className={loadingStats || loadingList ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <StatSelector activeKey={activeFilter} stats={stats} onSelect={setActiveFilter} />

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Permits</h3>
              <p className="text-xs text-slate-500 mt-0.5">Forms in selected bucket.</p>
            </div>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">{permits.length}</span>
          </div>

          {loadingList ? (
            <p className="text-sm text-slate-500 py-10 text-center">Loading permits...</p>
          ) : permits.length > 0 ? (
            <div className="space-y-3 max-h-[125vh] overflow-y-auto pr-1">
              {permits.map((permit) => (
                <PermitListCard
                  key={permit.id}
                  permit={permit}
                  isActive={selectedPermitId === permit.id}
                  onSelect={loadPermitDetail}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText size={32} className="mx-auto text-slate-300 mb-4" />
              <p className="text-sm font-bold text-slate-700">No permits found</p>
              <p className="text-xs text-slate-500 mt-1">Select a different statistic or date range.</p>
            </div>
          )}
        </div>

        <div>
          {loadingDetail ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
              <RefreshCw size={24} className="mx-auto text-vms-300 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-500">Loading permit details...</p>
            </div>
          ) : selectedPermit ? (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 transition-shadow hover:shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                      {selectedPermit.serial_number || `Permit #${selectedPermit.id}`}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mt-2 flex items-center gap-2">
                      <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600">
                        {selectedPermit.owner_name?.[0] || '?'}
                      </span>
                      {selectedPermit.owner_name} <span className="text-slate-300">•</span> {selectedPermit.owner_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedPermit.status === 'approved' && (
                      <button
                        type="button"
                        onClick={handleDownloadApprovedPermit}
                        disabled={downloading}
                        className="btn-secondary btn-sm"
                      >
                        {downloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        {downloading ? 'Downloading...' : 'Download PDF'}
                      </button>
                    )}
                    <PermitStatusBadge status={selectedPermit.status} size="sm" />
                  </div>
                </div>
              </div>

              <PermitReviewContent permit={selectedPermit} />
              <PermitApprovalTimeline permit={selectedPermit} />
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-16 text-center">
              <FileText size={48} className="mx-auto text-slate-200 mb-4" />
              <h4 className="text-base font-bold text-slate-700">No Permit Selected</h4>
              <p className="text-sm text-slate-500 mt-2">
                Select a permit from the list to view its full form and workflow details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
