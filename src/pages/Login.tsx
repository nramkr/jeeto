import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (authData.user) {
          await supabase.from('users').insert({
            id: authData.user.id,
            email: authData.user.email,
          });
        }

        setMessage('Registration successful! Check your email for verification or try signing in.');
        setIsSignUp(false);
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Ensure user exists in public.users (in case they were created via auth only)
        if (authData.user) {
          await supabase.from('users').upsert({
            id: authData.user.id,
            email: authData.user.email,
          });
        }

        navigate('/');
      }
    } catch (err: any) {
      if (err.status === 429 || err.message?.includes('rate limit')) {
        setError('Too many requests. Please wait a few minutes before trying again, or check your Supabase rate limit settings.');
      } else {
        setError(err.message || 'An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue-light p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-blue-dark">JEETO</h1>
          <p className="text-slate-500 mt-2">
            {isSignUp ? 'Create your analytical console' : 'Sign in to your analytical console'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-brand-blue-soft focus:ring-2 focus:ring-brand-blue-medium focus:border-transparent outline-none transition-all"
              placeholder="student@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-brand-blue-soft focus:ring-2 focus:ring-brand-blue-medium focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          {message && (
            <p className="text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 mt-4"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-brand-blue-medium hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          Initially a single-user system.
        </div>
      </motion.div>
    </div>
  );
}
