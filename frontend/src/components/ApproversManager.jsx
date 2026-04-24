import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';

export default function ApproversManager({ onApproverChange }) {
  const [approvers, setApprovers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedStage, setSelectedStage] = useState('1');
  const [selectedUser, setSelectedUser] = useState('');
  const [requiresApprovalReason, setRequiresApprovalReason] = useState(false);
  const [counts, setCounts] = useState({ stage_1: 0, stage_2: 0 });

  useEffect(() => {
    fetchApprovers();
    fetchUsers();
  }, []);

  const fetchApprovers = async () => {
    try {
      const response = await client.get('/permits/admin/approvers/');
      setApprovers(response.data.approvers);
      setCounts(response.data.counts);
    } catch (error) {
      toast.error('Failed to load approvers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await client.get('/auth/users/');
      setUsers(response.data || []);
    } catch (error) {
      setUsers([]);
    }
  };

  const getAssignedUserIds = () => {
    return approvers.map((a) => a.user).filter(Boolean);
  };

  const getUsersInStage = (stage) => {
    return approvers
      .filter((a) => a.stage === parseInt(stage))
      .map((a) => a.user)
      .filter(Boolean);
  };

  const getAvailableUsers = () => {
    const assignedUsers = getAssignedUserIds();
    const usersInStage = getUsersInStage(selectedStage);
    
    return users.filter(
      (user) => !assignedUsers.includes(user.id) && !usersInStage.includes(user.id)
    );
  };

  const handleAddApprover = async () => {
    if (!selectedUser) {
      toast.error('Please select a user.');
      return;
    }

    const stage = parseInt(selectedStage);
    const stageKey = `stage_${stage}`;
    if (counts[stageKey] >= 3) {
      toast.error(`Maximum 3 approvers for Stage ${stage}.`);
      return;
    }

    setAdding(true);
    try {
      await client.post('/permits/admin/approvers/', {
        user: Number(selectedUser),
        stage: stage,
        requires_reason_on_approval: requiresApprovalReason,
      });
      toast.success('Approver added successfully!');
      setSelectedUser('');
      setRequiresApprovalReason(false);
      fetchApprovers();
      onApproverChange?.();
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to add approver.';
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveApprover = async (approverId) => {
    if (!window.confirm('Remove this approver?')) return;

    try {
      await client.delete(`/permits/admin/approvers/${approverId}/`);
      toast.success('Approver removed.');
      fetchApprovers();
      onApproverChange?.();
    } catch (error) {
      toast.error('Failed to remove approver.');
    }
  };

  const handleToggleAuthorityApprover = async (approver) => {
    try {
      await client.patch(`/permits/admin/approvers/${approver.id}/`, {
        requires_reason_on_approval: !approver.requires_reason_on_approval,
      });
      toast.success('Stage 2 authority approver updated.');
      fetchApprovers();
      onApproverChange?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update authority approver.');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Loading approvers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add Approver Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Add Approver</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Stage */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Stage</label>
            <select
            value={selectedStage}
            onChange={(e) => {
              setSelectedStage(e.target.value);
              setSelectedUser('');
              setRequiresApprovalReason(false);
            }}
            className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
            >
            <option value="1">Stage 1</option>
            <option value="2">Stage 2</option>
            </select>
        </div>

        {/* User */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select User</label>
            {users.length === 0 ? (
              <input
                type="email"
                placeholder="approver@dsgroup.com"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            ) : (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500"
              >
                <option value="">-- Select a user --</option>
                {getAvailableUsers().length > 0 ? (
                  getAvailableUsers().map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))
                ) : (
                  <option disabled>No available users</option>
                )}
              </select>
            )}
            {/* <p className="text-xs text-slate-500 mt-1">
              {getAvailableUsers().length === 0 && users.length > 0
                ? 'All users are already assigned or already in this stage.'
                : 'Only users not assigned to any stage are shown.'}
            </p> */}
        </div>

        {/* {selectedStage === '2' && (
          <div className="md:col-span-3">
            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={requiresApprovalReason}
                onChange={(e) => setRequiresApprovalReason(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-navy-700"
              />
              Require this Stage 2 approver to add an approval note before approving
            </label>
          </div>
        )} */}

        {/* Button */}
        <div>
            <button
            onClick={handleAddApprover}
            disabled={adding}
            className="w-full h-10 px-4 bg-navy-700 text-white rounded-lg hover:bg-navy-800 disabled:bg-slate-400 transition flex items-center justify-center gap-2"
            >
            {adding ? <Loader size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {adding ? 'Adding...' : 'Add Approver'}
            </button>
        </div>
        </div>
      </div>

      {/* Approvers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((stage) => (
          <div key={stage} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-slate-900">Stage {stage} Approvers</h4>
              <span className="bg-slate-100 px-3 py-1 rounded-full text-sm font-medium text-slate-700">
                {counts[`stage_${stage}`]}/3
              </span>
            </div>

            <div className="space-y-2">
              {approvers.filter((a) => a.stage === stage).length > 0 ? (
                approvers
                  .filter((a) => a.stage === stage)
                  .map((approver) => (
                    <div
                      key={approver.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">{approver.user_name}</p>
                          {approver.stage === 2 && approver.requires_reason_on_approval && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              Authority approver
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{approver.user_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {approver.stage === 2 && (
                          <button
                            type="button"
                            onClick={() => handleToggleAuthorityApprover(approver)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                              approver.requires_reason_on_approval
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {approver.requires_reason_on_approval ? 'Unset authority' : 'Set authority'}
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveApprover(approver.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Remove approver"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-slate-500 italic">No approvers assigned yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
