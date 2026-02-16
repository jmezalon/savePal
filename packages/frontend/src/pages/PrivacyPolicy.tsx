export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p>
              <strong>Effective Date:</strong> February 15, 2026
            </p>
            <p className="mt-2">
              SavePal ("we," "us," or "our") operates the SavePal application and website
              at <a href="https://save-pals.com" className="text-blue-600 hover:underline">save-pals.com</a>.
              This Privacy Policy explains how we collect, use, disclose, and protect your
              personal information when you use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="font-medium mt-2">Account Information</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Name (first and last)</li>
              <li>Email address</li>
              <li>Phone number (optional, for verification)</li>
              <li>Password (stored securely using hashing)</li>
            </ul>

            <p className="font-medium mt-4">Financial Information</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Payment card details (processed and stored securely by Stripe; we do not store full card numbers)</li>
              <li>Bank account details for payouts (routing number, account number — processed by Stripe Connect)</li>
              <li>Transaction history and payment records</li>
            </ul>

            <p className="font-medium mt-4">Usage Information</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Group membership and savings activity</li>
              <li>Device and browser information</li>
              <li>IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Create and manage your SavePal account</li>
              <li>Facilitate group savings (ROSCA) contributions and payouts</li>
              <li>Process payments through Stripe</li>
              <li>Send verification codes via SMS (Twilio) and email</li>
              <li>Send payment reminders and group notifications</li>
              <li>Calculate and display trust scores</li>
              <li>Prevent fraud and ensure platform security</li>
              <li>Comply with legal and regulatory requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Share Your Information</h2>
            <p>We do not sell your personal information. We share information only with:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li><strong>Stripe:</strong> To process payments, manage payment methods, and handle payouts via Stripe Connect</li>
              <li><strong>Twilio:</strong> To send SMS verification codes and account notifications</li>
              <li><strong>Group Members:</strong> Your name is visible to other members of savings groups you join</li>
              <li><strong>Legal Authorities:</strong> When required by law, legal process, or to protect our rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>All data is transmitted over HTTPS (TLS encryption)</li>
              <li>Passwords are hashed using bcrypt</li>
              <li>Payment card data is handled entirely by Stripe (PCI-DSS compliant)</li>
              <li>Authentication uses secure JSON Web Tokens (JWT)</li>
              <li>Database hosted on Supabase with encryption at rest</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as
              needed to provide you services. Transaction records are retained for legal and
              regulatory compliance. You may request deletion of your account and associated
              data by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Update or correct your personal information via your Profile</li>
              <li>Request deletion of your account and data</li>
              <li>Opt out of SMS communications by removing your phone number</li>
              <li>Opt out of non-essential email notifications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookies and Tracking</h2>
            <p>
              SavePal uses local storage and session tokens for authentication purposes.
              We do not use third-party tracking cookies or advertising trackers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p>
              SavePal is not intended for use by individuals under the age of 18. We do not
              knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              material changes by posting the updated policy on this page with a revised
              effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your personal data, contact us at:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Email: support@save-pals.com</li>
              <li>Website: <a href="https://save-pals.com" className="text-blue-600 hover:underline">https://save-pals.com</a></li>
            </ul>
          </section>

          <section className="border-t pt-6">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> February 15, 2026
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
