import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { password });
      login(res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid-pattern flex items-center justify-center p-6">
      <div className="card-glass w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-primary-500 to-neon-blue flex items-center justify-center shadow-glow">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Admin Login</h1>
          <p className="text-gray-400 text-sm">Restricted access</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            className="input-field"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl p-3 text-sm">{error}</div>}
          <button type="submit" disabled={loading || !password} className="btn-primary w-full">
            <div className="relative flex items-center justify-center gap-2">
              {loading ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg> : <LogIn className="w-4 h-4" />}
              <span className="font-semibold">{loading ? 'Signing in...' : 'Sign in'}</span>
            </div>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
