import { useState } from 'react';
import { Link } from 'react-router-dom';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'Why do I need to verify my identity?',
    answer:
      'SavePal uses Stripe to securely handle payments and payouts. Stripe requires identity verification to comply with federal Know Your Customer (KYC) and Anti-Money Laundering (AML) regulations. This protects you and every member in your savings group from fraud. The verification process is handled entirely by Stripe — SavePal never stores your government-issued ID or sensitive personal documents.',
  },
  {
    question: 'How long does a payout take to process?',
    answer:
      'Once a payout is initiated, it typically takes 1–2 business days for the funds to arrive in your connected bank account. This processing time is standard for Stripe payouts. Weekends and bank holidays are not counted as business days, so payouts initiated on a Friday may not arrive until the following Tuesday or Wednesday.',
  },
  {
    question: 'When should I click "Retry Payout"?',
    answer:
      'You should only use the Retry Payout button after the system has reached its maximum number of automatic retry attempts and the payout status shows as failed. Clicking retry before the maximum attempts are exhausted can interfere with the automatic retry process. If your payout has failed and you see the retry option available, make sure the underlying issue (e.g., incorrect bank details) is resolved before retrying.',
  },
  {
    question: 'How do I set up my payout method?',
    answer:
      'Go to your Profile page, scroll to the "Payout Settings" section, and click "Set Up Payouts." You will be guided through Stripe\'s onboarding flow to connect your bank account and verify your identity. Once complete, you\'ll be able to receive payouts directly to your bank account when it\'s your turn in a savings group.',
  },
  {
    question: 'What is a ROSCA / Sousou?',
    answer:
      'A ROSCA (Rotating Savings and Credit Association), also known as Sousou, is a community savings method where a group of people contribute a fixed amount on a regular schedule. Each cycle, one member receives the full pool of funds. SavePal digitizes this tradition so you can participate with anyone, anywhere — with the security of automated payments and transparent tracking.',
  },
  {
    question: 'What happens if I miss a payment?',
    answer:
      'If your scheduled payment fails (e.g., due to insufficient funds or an expired card), you\'ll receive a notification. SavePal will attempt to process the payment again automatically. It\'s important to keep a valid payment method on file and ensure sufficient funds are available. Repeated missed payments may affect your standing in the group.',
  },
  {
    question: 'Can I leave a group after it has started?',
    answer:
      'Once a savings group has started its cycle, all members are committed for the full duration. This ensures fairness — every member who has already received their payout has an obligation to continue contributing. If you have an emergency, please contact support and we will work with you and the group admin on a resolution.',
  },
  {
    question: 'How do I update my payment method?',
    answer:
      'Navigate to your Profile page and look for the "Payment Methods" section. You can add a new debit card or remove an existing one. Make sure you always have at least one valid payment method on file so your scheduled contributions are processed smoothly.',
  },
  {
    question: 'Is my financial information secure?',
    answer:
      'Yes. SavePal never stores your full card numbers or bank account details on our servers. All payment processing is handled through Stripe, which is PCI DSS Level 1 certified — the highest level of security certification in the payments industry. Your data is encrypted in transit and at rest.',
  },
];

interface ErrorItem {
  title: string;
  description: string;
  resolution: string;
}

const commonErrors: ErrorItem[] = [
  {
    title: 'Payment Failed',
    description:
      'Your scheduled contribution could not be processed.',
    resolution:
      'Check that your payment method is valid and has sufficient funds. Go to Profile > Payment Methods to update your card. If the issue persists, try removing and re-adding your payment method.',
  },
  {
    title: 'Payout Failed',
    description:
      'The payout to your bank account could not be completed.',
    resolution:
      'Verify that your bank account details are correct in Profile > Payout Settings. Common causes include incorrect account numbers, closed accounts, or incomplete identity verification. Resolve the issue, then use "Retry Payout" only after the maximum automatic attempts have been exhausted.',
  },
  {
    title: 'Identity Verification Failed',
    description:
      'Stripe was unable to verify your identity during onboarding.',
    resolution:
      'Make sure the photo of your ID is clear, well-lit, and matches the name on your account. Accepted documents include a driver\'s license, passport, or state ID. Try the verification process again from Profile > Payout Settings. If you continue to have trouble, contact support.',
  },
  {
    title: 'Stripe Onboarding Incomplete',
    description:
      'You started the Stripe Connect setup but did not finish all required steps.',
    resolution:
      'Return to Profile > Payout Settings and click "Set Up Payouts" to resume. You\'ll need to complete identity verification and link a bank account before you can receive payouts.',
  },
  {
    title: 'Unable to Join Group',
    description:
      'You received an error when trying to join a savings group.',
    resolution:
      'The group may be full or the invitation link may have expired. Double-check the invite code with the group admin. Make sure you have a payment method on file before attempting to join.',
  },
  {
    title: 'Auto-Payment Not Processing',
    description:
      'Your automatic contribution was not deducted as expected.',
    resolution:
      'Ensure auto-pay is enabled in your group settings and that you have a valid default payment method. If the payment date falls on a weekend or holiday, it may process on the next business day.',
  },
];

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openError, setOpenError] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Help Center
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions, troubleshoot issues, and learn how to get the most out of SavePal.
          </p>
        </div>

        {/* Common Errors Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Common Errors &amp; Troubleshooting</h2>
          <p className="text-sm text-gray-500 mb-5">
            Encountering an issue? Find your error below for step-by-step guidance.
          </p>
          <div className="space-y-3">
            {commonErrors.map((error, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenError(openError === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    </span>
                    <span className="font-medium text-gray-900">{error.title}</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openError === idx ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {openError === idx && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mt-3 mb-2">
                      <span className="font-medium text-gray-700">What happened: </span>
                      {error.description}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">How to fix it: </span>
                      {error.resolution}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Frequently Asked Questions</h2>
          <p className="text-sm text-gray-500 mb-5">
            Quick answers to the questions we hear most.
          </p>
          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                      </svg>
                    </span>
                    <span className="font-medium text-gray-900">{faq.question}</span>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mt-3 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Still need help */}
        <section className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-sm text-gray-600 mb-5 max-w-md mx-auto">
            If you can't find what you're looking for, our support team is happy to assist. We typically respond within 24 hours.
          </p>
          <a
            href="mailto:support@save-pals.com"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Contact support@save-pals.com
          </a>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-gray-500">
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <span className="hidden sm:inline">&middot;</span>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">Terms &amp; Conditions</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
