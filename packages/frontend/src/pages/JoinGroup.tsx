import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function JoinGroup() {
  const [inviteCode, setInviteCode] = useState('');
  const [autoPaymentConsent, setAutoPaymentConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkPaymentMethods = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payment-methods`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setHasPaymentMethod((data.data || []).length > 0);
        }
      } catch {
        // Fail open — backend will enforce anyway
        setHasPaymentMethod(true);
      }
    };
    checkPaymentMethods();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim(), autoPaymentConsent }),
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join group');
      }

      // Redirect to groups list
      navigate('/groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join group');
    } finally {
      setIsLoading(false);
    }
  };

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

      <main className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link to="/groups" className="text-blue-600 hover:text-blue-700 text-sm">
              ← Back to Groups
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join a Savings Group</h1>
            <p className="text-gray-600 mb-6">
              Enter the invite code shared by the group owner to join.
            </p>

            {hasPaymentMethod === false && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                <p className="font-medium">Payment method required</p>
                <p className="text-sm mt-1">
                  You need to add a payment method before joining a group.{' '}
                  <Link to="/profile" className="text-blue-600 hover:text-blue-700 underline font-medium">
                    Go to Profile
                  </Link>
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  id="inviteCode"
                  name="inviteCode"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., 4f692be1-755c-4eaa-9c2d-5b36f0749141"
                />
                <p className="mt-2 text-sm text-gray-500">
                  The invite code is a unique ID provided by the group owner
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Before joining:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Make sure you understand the group's contribution amount and frequency</li>
                  <li>• <strong>Payments are automatic</strong> — your card will be charged on each cycle's due date</li>
                  <li>• You'll be assigned a payout position based on join order</li>
                  <li>• Once the group is full, the owner will start the payment cycles</li>
                  <li>• You cannot leave once the group has started</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPaymentConsent}
                    onChange={(e) => setAutoPaymentConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-900">
                    I authorize SavePal to automatically charge my saved payment method for each contribution on the scheduled due date.
                    I understand that it is my responsibility to ensure sufficient funds are available.
                  </span>
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading || hasPaymentMethod === false || !autoPaymentConsent}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Joining...' : 'Join Group'}
                </button>
                <Link
                  to="/groups"
                  className="flex-1 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                Don't have an invite code?{' '}
                <Link to="/groups/create" className="text-blue-600 hover:text-blue-700 font-medium">
                  Create your own group
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
