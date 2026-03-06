import { useEffect, useRef } from 'react';

interface AppleSignInButtonProps {
  onSuccess: (identityToken: string, fullName?: { firstName?: string; lastName?: string }) => void;
  onError: (error: string) => void;
  mode?: 'signin' | 'signup';
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: Record<string, string>) => void;
        signIn: () => Promise<{
          authorization: {
            id_token: string;
            code: string;
          };
          user?: {
            name?: {
              firstName?: string;
              lastName?: string;
            };
            email?: string;
          };
        }>;
      };
    };
  }
}

export default function AppleSignInButton({ onSuccess, onError, mode = 'signin' }: AppleSignInButtonProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Load Apple JS SDK
    if (!document.getElementById('apple-signin-script')) {
      const script = document.createElement('script');
      script.id = 'apple-signin-script';
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => initAppleAuth();
      document.head.appendChild(script);
    } else if (window.AppleID && !initialized.current) {
      initAppleAuth();
    }
  }, []);

  const initAppleAuth = () => {
    if (!window.AppleID || initialized.current) return;
    initialized.current = true;

    const serviceId = import.meta.env.VITE_APPLE_SERVICE_ID;
    if (!serviceId) {
      console.warn('VITE_APPLE_SERVICE_ID not set — Apple Sign-In disabled');
      return;
    }

    window.AppleID.auth.init({
      clientId: serviceId,
      scope: 'name email',
      redirectURI: window.location.origin,
      usePopup: 'true',
    });
  };

  const handleClick = async () => {
    if (!window.AppleID) {
      onError('Apple Sign-In is not available');
      return;
    }

    try {
      const response = await window.AppleID.auth.signIn();
      const identityToken = response.authorization.id_token;
      const fullName = response.user?.name
        ? { firstName: response.user.name.firstName, lastName: response.user.name.lastName }
        : undefined;
      onSuccess(identityToken, fullName);
    } catch (err: any) {
      // User cancelled
      if (err?.error === 'popup_closed_by_user') return;
      onError(err?.error || 'Apple Sign-In failed');
    }
  };

  const serviceId = import.meta.env.VITE_APPLE_SERVICE_ID;
  if (!serviceId) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-black text-white text-sm font-medium hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M12.152 5.076c-.088.069-1.627.938-1.627 2.872 0 2.24 1.968 3.032 2.025 3.05-.013.05-.314 1.084-.1038 2.206-.725.844-1.478 1.687-2.624 1.687-1.146 0-1.438-.669-2.756-.669-1.28 0-1.737.688-2.793.688-1.056 0-1.784-.781-2.605-1.737C.765 11.858 0 9.85 0 7.937c0-3.069 1.994-4.697 3.96-4.697 1.044 0 1.916.688 2.571.688.619 0 1.581-.731 2.774-.731.449 0 2.064.037 3.13 1.559l-.283.32zM9.611 2.108c.49-.581.838-1.388.838-2.194 0-.112-.013-.225-.037-.319-.8.031-1.75.534-2.328 1.203-.449.506-.866 1.313-.866 2.131 0 .125.019.25.031.287.056.013.15.025.243.025.719 0 1.625-.481 2.119-1.133z"/>
      </svg>
      {mode === 'signin' ? 'Sign in with Apple' : 'Sign up with Apple'}
    </button>
  );
}
