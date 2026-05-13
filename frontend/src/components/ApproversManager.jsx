import { useState, useEffect } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../api/client';
import { PageLoader, Spinner } from './FormElements';

export default function ApproversManager({ onApproverChange }) {
  const [approvers, setApprovers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedStage, setSelectedStage] = useState('1');
  const [selectedUser, setSelectedUser] = useState('');
  const [requiresApprovalReason, setRequiresApprovalReason] = useState(false);
  const [counts, setCounts] = useState({ stage_1: 0, stage_2: 0 });
  const [busyApproverId, setBusyApproverId] = useState(null);
  const [busyAction, setBusyAction] = useState('');

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

    setBusyApproverId(approverId);
    setBusyAction('remove');
    try {
      await client.delete(`/permits/admin/approvers/${approverId}/`);
      toast.success('Approver removed.');
      fetchApprovers();
      onApproverChange?.();
    } catch (error) {
      toast.error('Failed to remove approver.');
    } finally {
      setBusyApproverId(null);
      setBusyAction('');
    }
  };

  const handleToggleAuthorityApprover = async (approver) => {
    setBusyApproverId(approver.id);
    setBusyAction('toggle');
    try {
      await client.patch(`/permits/admin/approvers/${approver.id}/`, {
        requires_reason_on_approval: !approver.requires_reason_on_approval,
      });
      toast.success('Stage 2 authority approver updated.');
      fetchApprovers();
      onApproverChange?.();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update authority approver.');
    } finally {
      setBusyApproverId(null);
      setBusyAction('');
    }
  };

  if (loading) {
    return <PageLoader label="Loading approvers..." />;
  }

  return (
    <div className="space-y-8">
      {/* Add Approver Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 transition-shadow hover:shadow-md">
        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 tracking-tight">
          <UserPlus className="text-vms-600" size={20} />
          Assign New Approver
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Stage</label>
            <div className="relative">
              <select
              value={selectedStage}
              onChange={(e) => {
                setSelectedStage(e.target.value);
                setSelectedUser('');
                setRequiresApprovalReason(false);
              }}
              className="field-input appearance-none pr-10 bg-white"
              >
              <option value="1">Stage 1 Approver</option>
              <option value="2">Stage 2 Approver</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"/></svg>
              </div>
            </div>
        </div>

        <div className="relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select User</label>
            {users.length === 0 ? (
              <input
                type="email"
                placeholder="approver@dsgroup.com"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="field-input bg-white"
              />
            ) : (
              <div className="relative">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="field-input appearance-none pr-10 bg-white"
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
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"/></svg>
                </div>
              </div>
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
                className="w-4 h-4 rounded border-slate-300 text-vms-700"
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
            className="btn-primary w-full h-[46px]"
            >
            {adding ? <Spinner size={4} /> : <UserPlus size={16} />}
            {adding ? 'Adding...' : 'Add Approver'}
            </button>
        </div>
        </div>
      </div>

      {/* Approvers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1, 2].map((stage) => (
          <div key={stage} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <h4 className="text-lg font-bold text-slate-900 tracking-tight">Stage {stage} Approvers</h4>
              <span className="bg-vms-50 px-3.5 py-1.5 rounded-full text-xs font-bold text-vms-700 border border-vms-100/50">
                {counts[`stage_${stage}`]} / 3 Assigned
              </span>
            </div>

            <div className="space-y-3">
              {approvers.filter((a) => a.stage === stage).length > 0 ? (
                approvers
                  .filter((a) => a.stage === stage)
                  .map((approver) => (
                    <div
                      key={approver.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow hover:border-vms-200 transition-all gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-slate-900">{approver.user_name}</p>
                          {approver.stage === 2 && approver.requires_reason_on_approval && (
                            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              Authority
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-500">{approver.user_email}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:self-auto self-end">
                        {approver.stage === 2 && (
                          <button
                            type="button"
                            onClick={() => handleToggleAuthorityApprover(approver)}
                            disabled={busyApproverId === approver.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                              approver.requires_reason_on_approval
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            } disabled:opacity-70`}
                          >
                            {busyApproverId === approver.id && busyAction === 'toggle' ? (
                              <span className="inline-flex items-center gap-1.5"><Spinner size={3} /> Saving...</span>
                            ) : (
                              approver.requires_reason_on_approval ? 'Revoke Auth' : 'Make Auth'
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveApprover(approver.id)}
                          disabled={busyApproverId === approver.id}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 disabled:opacity-70"
                          title="Remove approver"
                        >
                          {busyApproverId === approver.id && busyAction === 'remove' ? <Spinner size={4} /> : <Trash2 size={16} />}
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
