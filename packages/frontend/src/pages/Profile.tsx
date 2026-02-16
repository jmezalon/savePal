import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AddPaymentMethod from '../components/AddPaymentMethod';

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

export default function Profile() {
  const { user, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email verification state
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  // Phone verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  // Payout Settings state
  const [connectStatus, setConnectStatus] = useState<{
    hasAccount: boolean;
    isOnboarded: boolean;
    accountId: string | null;
    bankLast4: string | null;
    bankName: string | null;
  } | null>(null);
  const [isLoadingConnect, setIsLoadingConnect] = useState(false);
  const [isConnectAction, setIsConnectAction] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhoneNumber(user.phoneNumber || '');
      setEmailNotifications(user.emailNotifications ?? true);
      setSmsNotifications(user.smsNotifications ?? false);
      setPushNotifications(user.pushNotifications ?? true);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
        // Refresh user data
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/notifications`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailNotifications,
          smsNotifications,
          pushNotifications,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notification preferences updated!' });
      } else {
        throw new Error(data.error || 'Failed to update preferences');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update preferences',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    setMessage(null);

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      setIsChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setIsChangingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      } else {
        throw new Error(data.error || 'Failed to change password');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setIsResendingVerification(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
      } else {
        throw new Error(data.error || 'Failed to resend verification email');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to resend verification email',
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    setIsSendingCode(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-phone-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Verification code sent to your phone!' });
        setShowCodeInput(true);
      } else {
        throw new Error(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send verification code',
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setIsVerifyingPhone(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-phone`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Phone verified successfully! Your trust score has increased.' });
        setVerificationCode('');
        setShowCodeInput(false);
        // Refresh user data
        window.location.reload();
      } else {
        throw new Error(data.error || 'Failed to verify phone');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to verify phone',
      });
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  // Load payment methods
  const loadPaymentMethods = async () => {
    if (!token) return;

    setIsLoadingPaymentMethods(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-methods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentMethods(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  };

  // Delete payment method
  const handleDeletePaymentMethod = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-methods/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Payment method deleted successfully' });
        loadPaymentMethods();
      } else {
        throw new Error(data.error || 'Failed to delete payment method');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete payment method',
      });
    }
  };

  // Set default payment method
  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/payment-methods/${id}/default`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Default payment method updated' });
        loadPaymentMethods();
      } else {
        throw new Error(data.error || 'Failed to update default payment method');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update default payment method',
      });
    }
  };

  // Handle payment method added successfully
  const handlePaymentMethodAdded = () => {
    setMessage({ type: 'success', text: 'Payment method added successfully!' });
    setShowAddPaymentMethod(false);
    loadPaymentMethods();
  };

  // Load Connect / payout status
  const loadConnectStatus = async () => {
    if (!token) return;

    setIsLoadingConnect(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/connect/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setConnectStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load connect status:', error);
    } finally {
      setIsLoadingConnect(false);
    }
  };

  // Handle bank account setup
  const handleBankAccountSetup = async () => {
    setMessage(null);

    if (!routingNumber || !accountNumber) {
      setMessage({ type: 'error', text: 'Routing number and account number are required' });
      return;
    }

    if (!/^\d{9}$/.test(routingNumber)) {
      setMessage({ type: 'error', text: 'Routing number must be 9 digits' });
      return;
    }

    if (accountNumber !== confirmAccountNumber) {
      setMessage({ type: 'error', text: 'Account numbers do not match' });
      return;
    }

    setIsConnectAction(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/connect/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routingNumber,
          accountNumber,
          accountHolderName: accountHolderName || undefined,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Bank account added successfully!' });
        setShowBankForm(false);
        setRoutingNumber('');
        setAccountNumber('');
        setConfirmAccountNumber('');
        setAccountHolderName('');
        loadConnectStatus();
      } else {
        throw new Error(data.error || 'Failed to set up bank account');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to set up bank account',
      });
    } finally {
      setIsConnectAction(false);
    }
  };

  // Handle remove bank account
  const handleRemoveBankAccount = async () => {
    if (!confirm('Are you sure you want to remove your bank account? You will not receive payouts until you add a new one.')) return;

    setIsConnectAction(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/connect/bank-account`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Bank account removed' });
        loadConnectStatus();
      } else {
        throw new Error(data.error || 'Failed to remove bank account');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove bank account',
      });
    } finally {
      setIsConnectAction(false);
    }
  };

  // Load payment methods and connect status on mount
  useEffect(() => {
    loadPaymentMethods();
    loadConnectStatus();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Profile Content */}
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        {/* Email Verification Banner */}
        {user && !user.emailVerified && (
          <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-800 font-medium">
                  Your email is not verified. Please check your inbox for the verification email.
                </span>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="px-4 py-2 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline disabled:opacity-50"
              >
                {isResendingVerification ? 'Sending...' : 'Resend Email'}
              </button>
            </div>
          </div>
        )}

        {/* Phone Verification Banner */}
        {user && user.phoneNumber && !user.phoneVerified && (
          <div className="mb-6 p-4 rounded-md bg-blue-50 border border-blue-200">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-blue-800 font-medium">
                    Verify your phone number to increase your trust score
                  </span>
                </div>
                <a
                  href="/sms-consent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  SMS Terms
                </a>
              </div>

              {!showCodeInput ? (
                <button
                  onClick={handleSendPhoneVerification}
                  disabled={isSendingCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 w-fit"
                >
                  {isSendingCode ? 'Sending...' : 'Send Verification Code'}
                </button>
              ) : (
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="px-3 py-2 border border-blue-300 rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleVerifyPhone}
                    disabled={isVerifyingPhone || verificationCode.length !== 6}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isVerifyingPhone ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    onClick={handleSendPhoneVerification}
                    disabled={isSendingCode}
                    className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                  >
                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Personal Information */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                    isEditing ? 'bg-white' : 'bg-gray-50'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!isEditing}
                placeholder="Optional"
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                  isEditing ? 'bg-white' : 'bg-gray-50'
                }`}
              />
            </div>

            {isEditing && (
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFirstName(user?.firstName || '');
                    setLastName(user?.lastName || '');
                    setPhoneNumber(user?.phoneNumber || '');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">SMS Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via text message</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smsNotifications}
                  onChange={(e) => setSmsNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications in the app</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveNotifications}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Security - Change Password */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Security</h2>

          {!showPasswordChange ? (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Change Password
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
            {!showAddPaymentMethod && (
              <button
                onClick={() => setShowAddPaymentMethod(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Add Payment Method
              </button>
            )}
          </div>

          {showAddPaymentMethod ? (
            <AddPaymentMethod
              token={token || ''}
              onSuccess={handlePaymentMethodAdded}
              onCancel={() => setShowAddPaymentMethod(false)}
            />
          ) : (
            <div className="space-y-3">
              {isLoadingPaymentMethods ? (
                <p className="text-gray-500 text-center py-4">Loading payment methods...</p>
              ) : paymentMethods.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No payment methods saved. Add one to make payments easier.
                </p>
              ) : (
                paymentMethods.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-md"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {pm.brand && (
                          <span className="text-sm font-medium capitalize">{pm.brand}</span>
                        )}
                        <span className="text-gray-600">•••• {pm.last4}</span>
                        {pm.expiryMonth && pm.expiryYear && (
                          <span className="text-sm text-gray-500">
                            Expires {pm.expiryMonth}/{pm.expiryYear}
                          </span>
                        )}
                      </div>
                      {pm.isDefault && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!pm.isDefault && (
                        <button
                          onClick={() => handleSetDefaultPaymentMethod(pm.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePaymentMethod(pm.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Payout Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Payout Settings</h2>
          <p className="text-sm text-gray-500 mb-4">
            Add your bank account to receive payouts when it's your turn in a ROSCA group.
          </p>

          {isLoadingConnect ? (
            <p className="text-gray-500 text-center py-4">Loading payout settings...</p>
          ) : connectStatus?.isOnboarded ? (
            // Active - show bank info
            <div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-3">
                  <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">
                      {connectStatus.bankName || 'Bank Account'} •••• {connectStatus.bankLast4}
                    </p>
                    <p className="text-sm text-green-600">Active - ready to receive payouts</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowBankForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Update
                  </button>
                  <button
                    onClick={handleRemoveBankAccount}
                    disabled={isConnectAction}
                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {showBankForm && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md space-y-4">
                  <h3 className="font-medium text-gray-900">Update Bank Account</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      placeholder={`${user?.firstName || ''} ${user?.lastName || ''}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank to use your profile name</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="9 digits"
                        maxLength={9}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Account number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Account Number</label>
                    <input
                      type="text"
                      value={confirmAccountNumber}
                      onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Re-enter account number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={handleBankAccountSetup}
                      disabled={isConnectAction}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isConnectAction ? 'Saving...' : 'Update Bank Account'}
                    </button>
                    <button
                      onClick={() => {
                        setShowBankForm(false);
                        setRoutingNumber('');
                        setAccountNumber('');
                        setConfirmAccountNumber('');
                        setAccountHolderName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : showBankForm || (!connectStatus?.hasAccount && !connectStatus?.isOnboarded) ? (
            // No account or show form - bank details form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder={`${user?.firstName || ''} ${user?.lastName || ''}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use your profile name</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Routing Number</label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="9 digits"
                    maxLength={9}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Account number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Account Number</label>
                <input
                  type="text"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleBankAccountSetup}
                  disabled={isConnectAction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConnectAction ? 'Saving...' : 'Save Bank Account'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Account Stats */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Trust Score</p>
              <p className="text-2xl font-bold text-gray-900">{user?.trustScore || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email Verified</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.emailVerified ? '✓ Yes' : '✗ No'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone Verified</p>
              <p className="text-lg font-semibold text-gray-900">
                {user?.phoneVerified ? '✓ Yes' : '✗ No'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
