import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { User, Lock, Trash2, Camera } from 'lucide-react';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'account', label: 'Account', icon: Lock },
];

const UserSettingsPage = () => {
  const { user, updateMe, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState({ name: '', bio: '', company: '', location: '', website: '', avatar: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // Delete account
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setProfile({
      name: user.name || '',
      bio: user.bio || '',
      company: user.company || '',
      location: user.location || '',
      website: user.website || '',
      avatar: user.avatar || '',
    });
  }, [user, navigate]);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await updateMe(profile);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
    } finally { setSavingProfile(false); }
  };

  const changePassword = async () => {
    if (!pwd.current) { toast.error('Enter your current password'); return; }
    if (pwd.next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    setSavingPwd(true);
    try {
      await api.post('/users/me/password', { current_password: pwd.current, new_password: pwd.next });
      toast.success('Password changed');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed');
    } finally { setSavingPwd(false); }
  };

  const deleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/users/me');
      logout();
      navigate('/');
      toast.success('Account deleted');
    } catch { toast.error('Failed to delete account'); }
    finally { setDeletingAccount(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-8">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        <div className="flex gap-8">
          {/* Sidebar nav */}
          <nav className="w-52 shrink-0">
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => setSection(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      section === id
                        ? 'bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))] font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* ─── Profile section ─────────────────────────────── */}
            {section === 'profile' && (
              <>
                <section className="border border-border rounded-md overflow-hidden">
                  <div className="bg-card px-5 py-3 border-b border-border">
                    <h2 className="font-semibold">Public profile</h2>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Avatar preview */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={profile.avatar || `https://api.dicebear.com/9.x/identicon/svg?seed=${user.username}`}
                          alt="avatar"
                          className="h-20 w-20 rounded-full bg-muted object-cover"
                          onError={(e) => { e.target.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${user.username}`; }}
                        />
                        <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center">
                          <Camera className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-muted-foreground mb-1">Avatar URL</label>
                        <Input
                          value={profile.avatar}
                          onChange={(e) => setProfile({ ...profile, avatar: e.target.value })}
                          placeholder="https://example.com/avatar.png"
                          className="bg-background border-border text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Display name</label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          placeholder={user.username}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <Input
                          value={user.username}
                          disabled
                          className="bg-muted border-border text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Username cannot be changed.</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Bio</label>
                      <Textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us a little about yourself"
                        rows={3}
                        className="bg-background border-border resize-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <Input
                          value={profile.company}
                          onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                          placeholder="@company"
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <Input
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          placeholder="Paris, France"
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Website</label>
                      <Input
                        value={profile.website}
                        onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                        placeholder="https://yourwebsite.com"
                        className="bg-background border-border"
                      />
                    </div>

                    <div className="pt-1">
                      <Button
                        onClick={saveProfile}
                        disabled={savingProfile}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {savingProfile ? 'Saving…' : 'Save profile'}
                      </Button>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* ─── Account section ─────────────────────────────── */}
            {section === 'account' && (
              <>
                {/* Change password */}
                <section className="border border-border rounded-md overflow-hidden">
                  <div className="bg-card px-5 py-3 border-b border-border">
                    <h2 className="font-semibold">Change password</h2>
                  </div>
                  <div className="p-5 space-y-4 max-w-sm">
                    <div>
                      <label className="block text-sm font-medium mb-1">Current password</label>
                      <Input
                        type="password"
                        value={pwd.current}
                        onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                        className="bg-background border-border"
                        autoComplete="current-password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">New password</label>
                      <Input
                        type="password"
                        value={pwd.next}
                        onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                        className="bg-background border-border"
                        autoComplete="new-password"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Confirm new password</label>
                      <Input
                        type="password"
                        value={pwd.confirm}
                        onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                        className={`bg-background border-border ${pwd.confirm && pwd.next !== pwd.confirm ? 'border-destructive' : ''}`}
                        autoComplete="new-password"
                      />
                      {pwd.confirm && pwd.next !== pwd.confirm && (
                        <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
                      )}
                    </div>
                    <Button
                      onClick={changePassword}
                      disabled={savingPwd}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {savingPwd ? 'Updating…' : 'Update password'}
                    </Button>
                  </div>
                </section>

                {/* Email (read-only for now) */}
                <section className="border border-border rounded-md overflow-hidden">
                  <div className="bg-card px-5 py-3 border-b border-border">
                    <h2 className="font-semibold">Email address</h2>
                  </div>
                  <div className="p-5 max-w-sm">
                    <Input
                      value={user.email || ''}
                      disabled
                      className="bg-muted border-border text-muted-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email cannot be changed for now.</p>
                  </div>
                </section>

                {/* Danger zone */}
                <section className="border border-destructive/40 rounded-md overflow-hidden">
                  <div className="bg-destructive/5 px-5 py-3 border-b border-destructive/40">
                    <h2 className="font-semibold text-destructive">Danger Zone</h2>
                  </div>
                  <div className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Delete account</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Permanently delete your account and all repositories. This cannot be undone.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDelete(true)}
                      className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete account
                    </Button>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete account dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action <strong>cannot be undone</strong>. All your repositories and data will be permanently deleted.
            Type <code className="text-xs bg-muted px-1 py-0.5 rounded">{user.username}</code> to confirm.
          </p>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={user.username}
            className="bg-background border-border font-mono"
          />
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}>
              Cancel
            </Button>
            <Button
              disabled={deleteConfirm !== user.username || deletingAccount}
              onClick={deleteAccount}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deletingAccount ? 'Deleting…' : 'Delete my account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default UserSettingsPage;
