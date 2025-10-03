export default function SmsConsent() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">SMS Messaging Consent</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Purpose of SMS Messages</h2>
            <p>
              SavePal uses SMS text messages solely for account security and verification purposes.
              When you provide your phone number and request verification, you consent to receive
              SMS messages containing verification codes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Types of Messages</h2>
            <p>You will receive the following types of SMS messages:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Phone number verification codes (6-digit codes)</li>
              <li>Account security notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Opt-In</h2>
            <p>
              To receive SMS verification codes, you must:
            </p>
            <ol className="list-decimal list-inside ml-4 mt-2 space-y-2">
              <li>Create a SavePal account</li>
              <li>Navigate to your Profile Settings</li>
              <li>Add your phone number</li>
              <li>Click "Send Verification Code" button</li>
            </ol>
            <p className="mt-3">
              By clicking the "Send Verification Code" button, you explicitly consent to receive
              SMS messages from SavePal at the phone number you provided.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Message Frequency</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Costs</h2>
            <p>
              Message and data rates may apply. Standard messaging rates from your mobile carrier
              will apply to all SMS messages sent and received.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How to Opt-Out</h2>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Help and Support</h2>
            <p>
              For help or questions about SMS messages, contact us:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
              <li>Email: support@save-pals.com</li>
              <li>Website: https://save-pals.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Privacy</h2>
            <p>
              Your phone number and messaging data are protected in accordance with our Privacy
              Policy. We do not share your phone number with third parties except as necessary
              to deliver SMS messages through our service provider (Twilio).
            </p>
          </section>

          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> October 3, 2025
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
  );
}
