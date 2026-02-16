import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { StripeProvider } from './contexts/StripeContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import CreateGroup from './pages/CreateGroup';
import JoinGroup from './pages/JoinGroup';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import SmsConsent from './pages/SmsConsent';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import PaymentHistory from './pages/PaymentHistory';

function AppContent() {
  const location = useLocation();

  // Pages that should NOT show the navbar
  const publicPages = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/sms-consent', '/privacy', '/terms'];
  const showNavbar = !publicPages.includes(location.pathname);

  return (
    <>
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/sms-consent" element={<SmsConsent />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/create" element={<CreateGroup />} />
        <Route path="/groups/join" element={<JoinGroup />} />
        <Route path="/groups/:id" element={<GroupDetails />} />
        <Route path="/payments" element={<PaymentHistory />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StripeProvider>
          <AppContent />
        </StripeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
