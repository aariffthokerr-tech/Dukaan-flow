import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../utils/validation';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to send reset instructions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-50 py-14 px-4 sm:px-6">
      <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        {sent ? (
          <div>
            <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            <h1 className="mt-4 font-display text-xl font-bold text-neutral-900">
              Reset instructions sent
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              If an account exists for <span className="font-medium text-neutral-900">{email}</span>,
              a password reset link has been dispatched.
            </p>
            <Link
              to="/login"
              className="mt-6 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#111315] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-neutral-600">
              Enter your account email and we will send a password recovery link.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-sm font-medium text-neutral-800"
                >
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@yourshop.com"
                  className="mt-1.5 w-full min-h-[44px] rounded-lg border border-neutral-300 px-3.5 py-2 text-sm text-neutral-900 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[46px] rounded-lg bg-[#111315] px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 border-t border-neutral-200 pt-5 text-center text-sm text-neutral-600">
              Remembered your password?{' '}
              <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
