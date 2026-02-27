import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface Payment {
  id: string;
  amount: number;
  status: string;
  contributionPeriod?: number;
  dueDate?: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
  cycle: {
    cycleNumber: number;
    dueDate: string;
    group: {
      id: string;
      name: string;
    };
  };
}

interface Payout {
  id: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  transferredAt?: string;
  failureReason?: string;
  retryCount?: number;
  createdAt: string;
  cycle: {
    cycleNumber: number;
    group: {
      id: string;
      name: string;
    };
  };
}

interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalAmount: number;
  paidAmount: number;
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'payouts'>('payments');
  const [isLoading, setIsLoading] = useState(true);
  const [retryingPayoutId, setRetryingPayoutId] = useState<string | null>(null);
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, statsRes, payoutsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/payments/my-payments`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/payments/my-stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/payouts/my-payouts`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (paymentsRes.status === 401 || statsRes.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.data || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data);
      }

      if (payoutsRes.ok) {
        const data = await payoutsRes.json();
        setPayouts(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryPayout = async (payoutId: string) => {
    setRetryingPayoutId(payoutId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payouts/${payoutId}/retry`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.status === 401) {
        logout();
        navigate('/login');
        return;
      }

      // Refresh data to show updated status
      await fetchData();
    } catch (err) {
      console.error('Failed to retry payout:', err);
    } finally {
      setRetryingPayoutId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Payment History</h1>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">${stats.paidAmount.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'payments'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Payments ({payments.length})
                </button>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 ${
                    activeTab === 'payouts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Payouts ({payouts.length})
                </button>
              </nav>
            </div>

            <div className="p-4">
              {/* Payments Tab */}
              {activeTab === 'payments' && (
                payments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No payments yet.</p>
                    <Link to="/groups" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                      Join a group to get started
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <Link
                            to={`/groups/${payment.cycle.group.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {payment.cycle.group.name}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Cycle {payment.cycle.cycleNumber}
                            {payment.contributionPeriod && payment.contributionPeriod > 1 ? `, Period ${payment.contributionPeriod}` : ''}
                            {' '}&middot; Due {new Date(payment.dueDate || payment.cycle.dueDate).toLocaleDateString()}
                          </p>
                          {payment.status === 'FAILED' && payment.failureReason && (
                            <p className="text-xs text-red-500 mt-0.5">{payment.failureReason}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${getStatusBadge(payment.status)}`}>
                            {payment.status}
                          </span>
                          {payment.paidAt && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(payment.paidAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Payouts Tab */}
              {activeTab === 'payouts' && (
                payouts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No payouts received yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payouts.map((payout) => (
                      <div
                        key={payout.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <Link
                            to={`/groups/${payout.cycle.group.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            {payout.cycle.group.name}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Cycle {payout.cycle.cycleNumber}
                          </p>
                          {(payout.status === 'PENDING' || payout.status === 'FAILED') && payout.failureReason && (
                            <p className="text-xs text-red-500 mt-0.5">{payout.failureReason}</p>
                          )}
                          {payout.retryCount != null && payout.retryCount > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">Retry attempts: {payout.retryCount}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-gray-900">${payout.netAmount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">
                            ${payout.amount.toFixed(2)} - ${payout.feeAmount.toFixed(2)} fee
                          </p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${getStatusBadge(payout.status)}`}>
                            {payout.status}
                          </span>
                          {(payout.status === 'PENDING' || payout.status === 'FAILED') && (
                            <button
                              onClick={() => handleRetryPayout(payout.id)}
                              disabled={retryingPayoutId === payout.id}
                              className="block mt-2 ml-auto px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {retryingPayoutId === payout.id ? 'Retrying...' : 'Retry Payout'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
