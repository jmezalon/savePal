import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

interface Group {
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
  memberships: Array<{
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch groups');
      }

      setGroups(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My Groups</h1>
            <div className="flex space-x-4">
              <Link
                to="/groups/join"
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Join Group
              </Link>
              <Link
                to="/groups/create"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Group
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {groups.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">No groups yet</h2>
              <p className="text-gray-600 mb-6">
                Create a new savings group or join an existing one with an invite code.
              </p>
              <div className="flex justify-center space-x-4">
                <Link
                  to="/groups/create"
                  className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Create Your First Group
                </Link>
                <Link
                  to="/groups/join"
                  className="px-6 py-3 text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  Join a Group
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(group.status)}`}>
                      {group.status}
                    </span>
                  </div>

                  {group.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{group.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contribution:</span>
                      <span className="font-medium">${group.contributionAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Frequency:</span>
                      <span className="font-medium">{getFrequencyLabel(group.frequency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Members:</span>
                      <span className="font-medium">
                        {group.currentMembers}/{group.maxMembers}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex -space-x-2">
                      {group.memberships.slice(0, 3).map((membership, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                          title={`${membership.user.firstName} ${membership.user.lastName}`}
                        >
                          {membership.user.firstName[0]}{membership.user.lastName[0]}
                        </div>
                      ))}
                      {group.memberships.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-medium border-2 border-white">
                          +{group.memberships.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
