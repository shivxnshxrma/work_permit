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
          className={`rounded-lg p-4 text-center transition border-2 ${
            activeKey === key ? 'border-navy-700 shadow-sm' : 'border-transparent hover:border-slate-200'
          } ${color}`}
        >
          <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-bold">{stats[key] ?? 0}</p>
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
      className={`w-full text-left rounded-xl border p-4 transition ${
        isActive ? 'border-navy-700 bg-navy-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {permit.serial_number || `Permit #${permit.id}`}
          </p>
          <p className="text-xs text-slate-500 mt-1">{permit.owner_name} · {permit.owner_email}</p>
        </div>
        <PermitStatusBadge status={permit.status} size="sm" />
      </div>

      <div className="mt-3 space-y-1">
        {permit.location && <p className="text-sm text-slate-700">{permit.location}</p>}
        <p className="text-xs text-slate-400">
          {new Date(permit.created_at).toLocaleString()}
        </p>
        {permit.rejection_reason && (
          <p className="text-xs text-red-600 line-clamp-2">{permit.rejection_reason}</p>
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

  useEffect(() => {
    loadDashboardStats();
  }, [refreshKey, refreshCounter, startDate, endDate]);

  useEffect(() => {
    loadPermits(activeFilter);
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
      onDashboardLoaded?.(null);
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
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Permit Statistics</h3>
            <p className="text-sm text-slate-500 mt-1">
              Explore all workflow permits by stage and narrow them by created date.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <label className="text-sm text-slate-600">
              <span className="block text-xs font-medium text-slate-500 mb-1">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="field-input min-w-[160px]"
              />
            </label>
            <label className="text-sm text-slate-600">
              <span className="block text-xs font-medium text-slate-500 mb-1">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="field-input min-w-[160px]"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="btn-ghost btn-md"
            >
              Clear Dates
            </button>
            <button
              type="button"
              onClick={() => setRefreshCounter((value) => value + 1)}
              className="btn-ghost btn-md"
            >
              <RefreshCw size={14} className={loadingStats || loadingList ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <StatSelector activeKey={activeFilter} stats={stats} onSelect={setActiveFilter} />

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Permits</h3>
              <p className="text-xs text-slate-500">Forms in the selected statistics bucket.</p>
            </div>
            <span className="text-xs font-medium text-slate-400">{permits.length}</span>
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
            <div className="text-center py-12">
              <FileText size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-600">No permits in this bucket.</p>
            </div>
          )}
        </div>

        <div>
          {loadingDetail ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              Loading permit detail...
            </div>
          ) : selectedPermit ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedPermit.serial_number || `Permit #${selectedPermit.id}`}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedPermit.owner_name} · {selectedPermit.owner_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedPermit.status === 'approved' && (
                      <button
                        type="button"
                        onClick={handleDownloadApprovedPermit}
                        disabled={downloading}
                        className="btn-ghost btn-md"
                      >
                        <Download size={14} />
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
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              Select a permit to view its full form and workflow details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
