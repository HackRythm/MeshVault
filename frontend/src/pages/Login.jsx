import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email and password.');
      return;
    }

    setError('');
    try {
      setLoading(true);
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-sm border border-zinc-800 rounded-lg bg-[#0c0c0e] p-6 shadow-2xl">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-sm font-bold text-white mb-3">
            M
          </div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">Sign in to MeshVault</h1>
          <p className="text-xs text-zinc-400 mt-1">Academic Project Tracking & Evaluation System</p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-md text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="University Email"
            type="email"
            placeholder="name@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            loading={loading}
          >
            Authenticate
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-800/80 text-center">
          <span className="text-[11px] text-zinc-500">
            Protected academic portal • Amrita Vishwa Vidyapeetham
          </span>
        </div>
      </div>
    </div>
  );
}
