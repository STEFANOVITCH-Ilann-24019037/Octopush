import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import GhLogo from '../components/GhLogo';
import { toast } from 'sonner';

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) { toast.error('All fields are required'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signup(username, email, password);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-12 px-4">
      <Link to="/" className="mb-4 flex items-center gap-2">
        <GhLogo className="h-12 w-12" />
        <span className="font-bold text-2xl">Octopush</span>
      </Link>
      <h1 className="text-2xl font-light text-center mb-6">Create your account</h1>

      <form onSubmit={onSubmit} className="w-full max-w-sm border border-border rounded-md bg-card p-5 space-y-4">
        <div>
          <Label className="text-sm font-medium">Username</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 bg-background border-border" autoFocus />
          <p className="text-xs text-muted-foreground mt-1">Letters, numbers, dashes and underscores only.</p>
        </div>
        <div>
          <Label className="text-sm font-medium">Email address</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-background border-border" />
        </div>
        <div>
          <Label className="text-sm font-medium">Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-background border-border" />
          <p className="text-xs text-muted-foreground mt-1">At least 6 characters.</p>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <div className="mt-4 w-full max-w-sm border border-border rounded-md bg-card p-4 text-center text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-[hsl(var(--gh-link))] hover:underline">Sign in</Link>
      </div>
    </div>
  );
};

export default Signup;
