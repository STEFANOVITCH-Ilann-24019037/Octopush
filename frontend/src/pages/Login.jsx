import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import GhLogo from '../components/GhLogo';
import { toast } from 'sonner';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) { toast.error('Please enter both fields'); return; }
    setLoading(true);
    try {
      await login(identifier, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-12 px-4">
      <Link to="/" className="mb-4 flex items-center gap-2">
        <GhLogo className="h-12 w-12" />
        <span className="font-bold text-2xl">Octopush</span>
      </Link>
      <h1 className="text-2xl font-light text-center mb-6">Sign in to your account</h1>

      <form onSubmit={onSubmit} className="w-full max-w-sm border border-border rounded-md bg-card p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium">Username or email address</Label>
          <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="mt-1 bg-background border-border" autoFocus />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Password</Label>
            <Link to="#" className="text-xs text-[hsl(var(--gh-link))] hover:underline">Forgot password?</Link>
          </div>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-background border-border" />
        </div>
        <Button type="submit" disabled={loading} className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="mt-4 w-full max-w-sm border border-border rounded-md bg-card p-4 text-center text-sm">
        New to Octopush?{' '}
        <Link to="/signup" className="text-[hsl(var(--gh-link))] hover:underline">Create an account</Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Demo: <code className="bg-muted px-1.5 py-0.5 rounded">octodev</code> / <code className="bg-muted px-1.5 py-0.5 rounded">password123</code></p>
    </div>
  );
};

export default Login;
