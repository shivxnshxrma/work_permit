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
    if (!localStorage.getItem('admin_id') || !localStorage.getItem('access')) {
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

  const handleLogout = () => {
    if (!window.confirm('Log out of the admin dashboard?')) return;
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
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
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Manage approvers and permit workflow</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-800 transition"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-1 py-4 border-b-2 font-medium text-sm transition ${
                activeTab === 'dashboard'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={16} />
                Statistics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('approvers')}
              className={`px-1 py-4 border-b-2 font-medium text-sm transition ${
                activeTab === 'approvers'
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users size={16} />
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
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h3 className="text-md font-semibold text-slate-900 mb-4">Approvers</h3>
              <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <p className="text-slate-600 text-sm mb-1">Stage 1 Approvers</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.approvers.stage_1}/3</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-slate-600 text-sm mb-1">Stage 2 Approvers</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.approvers.stage_2}/3</p>
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
