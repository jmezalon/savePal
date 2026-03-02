import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function CreateGroup() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contributionAmount: '',
    frequency: 'MONTHLY',
    payoutFrequency: '',
    payoutMethod: 'SEQUENTIAL',
    maxMembers: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    // Reset payoutFrequency if contribution frequency changes to make current selection invalid
    if (name === 'frequency') {
      const freqOrder: Record<string, number> = { WEEKLY: 1, BIWEEKLY: 2, MONTHLY: 3 };
      if (updated.payoutFrequency && freqOrder[updated.payoutFrequency] < freqOrder[value]) {
        updated.payoutFrequency = '';
      }
    }

    setFormData(updated);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name || !formData.contributionAmount || !formData.maxMembers) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.contributionAmount) <= 0) {
      setError('Contribution amount must be greater than 0');
      return;
    }

    const maxMembers = parseInt(formData.maxMembers);
    if (maxMembers < 2 || maxMembers > 50) {
      setError('Max members must be between 2 and 50');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          contributionAmount: parseFloat(formData.contributionAmount),
          maxMembers: maxMembers,
          payoutFrequency: formData.payoutFrequency || undefined,
        }),
      });

      if (response.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group');
      }

      // Redirect to the new group's page
      navigate(`/groups/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50">
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link to="/groups" className="text-blue-600 hover:text-blue-700 text-sm">
              ← Back to Groups
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Savings Group</h1>

            {user && !user.emailVerified && !user.phoneVerified && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Verification Required</h3>
                <p className="text-sm text-red-800">
                  You must verify your email address or phone number before creating a group.
                  Please visit your <Link to="/profile" className="text-red-900 underline font-medium">Profile</Link> to complete verification.
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
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Family Savings Circle"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What is this group for?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contributionAmount" className="block text-sm font-medium text-gray-700 mb-2">
                    Contribution Amount ($) *
                  </label>
                  <input
                    type="number"
                    id="contributionAmount"
                    name="contributionAmount"
                    required
                    min="0"
                    step="0.01"
                    value={formData.contributionAmount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700 mb-2">
                    Max Members *
                  </label>
                  <input
                    type="number"
                    id="maxMembers"
                    name="maxMembers"
                    required
                    min="2"
                    max="50"
                    value={formData.maxMembers}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5"
                  />
                  <p className="mt-1 text-xs text-gray-500">Between 2 and 50</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Frequency *
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    required
                    value={formData.frequency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Bi-weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="payoutMethod" className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Method *
                  </label>
                  <select
                    id="payoutMethod"
                    name="payoutMethod"
                    required
                    value={formData.payoutMethod}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SEQUENTIAL">Sequential (by join order)</option>
                    <option value="RANDOM">Random draw</option>
                    <option value="BIDDING">Bidding system</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="payoutFrequency" className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Frequency (Optional)
                </label>
                <select
                  id="payoutFrequency"
                  name="payoutFrequency"
                  value={formData.payoutFrequency}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Same as contribution frequency</option>
                  {formData.frequency === 'WEEKLY' && (
                    <>
                      <option value="BIWEEKLY">Bi-weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </>
                  )}
                  {formData.frequency === 'BIWEEKLY' && (
                    <option value="MONTHLY">Monthly</option>
                  )}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  How often a member receives the pot. Leave blank to match the contribution frequency.
                </p>
              </div>

              {formData.contributionAmount && formData.maxMembers && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-green-900 mb-1">Pot Summary</h3>
                  <p className="text-sm text-green-800">
                    {(() => {
                      const contrib = parseFloat(formData.contributionAmount);
                      const members = parseInt(formData.maxMembers);
                      const multiplierMap: Record<string, Record<string, number>> = {
                        WEEKLY: { WEEKLY: 1, BIWEEKLY: 2, MONTHLY: 4 },
                        BIWEEKLY: { BIWEEKLY: 1, MONTHLY: 2 },
                        MONTHLY: { MONTHLY: 1 },
                      };
                      const payoutFreq = formData.payoutFrequency || formData.frequency;
                      const multiplier = multiplierMap[formData.frequency]?.[payoutFreq] ?? 1;
                      const pot = contrib * multiplier * members;
                      if (isNaN(pot) || contrib <= 0 || members < 2) return 'Enter valid amounts to see pot summary';
                      return `Each payout: $${contrib.toFixed(2)} x ${multiplier} contribution${multiplier > 1 ? 's' : ''} x ${members} members = $${pot.toFixed(2)}`;
                    })()}
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Each member contributes the set amount on the contribution schedule</li>
                  <li>• <strong>Payments are automatic</strong> — members' cards are charged on each contribution due date</li>
                  <li>• If payout frequency differs, contributions accumulate into a bigger pot</li>
                  <li>• One member receives the full pot each payout cycle</li>
                  <li>• Group continues until everyone has received a payout</li>
                  <li>• You'll be the group owner and can invite members</li>
                </ul>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading || (user !== null && !user.emailVerified && !user.phoneVerified)}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Group'}
                </button>
                <Link
                  to="/groups"
                  className="flex-1 py-2 px-4 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
