import { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useStripe as useStripeContext } from '../contexts/StripeContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

interface AddPaymentMethodFormProps {
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddPaymentMethodForm({ token, onSuccess, onCancel }: AddPaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setAsDefault, setSetAsDefault] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create SetupIntent
      const setupResponse = await fetch(`${API_BASE_URL}/api/payment-methods/setup-intent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const setupData = await setupResponse.json();

      if (!setupResponse.ok) {
        throw new Error(setupData.error || 'Failed to create setup intent');
      }

      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm card setup
      const { setupIntent, error: stripeError } = await stripe.confirmCardSetup(
        setupData.data.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (setupIntent?.payment_method) {
        // Save payment method to backend
        const saveResponse = await fetch(`${API_BASE_URL}/api/payment-methods`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method,
            isDefault: setAsDefault,
          }),
        });

        const saveData = await saveResponse.json();

        if (!saveResponse.ok) {
          throw new Error(saveData.error || 'Failed to save payment method');
        }

        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border border-gray-300 rounded-md p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="setAsDefault"
          type="checkbox"
          checked={setAsDefault}
          onChange={(e) => setSetAsDefault(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="setAsDefault" className="ml-2 block text-sm text-gray-700">
          Set as default payment method
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Add Card'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

interface AddPaymentMethodProps {
  token: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddPaymentMethod({ token, onSuccess, onCancel }: AddPaymentMethodProps) {
  const { stripe } = useStripeContext();

  if (!stripe) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500">Loading payment form...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripe}>
      <AddPaymentMethodForm token={token} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
