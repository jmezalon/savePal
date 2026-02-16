export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms and Conditions</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p>
              <strong>Effective Date:</strong> February 15, 2026
            </p>
            <p className="mt-2">
              Welcome to SavePal. By accessing or using the SavePal application and website
              at <a href="https://save-pals.com" className="text-blue-600 hover:underline">save-pals.com</a> ("Service"),
              you agree to be bound by these Terms and Conditions ("Terms"). Please read them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account or using SavePal, you agree to these Terms, our{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, and our{' '}
              <a href="/sms-consent" className="text-blue-600 hover:underline">SMS Messaging Consent</a> policy.
              If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility</h2>
            <p>
              You must be at least 18 years old and capable of entering into a binding agreement
              to use SavePal. By registering, you represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Description of Service</h2>
            <p>
              SavePal is a platform that facilitates Rotating Savings and Credit Associations (ROSCAs),
              also known as group savings circles. Members of a group contribute a fixed amount on a
              regular schedule, and the pooled funds are distributed to one member per cycle until
              all members have received a payout.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Account Responsibilities</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must provide accurate and complete information during registration</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>You must notify us immediately of any unauthorized access to your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Payments and Fees</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Contributions are processed through Stripe, a PCI-DSS compliant payment processor</li>
              <li>A processing fee is added to each contribution to cover payment processing costs (approximately 2.9% + $0.30 per transaction)</li>
              <li>A 3% platform fee is deducted from payouts to sustain the SavePal platform</li>
              <li>You are responsible for ensuring your payment method has sufficient funds</li>
              <li>Failed payments may affect your trust score and group standing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Group Participation</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>By joining a group, you commit to making all scheduled contributions</li>
              <li>Group owners set the contribution amount, frequency, and member limit</li>
              <li>Payout order is determined by the group's cycle schedule</li>
              <li>Failure to make timely contributions may result in penalties, reduced trust score, or removal from the group</li>
              <li>SavePal is not responsible for disputes between group members</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Payouts</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Payouts are processed via Stripe Connect to your registered bank account</li>
              <li>You must set up and verify a payout account (bank account) to receive funds</li>
              <li>Payout processing times depend on Stripe and your bank, typically 2-5 business days</li>
              <li>A 3% platform fee is deducted from each payout amount</li>
              <li>SavePal is not liable for delays caused by Stripe or your financial institution</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Trust Score</h2>
            <p>
              SavePal assigns a trust score to each user based on their activity, including
              payment history, phone and email verification, and group participation. The trust
              score is visible to other users and helps groups assess member reliability.
              SavePal reserves the right to modify the trust score algorithm at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Use the Service for money laundering, fraud, or any illegal activity</li>
              <li>Create multiple accounts to manipulate groups or trust scores</li>
              <li>Intentionally default on contribution obligations</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Use the Service in any way that violates applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate your account at our discretion if you violate these
              Terms or engage in activity that is harmful to other users or the platform. You
              may also delete your account at any time, subject to any outstanding payment
              obligations in active groups.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Disclaimers</h2>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>SavePal is a platform facilitator, not a financial institution or lender</li>
              <li>The Service is provided "as is" without warranties of any kind</li>
              <li>We do not guarantee that all group members will fulfill their contribution obligations</li>
              <li>We are not responsible for losses arising from member defaults or payment failures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, SavePal shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, or any loss
              of profits or revenues, whether incurred directly or indirectly, or any loss of
              data, use, or goodwill arising out of your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will notify users of
              material changes by posting the updated Terms on this page. Continued use of the
              Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the
              United States. Any disputes arising from these Terms or the Service shall be
              resolved in the appropriate courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Us</h2>
            <p>
              If you have questions about these Terms, contact us at:
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
