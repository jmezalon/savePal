import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold text-white mb-3">SavePals</h3>
            <p className="text-sm leading-relaxed">
              Community-powered savings made simple. Join a ROSCA group and start building your financial future together.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm hover:text-white transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link to="/sms-consent" className="text-sm hover:text-white transition-colors">
                  SMS Consent
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-gray-200 uppercase tracking-wider mb-3">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="text-sm hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@save-pals.com"
                  className="text-sm hover:text-white transition-colors"
                >
                  support@save-pals.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center">
          <p className="text-sm">
            &copy; {currentYear} SavePals. Built on the foundation of trust and community.
          </p>
        </div>
      </div>
    </footer>
  );
}
