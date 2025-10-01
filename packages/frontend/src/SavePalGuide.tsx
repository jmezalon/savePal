import { useState } from 'react';

const SavePalGuide = () => {
  const [activeSection, setActiveSection] = useState('wireframes');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-900 mb-2">SavePal Implementation Guide</h1>
          <p className="text-gray-600">Complete technical architecture and roadmap for your sousou app</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex overflow-x-auto border-b">
            <button
              onClick={() => setActiveSection('wireframes')}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                activeSection === 'wireframes'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Wireframes
            </button>
            <button
              onClick={() => setActiveSection('architecture')}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                activeSection === 'architecture'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveSection('backend')}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                activeSection === 'backend'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Backend
            </button>
            <button
              onClick={() => setActiveSection('frontend')}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                activeSection === 'frontend'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Frontend
            </button>
            <button
              onClick={() => setActiveSection('roadmap')}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                activeSection === 'roadmap'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Roadmap
            </button>
            <button
              onClick={() => setActiveSection('costs')}
              className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                activeSection === 'costs'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              Costs & Legal
            </button>
          </div>

          <div className="p-6">
            {activeSection === 'wireframes' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Dashboard Screen</h3>
                  <p className="text-gray-700 mb-4">
                    The main dashboard shows user stats and active sousou groups. Users can see their total saved amount, 
                    number of active groups, and next payout date.
                  </p>
                  <div className="bg-gray-100 p-4 rounded border-2 border-gray-300">
                    <div className="bg-indigo-600 text-white p-3 rounded mb-4 flex justify-between items-center">
                      <span className="font-bold">SavePal</span>
                      <span>🔔 👤</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-blue-50 p-2 rounded text-center text-sm">💰 $2,400</div>
                      <div className="bg-blue-50 p-2 rounded text-center text-sm">📊 3 Groups</div>
                      <div className="bg-blue-50 p-2 rounded text-center text-sm">📅 Sept 15</div>
                    </div>
                    <button className="w-full bg-indigo-600 text-white p-3 rounded mb-4">+ Create New Sousou</button>
                    <div className="space-y-2">
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold">👥 Family Savings</div>
                        <div className="text-sm text-gray-600">$500/month • Position: 3/10</div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <div className="font-semibold">👥 Friends Group</div>
                        <div className="text-sm text-gray-600">$200/biweekly • Position: 5/8</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Create Sousou Flow</h3>
                  <p className="text-gray-700 mb-4">
                    Multi-step form for creating a new sousou group.
                  </p>
                  <div className="bg-gray-100 p-4 rounded border-2 border-gray-300">
                    <div className="bg-white p-3 rounded mb-4">
                      <div className="font-semibold mb-2">← Back | Create New Sousou</div>
                    </div>
                    <div className="space-y-3">
                      <input className="w-full p-2 border rounded" placeholder="Group name..." />
                      <textarea className="w-full p-2 border rounded" placeholder="Description..." rows={2}></textarea>
                      <input className="w-full p-2 border rounded" placeholder="$ Contribution Amount" />
                      <div className="flex gap-2">
                        <button className="px-4 py-2 border rounded">Weekly</button>
                        <button className="px-4 py-2 border rounded">Biweekly</button>
                        <button className="px-4 py-2 border rounded">Monthly</button>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-300 text-sm">
                        💰 Fee: 1.5% of pot or $10 minimum
                      </div>
                      <button className="w-full bg-indigo-600 text-white p-3 rounded">Continue</button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Group Detail View</h3>
                  <p className="text-gray-700 mb-4">
                    Detailed view showing group info, progress, current cycle status, and member list.
                  </p>
                  <div className="bg-gray-100 p-4 rounded border-2 border-gray-300">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded mb-4 text-center">
                      <div className="text-2xl font-bold">$5,000 Total Pot</div>
                      <div>10 Members • Weekly</div>
                    </div>
                    <div className="bg-white p-3 rounded mb-4">
                      <div className="text-sm mb-2">Cycle 3 of 10 - 30% Complete</div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{width: '30%'}}></div>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded mb-4">
                      <div className="font-semibold mb-2">Current Cycle</div>
                      <div className="text-sm text-gray-600">Payout: John Doe (Position 3)</div>
                      <div className="text-sm text-gray-600">Due: September 1</div>
                      <div className="text-sm text-green-600">✓ You paid on Aug 28</div>
                    </div>
                    <button className="w-full bg-indigo-600 text-white p-3 rounded">💳 Make Payment ($500)</button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'architecture' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-lg shadow">
                  <h3 className="text-2xl font-bold mb-4">Why Monorepo?</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="font-semibold mb-2">✅ Advantages</div>
                      <ul className="space-y-1 text-sm">
                        <li>• Faster initial development</li>
                        <li>• Shared types between FE/BE</li>
                        <li>• Single deployment pipeline</li>
                        <li>• Easier refactoring</li>
                        <li>• Better for solo/small team</li>
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold mb-2">⚠️ When to Split</div>
                      <ul className="space-y-1 text-sm">
                        <li>• 10K+ active users</li>
                        <li>• Need independent scaling</li>
                        <li>• Multiple teams</li>
                        <li>• You can migrate later!</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Tech Stack</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="font-bold mb-2 text-blue-900">Frontend</div>
                      <ul className="text-sm space-y-1">
                        <li>• React 18</li>
                        <li>• TypeScript</li>
                        <li>• Vite</li>
                        <li>• TailwindCSS</li>
                        <li>• React Router</li>
                        <li>• Context API</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <div className="font-bold mb-2 text-green-900">Backend</div>
                      <ul className="text-sm space-y-1">
                        <li>• Node.js + Express</li>
                        <li>• TypeScript</li>
                        <li>• Prisma ORM</li>
                        <li>• PostgreSQL</li>
                        <li>• Redis + Bull</li>
                        <li>• JWT Auth</li>
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <div className="font-bold mb-2 text-purple-900">Services</div>
                      <ul className="text-sm space-y-1">
                        <li>• Stripe</li>
                        <li>• Twilio</li>
                        <li>• SendGrid</li>
                        <li>• AWS S3</li>
                        <li>• Vercel</li>
                        <li>• Supabase</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'backend' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Database Models</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Core Models</div>
                      <ul className="text-sm space-y-1">
                        <li>• User - Accounts & auth</li>
                        <li>• Group - Sousou groups</li>
                        <li>• Membership - Participation</li>
                        <li>• Cycle - Payment rounds</li>
                        <li>• Payment - Contributions</li>
                        <li>• Payout - Disbursements</li>
                        <li>• PaymentMethod - Stored cards</li>
                        <li>• Notification - Alerts</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Key Enums</div>
                      <ul className="text-sm space-y-1">
                        <li>• Frequency: WEEKLY, BIWEEKLY, MONTHLY</li>
                        <li>• PayoutMethod: SEQUENTIAL, RANDOM, BIDDING</li>
                        <li>• GroupStatus: PENDING, ACTIVE, COMPLETED</li>
                        <li>• PaymentStatus: PENDING, COMPLETED, FAILED</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">API Endpoints</h3>
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="font-bold mb-2">Auth Routes (/api/auth)</div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>POST /register, /login, /logout</div>
                        <div>POST /verify-email, /verify-phone</div>
                        <div>GET /me</div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <div className="font-bold mb-2">Group Routes (/api/groups)</div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>GET / POST / GET /:id PUT /:id DELETE /:id</div>
                        <div>POST /:id/activate, /:id/invite</div>
                        <div>POST /join/:code</div>
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <div className="font-bold mb-2">Payment Routes (/api/payments)</div>
                      <div className="text-sm text-gray-700 space-y-1">
                        <div>GET /methods POST /methods</div>
                        <div>POST /contribute</div>
                        <div>POST /webhook (Stripe)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Services</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-sm mb-1">Auth Service</div>
                      <div className="text-xs text-gray-600">JWT tokens, password hashing, verification</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-sm mb-1">Group Service</div>
                      <div className="text-xs text-gray-600">CRUD, members, cycles, payout order</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-sm mb-1">Payment Service</div>
                      <div className="text-xs text-gray-600">Stripe integration, escrow, fee calc</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-sm mb-1">Notification Service</div>
                      <div className="text-xs text-gray-600">Email, SMS, push notifications</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-sm mb-1">Scheduler Service</div>
                      <div className="text-xs text-gray-600">Reminders, payouts, cycle progression</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="font-bold text-sm mb-1">KYC Service</div>
                      <div className="text-xs text-gray-600">Identity verification, trust score</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'frontend' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Component Structure</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Components</div>
                      <ul className="text-sm space-y-1">
                        <li>• common/ - Button, Input, Modal, Card</li>
                        <li>• layout/ - Header, Sidebar, BottomNav</li>
                        <li>• group/ - GroupCard, CreateForm</li>
                        <li>• payment/ - PaymentForm, Methods</li>
                        <li>• notifications/ - Bell, List</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Pages</div>
                      <ul className="text-sm space-y-1">
                        <li>• auth/ - Login, Register</li>
                        <li>• Dashboard</li>
                        <li>• GroupDetail</li>
                        <li>• CreateGroup</li>
                        <li>• Payment</li>
                        <li>• Profile</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">State Management</h3>
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="font-bold mb-2">AuthContext</div>
                      <div className="text-sm text-gray-700">
                        Manages user authentication state, login/logout methods, token storage
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <div className="font-bold mb-2">GroupContext</div>
                      <div className="text-sm text-gray-700">
                        Handles group data, loading states, CRUD operations
                      </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                      <div className="font-bold mb-2">NotificationContext</div>
                      <div className="text-sm text-gray-700">
                        Manages notifications, unread count, mark as read
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Responsive Design</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Mobile</div>
                      <ul className="text-sm space-y-1">
                        <li>• Bottom navigation</li>
                        <li>• Single column</li>
                        <li>• Full-width cards</li>
                        <li>• Touch-friendly</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Tablet</div>
                      <ul className="text-sm space-y-1">
                        <li>• Side navigation</li>
                        <li>• 2-column grids</li>
                        <li>• Modal dialogs</li>
                        <li>• Wider forms</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Desktop</div>
                      <ul className="text-sm space-y-1">
                        <li>• Sidebar nav</li>
                        <li>• 3-column layouts</li>
                        <li>• Hover effects</li>
                        <li>• Multi-panel</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'roadmap' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">11-Week Plan</h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-green-500 pl-4">
                      <div className="font-bold">Week 1: Project Setup</div>
                      <div className="text-sm text-gray-600">Initialize monorepo, backend, frontend packages</div>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="font-bold">Weeks 2-3: Core Backend</div>
                      <div className="text-sm text-gray-600">Auth system, group management, database</div>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-4">
                      <div className="font-bold">Weeks 4-5: Payment Integration</div>
                      <div className="text-sm text-gray-600">Stripe setup, payment flows, payout logic</div>
                    </div>
                    <div className="border-l-4 border-yellow-500 pl-4">
                      <div className="font-bold">Weeks 6-7: Frontend MVP</div>
                      <div className="text-sm text-gray-600">Core pages, components, API integration</div>
                    </div>
                    <div className="border-l-4 border-red-500 pl-4">
                      <div className="font-bold">Week 8: Notifications</div>
                      <div className="text-sm text-gray-600">Email, SMS, push, scheduler</div>
                    </div>
                    <div className="border-l-4 border-indigo-500 pl-4">
                      <div className="font-bold">Weeks 9-10: Testing</div>
                      <div className="text-sm text-gray-600">Unit tests, security audit, bug fixes</div>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-4">
                      <div className="font-bold">Week 11: Deployment</div>
                      <div className="text-sm text-gray-600">Vercel, Railway, Supabase, launch!</div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-300 p-6 rounded-lg">
                  <div className="font-bold mb-2 text-yellow-900">💡 Pro Tip</div>
                  <div className="text-sm text-yellow-800">
                    Use Claude Code in Windsurf IDE to build each feature. Start with Phase 1, test thoroughly, 
                    then move to the next phase. Quality over speed!
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'costs' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Monthly Costs</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded">
                      <div className="font-bold mb-3">Starting Out</div>
                      <ul className="text-sm space-y-2">
                        <li>• Vercel: $0 (free tier)</li>
                        <li>• Railway/Render: $5-20</li>
                        <li>• Supabase: $0-25</li>
                        <li>• Stripe: 2.9% + $0.30/tx</li>
                        <li>• SendGrid: $0-15</li>
                        <li>• Twilio: $0-20</li>
                        <li className="font-bold pt-2">Total: ~$20-80/mo</li>
                      </ul>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                      <div className="font-bold mb-3">Revenue</div>
                      <ul className="text-sm space-y-2">
                        <li>• 50 groups = $500/mo</li>
                        <li>• 100 groups = $1,000/mo</li>
                        <li>• 500 groups = $5,000/mo</li>
                        <li className="font-bold text-green-700 pt-2">Break-even: 40-80 groups</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-300 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-4 text-red-900">⚠️ Legal Requirements</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-bold">Money Transmission License</div>
                      <div className="text-gray-700">Required in most US states. Use Stripe Connect as alternative.</div>
                    </div>
                    <div>
                      <div className="font-bold">Terms of Service & Privacy Policy</div>
                      <div className="text-gray-700">Hire a lawyer to draft proper legal documents.</div>
                    </div>
                    <div>
                      <div className="font-bold">KYC/AML Compliance</div>
                      <div className="text-gray-700">Identity verification and transaction monitoring required.</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-300 p-3 rounded mt-3">
                      <div className="font-bold text-yellow-900">Recommendation:</div>
                      <div className="text-yellow-800">Start small with friends/family, then get licensing before scaling.</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-xl font-bold mb-4">Success Metrics</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">User Metrics</div>
                      <ul className="text-sm space-y-1">
                        <li>• Daily/Monthly Active Users</li>
                        <li>• User retention rate</li>
                        <li>• Avg groups per user</li>
                      </ul>
                    </div>
                    <div className="bg-gray-50 p-4 rounded">
                      <div className="font-bold mb-2">Financial Metrics</div>
                      <ul className="text-sm space-y-1">
                        <li>• Monthly Recurring Revenue</li>
                        <li>• Transaction volume</li>
                        <li>• Default rate</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Build SavePal?</h2>
          <p className="mb-4">Start with Phase 1 and use Claude Code in Windsurf IDE!</p>
          <div className="text-sm opacity-90">Focus on MVP: Auth → Groups → Payments → Deploy</div>
        </div>
      </div>
    </div>
  );
};

export default SavePalGuide;