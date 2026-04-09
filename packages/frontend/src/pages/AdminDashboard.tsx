import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Stats {
  totalUsers: number;
  totalGroups: number;
  activeGroups: number;
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
  trustScore: number;
  groupCreationSuspended: boolean;
  createdAt: string;
  _count: { memberships: number };
}

interface AdminGroup {
  id: string;
  name: string;
  status: string;
  contributionAmount: number;
  frequency: string;
  maxMembers: number;
  currentMembers: number;
  createdAt: string;
  createdBy: { firstName: string; lastName: string; email: string };
}

interface WaiverCode {
  id: string;
  code: string;
  description: string | null;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
}

interface GroupPayout {
  id: string;
  cycleId: string;
  recipientId: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  stripeTransferId: string | null;
  transferredAt: string | null;
  failureReason: string | null;
  retryCount: number;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface GroupCycle {
  id: string;
  cycleNumber: number;
  recipientId: string | null;
  dueDate: string;
  isCompleted: boolean;
  totalAmount: number;
  payout: GroupPayout | null;
}

interface GroupMembership {
  id: string;
  payoutPosition: number;
  isActive: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface GroupDetails {
  id: string;
  name: string;
  status: string;
  contributionAmount: number;
  frequency: string;
  maxMembers: number;
  currentMembers: number;
  createdAt: string;
  createdBy: { firstName: string; lastName: string; email: string };
  memberships: GroupMembership[];
  cycles: GroupCycle[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BlockedName {
  id: string;
  firstName: string;
  lastName: string;
  reason: string | null;
  createdAt: string;
}

type ActiveTab = 'users' | 'groups' | 'waiverCodes' | 'announcements' | 'blockedNames';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [usersPagination, setUsersPagination] = useState<Pagination | null>(null);
  const [groupsPagination, setGroupsPagination] = useState<Pagination | null>(null);
  const [waiverCodes, setWaiverCodes] = useState<WaiverCode[]>([]);
  const [waiverCodesPagination, setWaiverCodesPagination] = useState<Pagination | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ type: 'user' | 'group'; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [blockEmailOnDelete, setBlockEmailOnDelete] = useState(false);
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('');
  const [creatingCode, setCreatingCode] = useState(false);
  const [togglingCodeId, setTogglingCodeId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);
  const [reinitiatingPayoutId, setReinitiatingPayoutId] = useState<string | null>(null);
  const [suspendingUserId, setSuspendingUserId] = useState<string | null>(null);
  const [blockedNames, setBlockedNames] = useState<BlockedName[]>([]);
  const [blockedNamesPagination, setBlockedNamesPagination] = useState<Pagination | null>(null);
  const [newBlockFirstName, setNewBlockFirstName] = useState('');
  const [newBlockLastName, setNewBlockLastName] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');
  const [showBlockNameForm, setShowBlockNameForm] = useState(false);
  const [blockingName, setBlockingName] = useState(false);
  const [unblockingNameId, setUnblockingNameId] = useState<string | null>(null);
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  // Auth guard
  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token]);

  const fetchUsers = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users?page=${page}&limit=20`, { headers });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.users);
        setUsersPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, [token]);

  const fetchGroups = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/groups?page=${page}&limit=20`, { headers });
      const data = await res.json();
      if (data.success) {
        setGroups(data.data.groups);
        setGroupsPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, [token]);

