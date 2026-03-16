import { Link } from 'react-router-dom';

const APP_STORE_URL = 'https://apps.apple.com/us/app/save-pals/id6760158627';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.savepal.app';

export default function Landing() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">SavePal</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
            Save Money Together,
            <span className="block text-blue-600">Achieve Goals Faster</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Join the modern way to save with friends and family. SavePal brings the traditional sousou (ROSCA) system into the digital age with transparency, security, and ease.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto text-center px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
            >
              Start Saving Now
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto text-center px-8 py-3 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-50 border-2 border-blue-600 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* What is Sousou Section */}
      <div id="how-it-works" className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              What is a Sousou?
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              A sousou (also known as ROSCA - Rotating Savings and Credit Association) is a time-tested savings method where a group of trusted people pool money together regularly, and each member receives the full pot in rotation.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Form a Group</h3>
              <p className="text-gray-600">
                Create or join a savings group with people you trust. Set the contribution amount and frequency that works for everyone.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Contribute Regularly</h3>
              <p className="text-gray-600">
                Each member contributes the agreed amount on schedule (weekly, bi-weekly, or monthly). Everyone pays in, one person receives the full pot.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Receive Your Turn</h3>
              <p className="text-gray-600">
                When it's your turn, you receive the full pot! Use it for emergencies, investments, or reaching your savings goals faster.
              </p>
            </div>
          </div>

          {/* Example Box */}
          <div className="mt-12 bg-blue-50 border-2 border-blue-200 rounded-xl p-6 max-w-4xl mx-auto">
            <h4 className="text-lg font-semibold text-blue-900 mb-3">📊 Example:</h4>
            <p className="text-blue-800">
              <strong>10 friends</strong> each contribute <strong>$100/month</strong> for 10 months.
              Each month, one person receives the full pot. Instead of saving $100/month for 10 months,
              you could receive your payout in month 1, 2, 3... or whenever your turn comes! Perfect for big purchases,
              debt payoff, or investment opportunities.
            </p>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-sm text-blue-700">
                <strong>💰 Fees:</strong> A small <strong>6% service fee</strong> applies — approximately 3% is added to each contribution for secure payment processing, and 3% is deducted from your payout. For a $100 contribution, you'd pay ~$103.29/month, and the payout recipient receives $970 from the $1,000 pot.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why Choose SavePal?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              We've modernized the traditional sousou with features that build trust and make saving easy.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trust Score System</h3>
              <p className="text-gray-600">
                Build your reputation with verified contributions and timely payments. Higher trust scores mean more opportunities.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Transparent</h3>
              <p className="text-gray-600">
                Every transaction is tracked and visible to group members. No surprises, no hidden fees.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multiple Payout Methods</h3>
              <p className="text-gray-600">
                Choose sequential order, random draw, or bidding system. Flexibility that fits your group's needs.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Reminders</h3>
              <p className="text-gray-600">
                Never miss a payment with automated reminders and payment tracking. Stay on top of your commitments.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dispute Resolution</h3>
              <p className="text-gray-600">
                Built-in dispute resolution and group moderation tools to handle conflicts fairly and transparently.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Track Your Progress</h3>
              <p className="text-gray-600">
                View payment history, upcoming cycles, and group analytics. Know exactly where you stand at all times.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                The Power of Community Savings
              </h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">No Interest or Fees</h4>
                    <p className="text-gray-600">Unlike loans, you get your money interest-free. What you contribute is what you get back.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">Forced Discipline</h4>
                    <p className="text-gray-600">Social accountability helps you stick to your savings goals better than solo saving.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">Access to Lump Sums</h4>
                    <p className="text-gray-600">Get large amounts of money when you need them, without waiting years or taking loans.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-green-500 mt-1 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-gray-900">Build Financial Networks</h4>
                    <p className="text-gray-600">Connect with like-minded savers and expand your trusted financial circle.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Perfect For:</h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <span className="text-2xl mr-3">💍</span>
                  <span>Wedding planning</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">🏠</span>
                  <span>Down payments on homes</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">🎓</span>
                  <span>Education expenses</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">🚗</span>
                  <span>Vehicle purchases</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">💼</span>
                  <span>Business startup capital</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">🚨</span>
                  <span>Emergency fund building</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">💳</span>
                  <span>Debt consolidation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile App Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
                SavePal on the Go
              </h2>
              <p className="text-lg text-gray-300 max-w-xl">
                Manage your savings groups, make payments, and track your progress — all from your phone. Get push notifications so you never miss a payment.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 md:justify-start justify-center">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Download on the</div>
                    <div className="text-lg font-semibold leading-tight">App Store</div>
                  </div>
                </a>
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302c.7.4.7 1.08 0 1.48l-2.302 1.302-2.532-2.532 2.532-2.552zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">Get it on</div>
                    <div className="text-lg font-semibold leading-tight">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
            <div className="flex-shrink-0">
              <img
                src="/images/ios-app-screenshot.png"
                alt="SavePal mobile app screenshot showing the dashboard"
                className="w-64 md:w-72 rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
            Ready to Start Saving Smarter?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join SavePal today and experience the power of community savings. It's free to get started!
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all"
          >
            Create Your Free Account
          </Link>
          <p className="mt-4 text-blue-100 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="underline hover:text-white">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © {new Date().getFullYear()} SavePal. Built on the foundation of trust and community.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
