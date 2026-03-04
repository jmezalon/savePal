import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <img
          src="https://media.giphy.com/media/ZvwTFpFfLTF3o9UE25/giphy.gif"
          alt="Piggy bank being smashed"
          className="mx-auto w-64 h-auto rounded-xl shadow-lg mb-6"
        />
        <h1 className="text-9xl font-extrabold text-blue-600">404</h1>
        <p className="mt-4 text-2xl font-semibold text-gray-900">Oops! This page broke the piggy bank</p>
        <p className="mt-2 text-gray-600">
          We looked everywhere, but your savings are safe — this page just doesn't exist.
        </p>
        <div className="mt-8">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="inline-block px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go Home'}
          </Link>
        </div>
      </div>
    </div>
  );
}
