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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ActiveTab = 'users' | 'groups' | 'waiverCodes';

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
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [newCodeDescription, setNewCodeDescription] = useState('');
  const [newCodeMaxUses, setNewCodeMaxUses] = useState('');
  const [creatingCode, setCreatingCode] = useState(false);
  const [togglingCodeId, setTogglingCodeId] = useState<string | null>(null);

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

  useEffect(() => {
    if (user?.role === 'SUPERADMIN') {
      Promise.all([fetchStats(), fetchUsers(), fetchGroups(), fetchWaiverCodes()]).finally(() => setLoading(false));
    }
  }, [user]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const endpoint = deleteModal.type === 'user'
        ? `${API_BASE_URL}/api/admin/users/${deleteModal.id}`
        : `${API_BASE_URL}/api/admin/groups/${deleteModal.id}`;
      const res = await fetch(endpoint, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        setDeleteModal(null);
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {u.role !== 'SUPERADMIN' && (
                          <button
                            onClick={() => setDeleteModal({ type: 'user', id: u.id, name: `${u.firstName} ${u.lastName}` })}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{g.name}</td>
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete {deleteModal.type} <span className="font-semibold">{deleteModal.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal(null)}
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
