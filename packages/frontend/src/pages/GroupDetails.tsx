import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface GroupMember {
  id: string;
  role: string;
  payoutPosition: number;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    trustScore: number;
  };
}

interface GroupDetails {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: string;
  payoutMethod: string;
  status: string;
  maxMembers: number;
  currentMembers: number;
  inviteCode: string;
  createdAt: string;
  memberships: GroupMember[];
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function GroupDetails() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroupDetails();
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch group details');
      }

      setGroup(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch group details');
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'WEEKLY':
        return 'Weekly';
      case 'BIWEEKLY':
        return 'Bi-weekly';
      case 'MONTHLY':
        return 'Monthly';
      default:
        return frequency;
    }
  };

  const isOwner = user && group && group.createdBy.id === user.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <Link to="/dashboard" className="flex items-center text-2xl font-bold text-blue-600">
                SavePal
              </Link>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || 'Group not found'}
          </div>
          <Link to="/groups" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            ← Back to Groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="text-2xl font-bold text-blue-600">
                SavePal
              </Link>
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/groups"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Groups
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link to="/groups" className="text-blue-600 hover:text-blue-700 text-sm">
              ← Back to Groups
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                    <span className={`px-3 py-1 text-sm font-semibold rounded ${getStatusColor(group.status)}`}>
                      {group.status}
                    </span>
                  </div>
                  {group.description && (
                    <p className="mt-2 text-gray-600">{group.description}</p>
                  )}
                </div>
                {isOwner && group.status === 'PENDING' && (
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                    Settings
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-1">Contribution</h3>
                  <p className="text-2xl font-bold text-blue-600">${group.contributionAmount}</p>
                  <p className="text-sm text-blue-700">{getFrequencyLabel(group.frequency)}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-900 mb-1">Members</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {group.currentMembers}/{group.maxMembers}
                  </p>
                  <p className="text-sm text-green-700">
                    {group.maxMembers - group.currentMembers} spots left
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-900 mb-1">Payout Method</h3>
                  <p className="text-lg font-semibold text-purple-600">
                    {group.payoutMethod === 'SEQUENTIAL' && 'Sequential'}
                    {group.payoutMethod === 'RANDOM' && 'Random Draw'}
                    {group.payoutMethod === 'BIDDING' && 'Bidding'}
                  </p>
                </div>
              </div>

              {isOwner && group.status === 'PENDING' && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-2">Invite Members</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    Share this invite code with people you trust to join your group
                  </p>
                  <div className="flex space-x-2">
                    <input
                      type={showInviteCode ? 'text' : 'password'}
                      value={group.inviteCode}
                      readOnly
                      className="flex-1 px-3 py-2 border border-yellow-300 rounded-md bg-white font-mono text-sm"
                    />
                    <button
                      onClick={() => setShowInviteCode(!showInviteCode)}
                      className="px-4 py-2 text-sm font-medium text-yellow-700 bg-white border border-yellow-300 rounded-md hover:bg-yellow-50"
                    >
                      {showInviteCode ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={copyInviteCode}
                      className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700"
                    >
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Members ({group.currentMembers})</h2>
                <div className="space-y-3">
                  {group.memberships
                    .sort((a, b) => a.payoutPosition - b.payoutPosition)
                    .map((membership) => (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium">
                            {membership.user.firstName[0]}{membership.user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {membership.user.firstName} {membership.user.lastName}
                              {membership.role === 'OWNER' && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                                  Owner
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">{membership.user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            Position #{membership.payoutPosition}
                          </p>
                          <p className="text-xs text-gray-500">
                            Joined {new Date(membership.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {isOwner && group.status === 'PENDING' && group.currentMembers === group.maxMembers && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-2">Group is Full!</h3>
                  <p className="text-sm text-green-800 mb-3">
                    All member spots are filled. You can now start the group to begin payment cycles.
                  </p>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                    Start Group
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