  const fetchWaiverCodes = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/waiver-codes?page=${page}&limit=20`, { headers });
      const data = await res.json();
      if (data.success) {
        setWaiverCodes(data.data.codes);
        setWaiverCodesPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch waiver codes:', err);
    }
  }, [token]);

  const fetchBlockedNames = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/blocked-names?page=${page}&limit=20`, { headers });
      const data = await res.json();
      if (data.success) {
        setBlockedNames(data.data.names);
        setBlockedNamesPagination(data.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch blocked names:', err);
    }
  }, [token]);

  const handleCreateCode = async () => {
    setCreatingCode(true);
    try {
      const body: Record<string, any> = {};
      if (newCodeDescription.trim()) body.description = newCodeDescription.trim();
      if (newCodeMaxUses.trim()) body.maxUses = parseInt(newCodeMaxUses);

      const res = await fetch(`${API_BASE_URL}/api/admin/waiver-codes`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateCode(false);
        setNewCodeDescription('');
        setNewCodeMaxUses('');
        fetchWaiverCodes(waiverCodesPagination?.page);
      } else {
        alert(data.error || 'Failed to create code');
      }
    } catch {
      alert('Failed to create code');
    } finally {
      setCreatingCode(false);
    }
  };

  const handleToggleCode = async (codeId: string, isActive: boolean) => {
    setTogglingCodeId(codeId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/waiver-codes/${codeId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchWaiverCodes(waiverCodesPagination?.page);
      } else {
        alert(data.error || 'Failed to update code');
      }
    } catch {
      alert('Failed to update code');
    } finally {
      setTogglingCodeId(null);
    }
  };

  const fetchGroupDetails = async (groupId: string) => {
    setLoadingGroupDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/groups/${groupId}`, { headers });
      const data = await res.json();
      if (data.success) {
        setSelectedGroup(data.data);
      } else {
        alert(data.error || 'Failed to fetch group details');
      }
    } catch {
      alert('Failed to fetch group details');
    } finally {
      setLoadingGroupDetails(false);
    }
  };

  const handleReinitiateTransfer = async (payoutId: string) => {
    if (!confirm('Are you sure you want to reinitiate this transfer? This will create a new Stripe transfer to the recipient.')) {
      return;
    }
    setReinitiatingPayoutId(payoutId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/payouts/${payoutId}/reinitiate`, {
        method: 'POST',
        headers,
      });
      const data = await res.json();
      if (data.success) {
        alert('Transfer reinitiated successfully');
        if (selectedGroup) {
          fetchGroupDetails(selectedGroup.id);
        }
      } else {
        alert(data.error || 'Failed to reinitiate transfer');
      }
    } catch {
      alert('Failed to reinitiate transfer');
    } finally {
      setReinitiatingPayoutId(null);
    }
  };

  const handleToggleGroupSuspension = async (userId: string, suspended: boolean) => {
    const action = suspended ? 'suspend' : 'unsuspend';
    if (!confirm(`Are you sure you want to ${action} this user from creating groups?`)) return;
    setSuspendingUserId(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/group-suspension`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspended }),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers(usersPagination?.page);
      } else {
        alert(data.error || `Failed to ${action} user`);
      }
    } catch {
      alert(`Failed to ${action} user`);
    } finally {
      setSuspendingUserId(null);
    }
  };

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      Promise.all([fetchStats(), fetchUsers(), fetchGroups(), fetchWaiverCodes(), fetchBlockedNames()]).finally(() => setLoading(false));
    }
  }, [user]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const endpoint = deleteModal.type === 'user'
        ? `${API_BASE_URL}/api/admin/users/${deleteModal.id}`
        : `${API_BASE_URL}/api/admin/groups/${deleteModal.id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: deleteModal.type === 'user' ? JSON.stringify({ blockEmail: blockEmailOnDelete }) : undefined,
      });
      const data = await res.json();
      if (data.success) {
        setDeleteModal(null);
        setBlockEmailOnDelete(false);
        fetchStats();
        if (deleteModal.type === 'user') fetchUsers(usersPagination?.page);
        else fetchGroups(groupsPagination?.page);
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      alert('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalUsers ?? '-'}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Active Groups</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats?.activeGroups ?? '-'}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Groups</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalGroups ?? '-'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'groups'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab('waiverCodes')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'waiverCodes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Waiver Codes
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'announcements'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Announcements
            </button>
            <button
              onClick={() => setActiveTab('blockedNames')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'blockedNames'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Blocked Names
            </button>
          </nav>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trust</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          u.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {u.emailVerified ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-red-500">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.trustScore}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u._count.memberships}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                        {u.role !== 'SUPERADMIN' && (
                          <>
                            <button
                              onClick={() => handleToggleGroupSuspension(u.id, !u.groupCreationSuspended)}
                              disabled={suspendingUserId === u.id}
                              className={`font-medium disabled:opacity-50 ${
                                u.groupCreationSuspended ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'
                              }`}
                            >
                              {suspendingUserId === u.id ? '...' : u.groupCreationSuspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                            <button
                              onClick={() => setDeleteModal({ type: 'user', id: u.id, name: `${u.firstName} ${u.lastName}` })}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {usersPagination && usersPagination.totalPages > 1 && (
              <PaginationControls pagination={usersPagination} onPageChange={fetchUsers} />
            )}
          </div>
        )}

        {/* Groups Table */}
        {activeTab === 'groups' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contribution</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => fetchGroupDetails(g.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {g.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {g.createdBy.firstName} {g.createdBy.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          g.status === 'ACTIVE' ? 'bg-green-100 text-green-800'
                            : g.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800'
                            : g.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {g.currentMembers}/{g.maxMembers}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${g.contributionAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{g.frequency}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(g.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => setDeleteModal({ type: 'group', id: g.id, name: g.name })}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {groupsPagination && groupsPagination.totalPages > 1 && (
              <PaginationControls pagination={groupsPagination} onPageChange={fetchGroups} />
            )}
          </div>
        )}
        {/* Waiver Codes Tab */}
        {activeTab === 'waiverCodes' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Fee Waiver Codes</h2>
              <button
                onClick={() => setShowCreateCode(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Generate Code
              </button>
            </div>

            {/* Create Code Form */}
            {showCreateCode && (
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Generate New Waiver Code</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={newCodeDescription}
                      onChange={(e) => setNewCodeDescription(e.target.value)}
                      placeholder="e.g., Launch promo"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses (optional)</label>
                    <input
                      type="number"
                      value={newCodeMaxUses}
                      onChange={(e) => setNewCodeMaxUses(e.target.value)}
                      placeholder="Leave blank for unlimited"
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => { setShowCreateCode(false); setNewCodeDescription(''); setNewCodeMaxUses(''); }}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCode}
                    disabled={creatingCode}
                    className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creatingCode ? 'Creating...' : 'Generate'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {waiverCodes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                          No waiver codes yet. Click "Generate Code" to create one.
                        </td>
                      </tr>
                    )}
                    {waiverCodes.map((wc) => (
                      <tr key={wc.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {wc.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {wc.description || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {wc.currentUses}{wc.maxUses !== null ? ` / ${wc.maxUses}` : ' (unlimited)'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            wc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {wc.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(wc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleToggleCode(wc.id, !wc.isActive)}
                            disabled={togglingCodeId === wc.id}
                            className={`font-medium disabled:opacity-50 ${
                              wc.isActive ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                            }`}
                          >
                            {togglingCodeId === wc.id ? '...' : wc.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {waiverCodesPagination && waiverCodesPagination.totalPages > 1 && (
                <PaginationControls pagination={waiverCodesPagination} onPageChange={fetchWaiverCodes} />
              )}
            </div>
          </div>
        )}
        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Announcement to Group Creators</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will send an email to all users who have created a group. Recipient emails are kept private using BCC.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={announcementSubject}
                  onChange={(e) => setAnnouncementSubject(e.target.value)}
                  placeholder="e.g., Important Update from SavePal"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  value={announcementBody}
                  onChange={(e) => setAnnouncementBody(e.target.value)}
                  placeholder="Write your announcement here..."
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    if (!announcementSubject.trim() || !announcementBody.trim()) {
                      alert('Please fill in both the subject and message.');
                      return;
                    }
                    if (!confirm('Are you sure you want to send this announcement to all group creators?')) {
                      return;
                    }
                    setSendingAnnouncement(true);
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/admin/announce`, {
                        method: 'POST',
                        headers: { ...headers, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ subject: announcementSubject.trim(), body: announcementBody.trim() }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        alert(`Announcement sent to ${data.data.recipientCount} group creator(s).`);
                        setAnnouncementSubject('');
                        setAnnouncementBody('');
                      } else {
                        alert(data.error || 'Failed to send announcement');
                      }
                    } catch {
                      alert('Failed to send announcement');
                    } finally {
                      setSendingAnnouncement(false);
                    }
                  }}
                  disabled={sendingAnnouncement}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingAnnouncement ? 'Sending...' : 'Send Announcement'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Blocked Names Tab */}
        {activeTab === 'blockedNames' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Blocked Names</h2>
              <button
                onClick={() => setShowBlockNameForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Block a Name
              </button>
            </div>

            {showBlockNameForm && (
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Block a Name</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={newBlockFirstName}
                      onChange={(e) => setNewBlockFirstName(e.target.value)}
                      placeholder="e.g., Carl"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newBlockLastName}
                      onChange={(e) => setNewBlockLastName(e.target.value)}
                      placeholder="e.g., Bonnie"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                    <input
                      type="text"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                      placeholder="e.g., Fraud"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => { setShowBlockNameForm(false); setNewBlockFirstName(''); setNewBlockLastName(''); setNewBlockReason(''); }}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!newBlockFirstName.trim() || !newBlockLastName.trim()) {
                        alert('First name and last name are required.');
                        return;
                      }
                      setBlockingName(true);
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/admin/blocked-names`, {
                          method: 'POST',
                          headers: { ...headers, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ firstName: newBlockFirstName.trim(), lastName: newBlockLastName.trim(), reason: newBlockReason.trim() || undefined }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          setShowBlockNameForm(false);
                          setNewBlockFirstName('');
                          setNewBlockLastName('');
                          setNewBlockReason('');
                          fetchBlockedNames(blockedNamesPagination?.page);
                        } else {
                          alert(data.error || 'Failed to block name');
                        }
                      } catch {
                        alert('Failed to block name');
                      } finally {
                        setBlockingName(false);
                      }
                    }}
                    disabled={blockingName}
                    className="px-3 py-1.5 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {blockingName ? 'Blocking...' : 'Block Name'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blocked On</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {blockedNames.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                          No blocked names. Click "Block a Name" to add one.
                        </td>
                      </tr>
                    )}
                    {blockedNames.map((bn) => (
                      <tr key={bn.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                          {bn.firstName} {bn.lastName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {bn.reason || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bn.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={async () => {
                              if (!confirm(`Unblock "${bn.firstName} ${bn.lastName}"?`)) return;
                              setUnblockingNameId(bn.id);
                              try {
                                const res = await fetch(`${API_BASE_URL}/api/admin/blocked-names/${bn.id}`, {
                                  method: 'DELETE',
                                  headers,
                                });
                                const data = await res.json();
                                if (data.success) {
                                  fetchBlockedNames(blockedNamesPagination?.page);
                                } else {
                                  alert(data.error || 'Failed to unblock');
                                }
                              } catch {
                                alert('Failed to unblock');
                              } finally {
                                setUnblockingNameId(null);
                              }
                            }}
                            disabled={unblockingNameId === bn.id}
                            className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          >
                            {unblockingNameId === bn.id ? '...' : 'Unblock'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {blockedNamesPagination && blockedNamesPagination.totalPages > 1 && (
                <PaginationControls pagination={blockedNamesPagination} onPageChange={fetchBlockedNames} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Group Detail Modal */}
      {(selectedGroup || loadingGroupDetails) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {loadingGroupDetails && !selectedGroup ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : selectedGroup && (
              <>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selectedGroup.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedGroup.status} &middot; ${selectedGroup.contributionAmount.toFixed(2)} {selectedGroup.frequency} &middot; {selectedGroup.currentMembers}/{selectedGroup.maxMembers} members
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedGroup(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-6">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Member Payouts</h4>

                  {selectedGroup.cycles.length === 0 ? (
                    <p className="text-sm text-gray-500">No cycles found for this group.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transferred</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedGroup.cycles.map((cycle) => (
                            <tr key={cycle.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                #{cycle.cycleNumber}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {cycle.payout
                                  ? `${cycle.payout.recipient.firstName} ${cycle.payout.recipient.lastName}`
                                  : <span className="text-gray-400">—</span>}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {cycle.payout ? `$${cycle.payout.amount.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {cycle.payout ? `$${cycle.payout.netAmount.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {cycle.payout ? (
                                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    cycle.payout.status === 'COMPLETED' ? 'bg-green-100 text-green-800'
                                      : cycle.payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800'
                                      : cycle.payout.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {cycle.payout.status}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">No payout</span>
                                )}
                                {cycle.payout?.failureReason && (
                                  <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={cycle.payout.failureReason}>
                                    {cycle.payout.failureReason}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {cycle.payout?.transferredAt
                                  ? new Date(cycle.payout.transferredAt).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                {cycle.payout && (cycle.payout.status === 'COMPLETED' || cycle.payout.status === 'FAILED') && (
                                  <button
                                    onClick={() => handleReinitiateTransfer(cycle.payout!.id)}
                                    disabled={reinitiatingPayoutId === cycle.payout.id}
                                    className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
                                  >
                                    {reinitiatingPayoutId === cycle.payout.id ? 'Processing...' : 'Reinitiate Transfer'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete {deleteModal.type} <span className="font-semibold">{deleteModal.name}</span>? This action cannot be undone.
            </p>
            {deleteModal.type === 'user' && (
              <div className="flex items-center mb-4 p-3 bg-red-50 rounded-md">
                <input
                  id="blockEmail"
                  type="checkbox"
                  checked={blockEmailOnDelete}
                  onChange={(e) => setBlockEmailOnDelete(e.target.checked)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="blockEmail" className="ml-2 block text-sm text-gray-700">
                  Block this email from creating a new account
                </label>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => { setDeleteModal(null); setBlockEmailOnDelete(false); }}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaginationControls({ pagination, onPageChange }: { pagination: Pagination; onPageChange: (page: number) => void }) {
  return (
    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
      </p>
      <div className="flex space-x-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
