import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
}

interface DebtPaymentModalProps {
  groupId: string;
  groupName: string;
  debtAmount: number;
  chargeAmount: number;
  processingFee: number;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DebtPaymentModal({
  groupId,
  groupName,
  debtAmount,
  chargeAmount,
  processingFee,
  token,
  onClose,
  onSuccess,
}: DebtPaymentModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-methods`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const methods = data.data || [];
        setPaymentMethods(methods);

        // Pre-select the default method
        const defaultMethod = methods.find((m: PaymentMethod) => m.isDefault);
        if (defaultMethod) {
          setSelectedMethodId(defaultMethod.id);
        } else if (methods.length > 0) {
          setSelectedMethodId(methods[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayDebt = async () => {
    if (!selectedMethodId) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/debt/${groupId}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: selectedMethodId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getBrandDisplay = (brand: string | null) => {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pay Outstanding Debt</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold text-gray-900">Debt Paid Successfully!</p>
              <p className="text-sm text-gray-600 mt-1">Your outstanding debt has been resolved.</p>
            </div>
          ) : (
            <>
              {/* Debt Breakdown */}
              <div className="bg-amber-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-700 mb-2">{groupName}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-amber-800">
                    <span>Outstanding debt</span>
                    <span>${debtAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Processing fee</span>
                    <span>${processingFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-amber-200 pt-1 flex justify-between font-bold text-amber-900">
                    <span>Total charge</span>
                    <span>${chargeAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading payment methods...</p>
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-3">No payment methods found.</p>
                  <Link
                    to="/profile"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add a payment method in your Profile
                  </Link>
                </div>
              ) : (
                <>
                  {/* Payment Method Selection */}
                  <div className="space-y-2 mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2">Select Payment Method</p>
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedMethodId === method.id
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedMethodId === method.id}
                          onChange={() => setSelectedMethodId(method.id)}
                          className="mr-3 text-amber-600"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getBrandDisplay(method.brand)} ending in {method.last4}
                          </p>
                          {method.expiryMonth && method.expiryYear && (
                            <p className="text-xs text-gray-500">
                              Expires {String(method.expiryMonth).padStart(2, '0')}/{method.expiryYear}
                            </p>
                          )}
                        </div>
                        {method.isDefault && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                            Default
                          </span>
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Pay Button */}
                  <button
                    onClick={handlePayDebt}
                    disabled={isProcessing || !selectedMethodId}
                    className="w-full py-3 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : `Pay Debt $${chargeAmount.toFixed(2)}`}
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                disabled={isProcessing}
                className="w-full mt-2 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
