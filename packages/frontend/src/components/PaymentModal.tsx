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

interface PaymentModalProps {
  paymentId: string;
  amount: number;
  groupName: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  paymentId,
  amount,
  groupName,
  token,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handlePay = async () => {
    if (!selectedMethodId) {
      setError('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/process`, {
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

      onSuccess();
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
            <h3 className="text-lg font-semibold text-gray-900">Make Payment</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Payment Details */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-700">{groupName}</p>
            <p className="text-2xl font-bold text-blue-900">${amount.toFixed(2)}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedMethodId === method.id}
                      onChange={() => setSelectedMethodId(method.id)}
                      className="mr-3 text-blue-600"
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
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Default
                      </span>
                    )}
                  </label>
                ))}
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePay}
                disabled={isProcessing || !selectedMethodId}
                className="w-full py-3 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
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
        </div>
      </div>
    </div>
  );
}
