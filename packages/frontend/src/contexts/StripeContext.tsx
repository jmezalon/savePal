import { createContext, useContext, useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeContextType {
  stripe: Stripe | null;
  publishableKey: string | null;
}

const StripeContext = createContext<StripeContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // Fetch publishable key from backend
        const response = await fetch(`${API_BASE_URL}/api/payment-methods/config`);
        const data = await response.json();

        if (data.success && data.data.publishableKey) {
          const key = data.data.publishableKey;
          setPublishableKey(key);

          // Load Stripe
          const stripeInstance = await loadStripe(key);
          setStripe(stripeInstance);
        }
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
      }
    };

    initializeStripe();
  }, []);

  return (
    <StripeContext.Provider value={{ stripe, publishableKey }}>
      {children}
    </StripeContext.Provider>
  );
}

export function useStripe() {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
}
