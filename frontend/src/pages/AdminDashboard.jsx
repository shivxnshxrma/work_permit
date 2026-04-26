import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BarChart3, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import ApproversManager from '../components/ApproversManager';
import AdminPermitStatsExplorer from '../components/admin/AdminPermitStatsExplorer';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!localStorage.getItem('admin_id')) {
      navigate('/admin/login', { replace: true });
      return;
    }
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const response = await client.get('/permits/admin/dashboard/');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('Log out of the admin dashboard?')) return;
    try { await client.post('/auth/logout/'); } catch { /* ignore */ }
    localStorage.removeItem('user');
    localStorage.removeItem('admin_id');
    localStorage.removeItem('admin_email');
    toast.success('Logged out.');
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-900 via-[#12263e] to-navy-800 border-b border-navy-800 shadow-md relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10">
              <BarChart3 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
              <p className="text-sm text-navy-200 mt-0.5">Manage approvers and permit workflow</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/10 backdrop-blur-md active:scale-95"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2 py-4 border-b-[3px] font-semibold text-sm transition-all duration-200 ${activeTab === 'dashboard'
                  ? 'border-navy-700 text-navy-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className={activeTab === 'dashboard' ? 'text-navy-600' : ''} />
                Statistics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('approvers')}
              className={`px-2 py-4 border-b-[3px] font-semibold text-sm transition-all duration-200 ${activeTab === 'approvers'
                  ? 'border-navy-700 text-navy-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} className={activeTab === 'approvers' ? 'text-navy-600' : ''} />
                Approvers
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && stats && (
          <div>
            <AdminPermitStatsExplorer onDashboardLoaded={setStats} />

            {/* Approver Stats */}
            <div className="mt-8">
              <h3 className="text-base font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2 px-1">
                <Users className="text-navy-600" size={18} />
                Approvers Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Stage 1 Card */}
                <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-slate-100 shadow-sm transition-all hover:shadow-lg hover:border-navy-200 hover:-translate-y-1 group cursor-pointer">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.04] transition-all duration-700 text-navy-900 group-hover:scale-110">
                    <Users size={120} />
                  </div>
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Stage 1 Approvers</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black tracking-tight text-slate-900">{stats.approvers.stage_1}</p>
                        <p className="text-sm font-bold text-slate-400">/ 3 assigned</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-600 flex items-center justify-center font-black text-xl border border-navy-100">
                      1
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 relative z-10 overflow-hidden mb-4">
                    <div className="bg-navy-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(stats.approvers.stage_1 / 3) * 100}%` }} />
                  </div>
                  
                  {/* Stage 1 Approver Names */}
                  <div className="relative z-10 pt-4 border-t border-slate-100">
                    {stats.approvers.stage_1_list && stats.approvers.stage_1_list.length > 0 ? (
                      <div className="space-y-2.5">
                        {stats.approvers.stage_1_list.map((approver) => (
                          <div key={approver.id} className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-navy-50 flex items-center justify-center text-[10px] font-bold text-navy-600 flex-shrink-0 border border-navy-100/50">
                              {approver.name[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 truncate" title={approver.email}>{approver.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No approvers assigned</p>
                    )}
                  </div>
                </div>

                {/* Stage 2 Card */}
                <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-slate-100 shadow-sm transition-all hover:shadow-lg hover:border-emerald-200 hover:-translate-y-1 group cursor-pointer">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:opacity-[0.04] transition-all duration-700 text-emerald-900 group-hover:scale-110">
                    <Users size={120} />
                  </div>
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Stage 2 Approvers</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black tracking-tight text-slate-900">{stats.approvers.stage_2}</p>
                        <p className="text-sm font-bold text-slate-400">/ 3 assigned</p>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl border border-emerald-100">
                      2
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 relative z-10 overflow-hidden mb-4">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${(stats.approvers.stage_2 / 3) * 100}%` }} />
                  </div>

                  {/* Stage 2 Approver Names */}
                  <div className="relative z-10 pt-4 border-t border-slate-100">
                    {stats.approvers.stage_2_list && stats.approvers.stage_2_list.length > 0 ? (
                      <div className="space-y-2.5">
                        {stats.approvers.stage_2_list.map((approver) => (
                          <div key={approver.id} className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-bold text-emerald-600 flex-shrink-0 border border-emerald-100/50">
                              {approver.name[0]?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm font-semibold text-slate-700 truncate" title={approver.email}>{approver.name}</span>
                            {approver.requires_reason && (
                              <span className="ml-auto inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
                                Auth
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No approvers assigned</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'approvers' && (
          <ApproversManager onApproverChange={fetchStats} />
        )}
      </div>
    </div>
  );
}
