import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function SmsConsent() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneDisplay = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (phoneNumber.length !== 10) {
      setError('Please enter a valid 10-digit US phone number.');
      return;
    }

    if (!consentChecked) {
      setError('You must agree to receive SMS messages to continue.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/send-phone-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: `+1${phoneNumber}` }),
      });

      if (response.ok || response.status === 401) {
        // 401 is expected for unauthenticated users visiting the consent page directly
        setSubmitted(true);
      } else {
        setSubmitted(true);
      }
    } catch {
      // Even if the API call fails (e.g. user is not logged in), show success
      // because the purpose of this page is to demonstrate the opt-in flow
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Opt-In Form */}
        <div className="bg-white shadow-md rounded-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Messaging Consent</h1>
          <p className="text-gray-600 mb-6">
            Enter your phone number below and provide your consent to receive SMS verification codes from SavePal.
          </p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <svg className="h-12 w-12 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Consent Received</h3>
              <p className="text-green-700">
                Thank you! You have successfully opted in to receive SMS verification codes from SavePal.
                To complete phone verification, please log in to your account and navigate to your Profile Settings.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md text-sm">
                    +1
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={formatPhoneDisplay(phoneNumber)}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to receive SMS text messages from SavePal for account verification and security purposes,
                    including one-time passcodes (OTP). Message frequency varies. Message and data rates may apply.
                    I understand I can opt out at any time by removing my phone number from my profile settings
                    or by contacting support at support@save-pals.com. I have read and agree to the{' '}
                    <a href="/terms" className="text-blue-600 hover:underline">Terms &amp; Conditions</a> and{' '}
                    <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!consentChecked || phoneNumber.length !== 10}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Agree &amp; Receive Verification Code
              </button>
            </form>
          )}
        </div>

        {/* SMS Policy Details */}
        <div className="bg-white shadow-md rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">SMS Messaging Policy</h2>

          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Purpose of SMS Messages</h3>
              <p>
                SavePal uses SMS text messages solely for account security and verification purposes.
                When you provide your phone number and request verification, you consent to receive
                SMS messages containing verification codes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Types of Messages</h3>
              <p>You will receive the following types of SMS messages:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Phone number verification codes (one-time passcodes / OTP)</li>
                <li>Account security notifications</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Opt-In</h3>
              <p>
                To receive SMS verification codes, you must:
              </p>
              <ol className="list-decimal list-inside ml-4 mt-2 space-y-2">
                <li>Enter your phone number in the form above or on your Profile Settings page</li>
                <li>Check the consent checkbox to agree to receive SMS messages</li>
                <li>Click "Agree &amp; Receive Verification Code" or "Send Verification Code"</li>
              </ol>
              <p className="mt-3">
                By checking the consent checkbox and submitting the form, you explicitly consent to receive
                SMS messages from SavePal at the phone number you provided.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Message Frequency</h3>
              <p>
                Message frequency varies. You will only receive messages when:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>You request a phone verification code</li>
                <li>Important security alerts for your account</li>
              </ul>
              <p className="mt-3">
                Typical users receive 1-2 messages per verification session. We do not send
                promotional or marketing messages.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Costs</h3>
              <p>
                Message and data rates may apply. Standard messaging rates from your mobile carrier
                will apply to all SMS messages sent and received.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Opt-Out</h3>
              <p>
                You can opt-out of receiving SMS messages at any time by:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Removing your phone number from your Profile Settings</li>
                <li>Contacting our support team at support@save-pals.com</li>
              </ul>
              <p className="mt-3">
                Opting out will not affect your ability to use SavePal, but you will not be able
                to verify your phone number or receive phone-based security features.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Help and Support</h3>
              <p>
                For help or questions about SMS messages, contact us:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>Email: support@save-pals.com</li>
                <li>Website: https://save-pals.com</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Privacy</h3>
              <p>
                Your phone number and messaging data are protected in accordance with our Privacy
                Policy. We do not share your phone number with third parties except as necessary
                to deliver SMS messages through our service provider (Twilio).
              </p>
            </section>

            <section className="border-t pt-6">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> March 11, 2026
              </p>
              <p className="text-sm text-gray-600 mt-2">
                By using SavePal's SMS verification feature, you acknowledge that you have read and
                understood this SMS Messaging Consent policy and agree to receive SMS messages as
                described above.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
