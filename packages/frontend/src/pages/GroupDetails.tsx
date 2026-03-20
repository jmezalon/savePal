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
    emailVerified: boolean;
    phoneVerified: boolean;
  };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  contributionPeriod: number;
  dueDate?: string;
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
  recipientId?: string;
  biddingStatus?: 'OPEN' | 'CLOSED';
  payments?: Payment[];
}

interface GroupDetails {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: string;
  payoutFrequency?: string;
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
  const [myPayments, setMyPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
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
    membersWithoutVerification: { firstName: string; lastName: string }[];
  } | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [localMemberships, setLocalMemberships] = useState<GroupMember[]>([]);

  // Bidding state
  const [bids, setBids] = useState<{ id: string; userId: string; amount?: number; user: { id: string; firstName: string; lastName: string } }[]>([]);
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);

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

          // Fetch user's payments for current cycle (multiple contribution periods)
          if (currentData.data) {
            const paymentResponse = await fetch(`${API_BASE_URL}/api/cycles/${currentData.data.id}/my-payments`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (paymentResponse.ok) {
              const paymentData = await paymentResponse.json();
              const payments = Array.isArray(paymentData.data) ? paymentData.data : [paymentData.data];
              setMyPayments(payments);
            }
          }

          // Fetch bids if this is a bidding cycle
          if (currentData.data.biddingStatus) {
            try {
              const bidsResponse = await fetch(`${API_BASE_URL}/api/cycles/${currentData.data.id}/bids`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (bidsResponse.ok) {
                const bidsData = await bidsResponse.json();
                setBids(bidsData.data || []);
              }
            } catch {
              // Fail silently
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
      // Small delay to ensure backend has committed the payment update
      await new Promise(resolve => setTimeout(resolve, 1000));
      await Promise.all([fetchGroup(), fetchCycles(id)]);
    }
  };

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getShareMessage = () => {
    if (!group) return '';
    return `You've been invited to join "${group.name}" on SavePal!\n\nHere's your access code: ${group.inviteCode}\n\nTo join, enter the code at: https://save-pals.com/groups/join\n\nPlease do not share this code with anyone else. Before joining, make sure to add your payment method via your profile: https://save-pals.com/profile`;
  };

  const shareInviteCode = async () => {
    if (!group) return;
    const message = getShareMessage();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on SavePal`,
          text: message,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(message);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        }
      }
    } else {
      await navigator.clipboard.writeText(message);
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

  // Reorder helpers
  const startReordering = () => {
    if (group) {
      setLocalMemberships([...group.memberships].sort((a, b) => a.payoutPosition - b.payoutPosition));
      setIsReordering(true);
    }
  };

  const moveMember = (index: number, direction: 'up' | 'down') => {
    const newList = [...localMemberships];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newList.length) return;

    // Swap positions
    const tempPos = newList[index].payoutPosition;
    newList[index] = { ...newList[index], payoutPosition: newList[swapIndex].payoutPosition };
    newList[swapIndex] = { ...newList[swapIndex], payoutPosition: tempPos };
    newList.sort((a, b) => a.payoutPosition - b.payoutPosition);
    setLocalMemberships(newList);
  };

  const saveReorder = async () => {
    if (!id || !group) return;
    setReorderLoading(true);
    try {
      const positions = localMemberships.map(m => ({
        userId: m.user.id,
        payoutPosition: m.payoutPosition,
      }));

      const response = await fetch(`${API_BASE_URL}/api/groups/${id}/reorder`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ positions }),
      });

      if (response.ok) {
        setIsReordering(false);
        await fetchGroupDetails();
        setAlertModal({ title: 'Positions Updated', message: 'Payout positions have been updated successfully.', variant: 'success' });
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reorder positions');
      }
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to reorder positions', variant: 'danger' });
    } finally {
      setReorderLoading(false);
    }
  };

  // Bidding helpers
  const fetchBids = async (cycleId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cycles/${cycleId}/bids`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBids(data.data || []);
      }
    } catch {
      // Fail silently
    }
  };

  const handlePlaceBid = async () => {
    if (!currentCycle || !bidAmount) return;
    setBidLoading(true);
    setBidError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cycles/${currentCycle.id}/bids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: parseFloat(bidAmount) }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to place bid');

      setBidAmount('');
      await fetchBids(currentCycle.id);
      setAlertModal({ title: 'Bid Placed', message: `Your bid of $${parseFloat(bidAmount).toFixed(2)} has been placed.`, variant: 'success' });
    } catch (err) {
      setBidError(err instanceof Error ? err.message : 'Failed to place bid');
    } finally {
      setBidLoading(false);
    }
  };

  const handleResolveBidding = async () => {
    if (!currentCycle) return;
    setBidLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cycles/${currentCycle.id}/bids/resolve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to resolve bidding');

      if (id) {
        await fetchCycles(id);
      }
      await fetchGroupDetails();
      setAlertModal({
        title: 'Bidding Resolved',
        message: `Winner: ${data.data?.cycle?.bids?.[0]?.user?.firstName || 'Unknown'} with a bid of $${data.data?.bidFee?.toFixed(2) || '0.00'}`,
        variant: 'success',
      });
    } catch (err) {
      setAlertModal({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to resolve bidding', variant: 'danger' });
    } finally {
      setBidLoading(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700' };
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
    if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700' };
    return { bg: 'bg-red-100', text: 'text-red-700' };
  };

  const TrustScoreBadge = ({ score }: { score: number }) => {
    const colors = getTrustScoreColor(score);
    return (
      <span className={`inline-flex items-center gap-0.5 ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
        <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 1a.75.75 0 0 1 .65.376l1.703 2.93 3.206.582a.75.75 0 0 1 .4 1.232l-2.143 2.39.367 3.27a.75.75 0 0 1-1.037.744L10 11.168l-3.146 1.356a.75.75 0 0 1-1.037-.744l.367-3.27-2.143-2.39a.75.75 0 0 1 .4-1.232l3.206-.582L9.35 1.376A.75.75 0 0 1 10 1Z" clipRule="evenodd" />
        </svg>
        {Math.round(score)}
      </span>
    );
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
                  <p className="text-sm text-blue-700">
                    {getFrequencyLabel(group.frequency)}
                    {group.payoutFrequency && group.payoutFrequency !== group.frequency && (
                      <span> / {getFrequencyLabel(group.payoutFrequency)} payouts</span>
                    )}
                  </p>
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
                        Your card will be automatically charged on each contribution due date.
                        {(() => {
                          const nextDue = myPayments.find(p => p.status === 'PENDING' && p.dueDate);
                          if (nextDue?.dueDate) {
                            return <span className="font-medium"> Next auto-charge: {new Date(nextDue.dueDate).toLocaleDateString()}</span>;
                          }
                          if (currentCycle && !currentCycle.isCompleted) {
                            return <span className="font-medium"> Payout due: {new Date(currentCycle.dueDate).toLocaleDateString()}</span>;
                          }
                          return null;
                        })()}
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
                    <button
                      onClick={shareInviteCode}
                      className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700"
                    >
                      Share
                    </button>
                  </div>
                </div>
              )}

              {isOwner ? (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Members ({group.currentMembers})</h2>
                    {group.status === 'PENDING' && group.currentMembers > 1 && !isReordering && (
                      <button
                        onClick={startReordering}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Reorder Positions
                      </button>
                    )}
                    {isReordering && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setIsReordering(false)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveReorder}
                          disabled={reorderLoading}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          {reorderLoading ? 'Saving...' : 'Save Order'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(isReordering ? localMemberships : [...group.memberships].sort((a, b) => a.payoutPosition - b.payoutPosition))
                      .map((membership, index) => (
                        <div
                          key={membership.id}
                          className={`flex items-center justify-between p-4 rounded-lg ${isReordering ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center space-x-4">
                            {isReordering && (
                              <div className="flex flex-col space-y-1">
                                <button
                                  onClick={() => moveMember(index, 'up')}
                                  disabled={index === 0}
                                  className="p-0.5 text-gray-500 hover:text-blue-600 disabled:text-gray-300"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => moveMember(index, 'down')}
                                  disabled={index === (isReordering ? localMemberships : group.memberships).length - 1}
                                  className="p-0.5 text-gray-500 hover:text-blue-600 disabled:text-gray-300"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                  </svg>
                                </button>
                              </div>
                            )}
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
                                <TrustScoreBadge score={membership.user.trustScore} />
                              </p>
                              <p className="text-sm text-gray-500">{membership.user.email}</p>
                              {!membership.user.emailVerified && !membership.user.phoneVerified && (
                                <p className="text-xs text-orange-600 font-medium mt-0.5">
                                  No email or phone verification
                                </p>
                              )}
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
                      {readiness && readiness.membersWithoutVerification && readiness.membersWithoutVerification.length > 0 && (
                        <div className="mb-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-sm font-semibold text-orange-900 mb-1">Verification Warning</p>
                          <p className="text-sm text-orange-800 mb-2">
                            The following members do not have email verification or phone number verification. Proceed with caution:
                          </p>
                          <ul className="text-sm text-orange-800 list-disc list-inside">
                            {readiness.membersWithoutVerification.map((m, i) => (
                              <li key={i}>{m.firstName} {m.lastName}</li>
                            ))}
                          </ul>
                        </div>
                      )}
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
              {group.status === 'ACTIVE' && currentCycle && (() => {
                const allPayments = currentCycle.payments || [];
                const totalPayments = allPayments.length;
                const completedPayments = allPayments.filter(p => p.status === 'COMPLETED').length;
                const progress = totalPayments > 0 ? completedPayments / totalPayments : 0;

                // Group payments by member
                const memberGroups: { user: { id: string; firstName: string; lastName: string }; payments: Payment[] }[] = [];
                const seen: Record<string, number> = {};
                for (const p of allPayments) {
                  if (seen[p.user.id] === undefined) {
                    seen[p.user.id] = memberGroups.length;
                    memberGroups.push({ user: p.user, payments: [] });
                  }
                  memberGroups[seen[p.user.id]].payments.push(p);
                }

                // Find next contribution due date
                const now = new Date();
                const pendingWithDates = allPayments
                  .filter(p => p.status === 'PENDING' && p.dueDate)
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
                const nextDue = pendingWithDates.find(p => new Date(p.dueDate!) >= now) || pendingWithDates[pendingWithDates.length - 1];

                // Determine number of contribution periods
                const periodsCount = memberGroups.length > 0 ? memberGroups[0].payments.length : 1;

                return (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Cycle</h2>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-4 border border-blue-200">
                      {/* Header with progress ring */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Cycle {currentCycle.cycleNumber}</h3>
                          {nextDue?.dueDate && (
                            <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v9.75" />
                              </svg>
                              Next due: {new Date(nextDue.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            Payout: ${currentCycle.totalAmount.toFixed(2)}
                          </p>
                        </div>

                        {/* Progress ring */}
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#3b82f6" strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 18}`}
                              strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress)}`}
                              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs font-bold text-gray-900">{completedPayments}</span>
                            <span className="text-[9px] text-gray-500">/{totalPayments}</span>
                          </div>
                        </div>
                      </div>

                      {/* Contribution period timeline */}
                      {periodsCount > 1 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Contribution Periods</p>
                          <div className="flex gap-1">
                            {Array.from({ length: periodsCount }, (_, i) => {
                              const period = i + 1;
                              const periodPayments = allPayments.filter(p => p.contributionPeriod === period);
                              const periodCompleted = periodPayments.filter(p => p.status === 'COMPLETED').length;
                              const periodTotal = periodPayments.length;
                              const allDone = periodCompleted === periodTotal;
                              const partial = !allDone && periodCompleted > 0;

                              return (
                                <div key={period} className="flex-1 text-center">
                                  <div className={`h-1.5 rounded-full ${allDone ? 'bg-green-500' : partial ? 'bg-green-300' : 'bg-gray-200'}`} />
                                  <span className="text-[9px] text-gray-400 mt-0.5 block">Wk {period}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="border-t border-blue-200 pt-4">
                        <div className="space-y-3">
                          {memberGroups.map((mg) => {
                            const completed = mg.payments.filter(p => p.status === 'COMPLETED').length;
                            const total = mg.payments.length;
                            const isMe = mg.user.id === user?.id;
                            const nextPending = mg.payments.find(p => p.status === 'PENDING');
                            const memberProgress = total > 0 ? completed / total : 0;

                            return (
                              <div key={mg.user.id} className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                  isMe ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {mg.user.firstName[0]}{mg.user.lastName[0]}
                                </div>

                                {/* Name + progress bar */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm truncate ${isMe ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                                    {isMe ? 'You' : `${mg.user.firstName} ${mg.user.lastName}`}
                                  </p>
                                  <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                                    <div
                                      className={`h-1 rounded-full transition-all duration-300 ${completed === total ? 'bg-green-500' : 'bg-blue-500'}`}
                                      style={{ width: `${memberProgress * 100}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Status */}
                                {completed === total ? (
                                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-100 text-green-800 flex-shrink-0">Done</span>
                                ) : isMe && nextPending ? (
                                  <button
                                    onClick={() => {
                                      setSelectedPayment(nextPending);
                                      setShowPaymentModal(true);
                                    }}
                                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded flex-shrink-0"
                                  >
                                    {nextPending.dueDate && new Date(nextPending.dueDate) > new Date() ? 'Pay Early' : 'Pay Now'}
                                  </button>
                                ) : (
                                  <span className="text-xs font-medium text-gray-500 flex-shrink-0">{completed}/{total}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recipient info */}
                      <div className="mt-4 pt-3 border-t border-blue-200 flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                        </svg>
                        <span>Recipient: </span>
                        <span className="font-semibold text-gray-900">
                          {currentCycle.biddingStatus === 'OPEN' && !currentCycle.recipientId
                            ? 'Determined by bidding'
                            : currentCycle.recipientId === user?.id
                              ? 'You'
                              : isOwner
                                ? (group.memberships.find(m => m.user.id === currentCycle.recipientId)?.user.firstName || 'Unknown')
                                : 'Another member'}
                        </span>
                      </div>
                    </div>

                    {/* Bidding Section */}
                    {group.payoutMethod === 'BIDDING' && currentCycle.biddingStatus && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-amber-900">
                            {currentCycle.biddingStatus === 'OPEN' ? 'Bidding Open' : 'Bidding Closed'}
                          </h3>
                          {currentCycle.biddingStatus === 'OPEN' && (
                            <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Live</span>
                          )}
                        </div>

                        {currentCycle.biddingStatus === 'OPEN' && (
                          <>
                            <p className="text-sm text-amber-800 mb-4">
                              Place your bid - the member willing to pay the highest fee wins this cycle's payout.
                              The fee is deducted from your payout amount (${currentCycle.totalAmount.toFixed(2)}).
                            </p>

                            {/* Place bid form */}
                            <div className="flex gap-2 mb-4">
                              <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                  type="number"
                                  value={bidAmount}
                                  onChange={(e) => setBidAmount(e.target.value)}
                                  placeholder="Enter bid amount"
                                  min="0.01"
                                  step="0.01"
                                  className="w-full pl-7 pr-3 py-2 border border-amber-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                              </div>
                              <button
                                onClick={handlePlaceBid}
                                disabled={bidLoading || !bidAmount}
                                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:bg-gray-400"
                              >
                                {bidLoading ? 'Placing...' : 'Place Bid'}
                              </button>
                            </div>
                            {bidError && (
                              <p className="text-sm text-red-600 mb-3">{bidError}</p>
                            )}
                          </>
                        )}

                        {/* Bids list */}
                        {bids.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-amber-900">{bids.length} bid{bids.length !== 1 ? 's' : ''} placed</p>
                            {bids.map((bid) => (
                              <div key={bid.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-amber-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-semibold">
                                    {bid.user.firstName[0]}{bid.user.lastName ? bid.user.lastName[0] : ''}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {bid.userId === user?.id ? 'You' : bid.user.firstName}
                                  </span>
                                </div>
                                {bid.amount !== undefined && (
                                  <span className="text-sm font-bold text-amber-700">${bid.amount.toFixed(2)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Resolve button (owner only) */}
                        {isOwner && currentCycle.biddingStatus === 'OPEN' && bids.length > 0 && (
                          <button
                            onClick={handleResolveBidding}
                            disabled={bidLoading}
                            className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                          >
                            {bidLoading ? 'Resolving...' : 'Resolve Bidding (Award to Highest Bidder)'}
                          </button>
                        )}

                        {currentCycle.biddingStatus === 'CLOSED' && currentCycle.recipientId && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm font-medium text-green-900">
                              Winner: {currentCycle.recipientId === user?.id
                                ? 'You'
                                : isOwner
                                  ? (group.memberships.find(m => m.user.id === currentCycle.recipientId)?.user.firstName || 'Unknown')
                                  : 'Another member'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                                {cycle.payments && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    ({cycle.payments.filter(p => p.status === 'COMPLETED').length}/{cycle.payments.length} payments)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">Recipient</p>
                            <p className="text-sm text-gray-900">
                              {!cycle.recipientId
                                ? (cycle.biddingStatus === 'OPEN' ? 'Bidding open' : 'TBD')
                                : cycle.recipientId === user?.id
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
        {showPaymentModal && selectedPayment && token && (
          <PaymentModal
            paymentId={selectedPayment.id}
            amount={selectedPayment.amount}
            groupName={group.name}
            token={token}
            onClose={() => { setShowPaymentModal(false); setSelectedPayment(null); }}
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
