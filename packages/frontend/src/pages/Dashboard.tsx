import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Group {
  id: string;
  name: string;
  status: string;
  currentMembers: number;
  maxMembers: number;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

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

      if (response.ok) {
        const data = await response.json();
        setGroups(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome, {user.firstName}!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900">Trust Score</h3>
                <p className="text-3xl font-bold text-blue-600 mt-2">{user.trustScore}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900">Email Status</h3>
                <p className="text-sm font-medium text-green-600 mt-2">
                  {user.emailVerified ? '✓ Verified' : '✗ Not verified'}
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-900">Phone Status</h3>
                <p className="text-sm font-medium text-purple-600 mt-2">
                  {user.phoneVerified ? '✓ Verified' : '✗ Not verified'}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Groups</h3>
                <Link
                  to="/groups"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View All →
                </Link>
              </div>

              {groupsLoading ? (
                <p className="text-gray-600">Loading groups...</p>
              ) : groups.length === 0 ? (
                <div>
                  <p className="text-gray-600 mb-4">You haven't joined any savings groups yet.</p>
                  <div className="flex space-x-4">
                    <Link
                      to="/groups/create"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                      Create a Group
                    </Link>
                    <Link
                      to="/groups/join"
                      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                    >
                      Join a Group
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.slice(0, 3).map((group) => (
                    <Link
                      key={group.id}
                      to={`/groups/${group.id}`}
                      className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{group.name}</h4>
                          <p className="text-sm text-gray-600">
                            {group.currentMembers}/{group.maxMembers} members
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          group.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          group.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {group.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {groups.length > 3 && (
                    <Link
                      to="/groups"
                      className="block text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
                    >
                      View {groups.length - 3} more groups
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
