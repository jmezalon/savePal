import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PaymentModal from '../components/PaymentModal';
import ConfirmModal from '../components/ConfirmModal';

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

interface Payment {
  id: string;
  amount: number;
  status: string;
  paidAt?: string;
  failureReason?: string;
  retryCount?: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Cycle {
  id: string;
  cycleNumber: number;
  dueDate: string;
  completedDate?: string;
  totalAmount: number;
  isCompleted: boolean;
  recipientId: string;
  payments?: Payment[];
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
  userRole?: string;
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
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [currentCycle, setCurrentCycle] = useState<Cycle | null>(null);
  const [myPayment, setMyPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; variant: 'success' | 'danger'; onClose?: () => void } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [readiness, setReadiness] = useState<{
    ready: boolean;
    membersWithoutPaymentMethod: { firstName: string; lastName: string }[];
  } | null>(null);
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroupDetails();
    if (id) {
      fetchCycles(id);
    }
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

      // Check readiness if group is full and pending
      const g = data.data;
      if (g.status === 'PENDING' && g.currentMembers === g.maxMembers) {
        try {
          const readinessRes = await fetch(`${API_BASE_URL}/api/groups/${id}/readiness`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (readinessRes.ok) {
            const readinessData = await readinessRes.json();
            setReadiness(readinessData.data);
          }
        } catch {
          // Fail open
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch group details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCycles = async (groupId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/cycles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCycles(data.data || []);

        // Fetch current cycle
        const currentResponse = await fetch(`${API_BASE_URL}/api/groups/${groupId}/cycles/current`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (currentResponse.ok) {
          const currentData = await currentResponse.json();
          setCurrentCycle(currentData.data);

          // Fetch user's payment for current cycle
          if (currentData.data) {
            const paymentResponse = await fetch(`${API_BASE_URL}/api/cycles/${currentData.data.id}/my-payment`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              setMyPayment(paymentData.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch cycles:', err);
    }
  };

  const handleStartGroup = async () => {
    if (!id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Refresh group details and cycles
        await fetchGroupDetails();
        if (id) {
          await fetchCycles(id);
        }
        setAlertModal({ title: 'Group Started', message: 'Group started successfully! Payment cycles have been created.', variant: 'success' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start group');
      }
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to start group', variant: 'danger' });
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    if (id) {
      await fetchCycles(id);
    }
  };

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDeleteGroup = async () => {
    if (!id) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setAlertModal({ title: 'Group Deleted', message: 'Group deleted successfully.', variant: 'success', onClose: () => navigate('/groups') });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete group');
      }
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to delete group', variant: 'danger' });
    } finally {
      setIsDeleting(false);
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
      <div className="bg-gray-50">
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
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    {showSettings ? 'Close Settings' : 'Settings'}
                  </button>
                )}
              </div>
            </div>

            <div className="px-6 py-4">
              {/* Settings Panel */}
              {showSettings && isOwner && group.status === 'PENDING' && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
                  <p className="text-sm text-red-800 mb-4">
                    Delete this group permanently. This action cannot be undone. All member data will be lost.
                  </p>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Group'}
                  </button>
                </div>
              )}

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

              {group.status === 'ACTIVE' && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900">Automatic Payments Active</h3>
                      <p className="text-sm text-blue-800 mt-1">
                        Your card will be automatically charged on each cycle's due date.
                        {currentCycle && !currentCycle.isCompleted && (
                          <span className="font-medium"> Next auto-charge: {new Date(currentCycle.dueDate).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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

              {isOwner ? (
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
              ) : (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Position</h2>
                  {group.memberships.filter(m => m.user.id === user?.id).map((membership) => (
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
                          </p>
                          <p className="text-sm text-gray-500">Payout Position #{membership.payoutPosition}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {group.currentMembers}/{group.maxMembers} members
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isOwner && group.status === 'PENDING' && group.currentMembers === group.maxMembers && (
                <div className={`border rounded-lg p-4 ${readiness && !readiness.ready ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                  <h3 className={`text-sm font-semibold mb-2 ${readiness && !readiness.ready ? 'text-yellow-900' : 'text-green-900'}`}>
                    Group is Full!
                  </h3>
                  {readiness && !readiness.ready ? (
                    <>
                      <p className="text-sm text-yellow-800 mb-2">
                        The following members still need to add a payment method before the group can start:
                      </p>
                      <ul className="text-sm text-yellow-800 mb-3 list-disc list-inside">
                        {readiness.membersWithoutPaymentMethod.map((m, i) => (
                          <li key={i}>{m.firstName} {m.lastName}</li>
                        ))}
                      </ul>
                      <button
                        disabled
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-400 rounded-md cursor-not-allowed"
                      >
                        Start Group
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-green-800 mb-3">
                        All member spots are filled. You can now start the group to begin payment cycles.
                      </p>
                      <button
                        onClick={() => setShowStartConfirm(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                      >
                        Start Group
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Current Cycle and Payment Section */}
              {group.status === 'ACTIVE' && currentCycle && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Cycle</h2>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-4 border border-blue-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Cycle {currentCycle.cycleNumber}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(currentCycle.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm font-semibold rounded ${
                        currentCycle.isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {currentCycle.isCompleted ? 'Completed' : 'Active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Pot</p>
                        <p className="text-2xl font-bold text-blue-600">${currentCycle.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Recipient</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {currentCycle.recipientId === user?.id
                            ? 'You'
                            : isOwner
                              ? (group.memberships.find(m => m.user.id === currentCycle.recipientId)?.user.firstName || 'Unknown')
                              : 'Another member'}
                        </p>
                      </div>
                    </div>

                    {/* User's Payment Status */}
                    {myPayment && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Your Contribution</p>
                            <p className="text-xl font-bold text-gray-900">${myPayment.amount}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              Status: <span className={`font-semibold ${
                                myPayment.status === 'COMPLETED' ? 'text-green-600' :
                                myPayment.status === 'PROCESSING' ? 'text-blue-600' :
                                myPayment.status === 'FAILED' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {myPayment.status}
                              </span>
                            </p>
                            {myPayment.status === 'FAILED' && myPayment.failureReason && (
                              <p className="text-xs text-red-500 mt-1">{myPayment.failureReason}</p>
                            )}
                          </div>
                          {myPayment.status === 'PENDING' && (
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className="px-6 py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                            >
                              {currentCycle && new Date(currentCycle.dueDate) > new Date() ? 'Pay Early' : 'Pay Now'}
                            </button>
                          )}
                          {myPayment.status === 'FAILED' && (
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className="px-6 py-3 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                            >
                              Retry Payment
                            </button>
                          )}
                          {myPayment.status === 'PROCESSING' && (
                            <div className="text-right">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="text-xs text-blue-600 mt-1">Processing...</p>
                            </div>
                          )}
                          {myPayment.status === 'COMPLETED' && myPayment.paidAt && (
                            <div className="text-right">
                              <p className="text-sm text-green-600 font-semibold">Paid</p>
                              <p className="text-xs text-gray-500">
                                {new Date(myPayment.paidAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* All Cycles Section */}
              {group.status === 'ACTIVE' && cycles.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">All Cycles</h2>
                  <div className="space-y-3">
                    {cycles.map((cycle) => (
                      <div
                        key={cycle.id}
                        className={`p-4 rounded-lg border ${
                          cycle.isCompleted ? 'bg-gray-50 border-gray-200' :
                          cycle.id === currentCycle?.id ? 'bg-blue-50 border-blue-300' :
                          'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                              cycle.isCompleted ? 'bg-green-500 text-white' :
                              cycle.id === currentCycle?.id ? 'bg-blue-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {cycle.cycleNumber}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                Cycle {cycle.cycleNumber}
                                {cycle.id === currentCycle?.id && (
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Current</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600">
                                Due: {new Date(cycle.dueDate).toLocaleDateString()}
                                {cycle.completedDate && ` • Completed: ${new Date(cycle.completedDate).toLocaleDateString()}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">Recipient</p>
                            <p className="text-sm text-gray-900">
                              {cycle.recipientId === user?.id
                                ? 'You'
                                : isOwner
                                  ? (group.memberships.find(m => m.user.id === cycle.recipientId)?.user.firstName || 'Unknown')
                                  : 'Another member'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && myPayment && token && (
          <PaymentModal
            paymentId={myPayment.id}
            amount={myPayment.amount}
            groupName={group.name}
            token={token}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Start Group Confirmation Modal */}
        <ConfirmModal
          isOpen={showStartConfirm}
          title="Start Group"
          message={`Once started, all members' cards will be automatically charged $${group.contributionAmount} on each cycle's due date. This action cannot be undone.`}
          confirmLabel="Start Group"
          variant="warning"
          onConfirm={() => {
            setShowStartConfirm(false);
            handleStartGroup();
          }}
          onCancel={() => setShowStartConfirm(false)}
        />

        {/* Delete Group Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Group"
          message="Are you sure you want to delete this group? This action cannot be undone. All member data will be lost."
          confirmLabel="Delete Group"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteGroup}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        {/* Alert Modal (success/error feedback) */}
        <ConfirmModal
          isOpen={alertModal !== null}
          title={alertModal?.title ?? ''}
          message={alertModal?.message ?? ''}
          confirmLabel="OK"
          variant={alertModal?.variant ?? 'success'}
          showCancel={false}
          onConfirm={() => {
            const onClose = alertModal?.onClose;
            setAlertModal(null);
            onClose?.();
          }}
          onCancel={() => {
            const onClose = alertModal?.onClose;
            setAlertModal(null);
            onClose?.();
          }}
        />
      </main>
    </div>
  );
}
