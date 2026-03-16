import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const APP_STORE_URL = 'https://apps.apple.com/us/app/save-pals/id6760158627';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.savepal.app';

function getMobilePlatform(): 'ios' | 'android' | null {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
}

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
  const [appBannerDismissed, setAppBannerDismissed] = useState(() =>
    localStorage.getItem('savepal_app_banner_dismissed') === 'true'
  );
  const mobilePlatform = useMemo(() => getMobilePlatform(), []);
  const showAppBanner = mobilePlatform !== null && !appBannerDismissed;

  const dismissAppBanner = () => {
    localStorage.setItem('savepal_app_banner_dismissed', 'true');
    setAppBannerDismissed(true);
  };

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

  if (groupsLoading) {
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
          {showAppBanner && (
            <div className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg shadow-lg p-4 sm:p-5 relative">
              <button
                onClick={dismissAppBanner}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-4">
                <img
                  src="/images/app-icon.png"
                  alt="SavePal"
                  className="flex-shrink-0 w-12 h-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm sm:text-base">
                    {mobilePlatform === 'android' ? 'Get the SavePal Android App' : 'Get the SavePal iOS App'}
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm mt-0.5">
                    Manage groups, pay instantly, and get push notifications on your {mobilePlatform === 'android' ? 'phone' : 'iPhone'}.
                  </p>
                </div>
                <a
                  href={mobilePlatform === 'android' ? PLAY_STORE_URL : APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 inline-flex items-center px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  {mobilePlatform === 'android' ? (
                    <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302c.7.4.7 1.08 0 1.48l-2.302 1.302-2.532-2.532 2.532-2.552zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  )}
                  Download
                </a>
              </div>
            </div>
          )}

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
