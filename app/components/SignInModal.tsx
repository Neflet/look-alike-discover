"use client";

import { X, Mail, Lock } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message || 'Failed to sign in');
        } else {
          // Success - close modal
          onClose();
          setEmail('');
          setPassword('');
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          setError(error.message || 'Failed to sign up');
        } else {
          // Success: show "check your email" message
          setStatus(`We've sent you a confirmation link to ${email}. Please confirm your email to continue.`);
          // Clear form
          setEmail('');
          setPassword('');
          setDisplayName('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 w-full max-w-md overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center hover:bg-zinc-800 transition-colors rounded z-10"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Header */}
        <div className="p-8 text-center border-b border-zinc-800">
          <h2 className="text-4xl font-black text-white tracking-tighter mb-2">SWAGAI</h2>
          <p className="text-zinc-400">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Display Name (only for sign up) */}
          {mode === 'signup' && (
            <div>
              <label className="text-white font-bold text-sm mb-2 block tracking-wide">
                DISPLAY NAME
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full h-12 bg-black border border-zinc-700 focus:border-white text-white pl-4 pr-4 outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-white font-bold text-sm mb-2 block tracking-wide">
              EMAIL
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full h-12 bg-black border border-zinc-700 focus:border-white text-white pl-12 pr-4 outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-white font-bold text-sm mb-2 block tracking-wide">
              PASSWORD
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-12 bg-black border border-zinc-700 focus:border-white text-white pl-12 pr-4 outline-none transition-colors placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-3">
              {error}
            </div>
          )}

          {/* Status Message */}
          {status && (
            <div className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded p-3">
              {status}
            </div>
          )}

          {/* Forgot Password (only for sign in) */}
          {mode === 'signin' && (
            <div className="text-right">
              <button
                type="button"
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          {!status && (
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-white hover:bg-zinc-200 text-black font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'SIGN IN' : 'SIGN UP'}
            </button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-900 text-zinc-500">OR</span>
            </div>
          </div>

          {/* Social Sign In (only for sign in) */}
          {mode === 'signin' && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-zinc-900 text-zinc-500">OR</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold transition-colors"
                >
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-bold transition-colors"
                >
                  Continue with Apple
                </button>
              </div>
            </>
          )}

          {/* Toggle Sign In/Sign Up */}
          <p className="text-center text-zinc-400 text-sm">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setStatus(null);
                  }}
                  className="text-white hover:underline font-bold"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                    setStatus(null);
                  }}
                  className="text-white hover:underline font-bold"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

