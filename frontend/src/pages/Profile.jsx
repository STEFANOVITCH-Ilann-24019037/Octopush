import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import RepoCard from '../components/RepoCard';
import { toast } from 'sonner';
import { MapPin, Link as LinkIcon, Building2, Users, BookMarked, Star, GitFork } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Overview', icon: BookMarked },
  { id: 'repositories', label: 'Repositories', icon: BookMarked },
  { id: 'stars', label: 'Stars', icon: Star },
];

const Profile = () => {
  const { username } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState('overview');
  const [filter, setFilter] = useState('');
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([
        api.get(`/users/${username}`),
        api.get(`/users/${username}/repos`),
      ]);
      setProfile(u.data);
      setRepos(r.data);
      setError(null);
    } catch (e) {
      setError(e?.response?.status === 404 ? 'User not found' : 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [username]);

  const isMe = me && profile && me.id === profile.id;

  const toggleFollow = async () => {
    if (!me) { navigate('/login'); return; }
    try {
      if (profile.is_following) {
        await api.delete(`/users/${profile.username}/follow`);
        setProfile({ ...profile, is_following: false, followers: profile.followers - 1 });
      } else {
        await api.post(`/users/${profile.username}/follow`);
        setProfile({ ...profile, is_following: true, followers: profile.followers + 1 });
      }
    } catch { toast.error('Action failed'); }
  };

  if (loading) return <div className="min-h-screen flex flex-col"><Navbar /><div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div></div>;
  if (error || !profile) return <div className="min-h-screen flex flex-col"><Navbar /><div className="flex-1 flex items-center justify-center text-muted-foreground">{error}</div></div>;

  const filtered = repos.filter((r) => r.name.toLowerCase().includes(filter.toLowerCase()));
  const pinned = repos.filter((r) => r.is_pinned).slice(0, 6);
  const reposForList = pinned.length ? pinned : repos.slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 md:grid-cols-[296px_minmax(0,1fr)] gap-6">
        <aside>
          <img src={profile.avatar} alt="" className="w-full max-w-[260px] rounded-full border border-border bg-card" />
          <h1 className="mt-4 text-2xl font-semibold leading-tight">{profile.name}</h1>
          <h2 className="text-xl text-muted-foreground font-light">{profile.username}</h2>
          {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}

          {isMe ? (
            <Button variant="outline" className="mt-4 w-full border-border" onClick={() => navigate('/settings')}>Edit profile</Button>
          ) : (
            <Button onClick={toggleFollow} className={`mt-4 w-full ${profile.is_following ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}>
              {profile.is_following ? 'Unfollow' : 'Follow'}
            </Button>
          )}

          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span><b className="text-foreground">{profile.followers}</b> followers</span>
            ·
            <span><b className="text-foreground">{profile.following}</b> following</span>
          </div>

          <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
            {profile.company && (<div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> {profile.company}</div>)}
            {profile.location && (<div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {profile.location}</div>)}
            {profile.website && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                <a href={profile.website} target="_blank" rel="noreferrer" className="text-[hsl(var(--gh-link))] hover:underline truncate">{profile.website}</a>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0">
          <nav className="border-b border-border flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActive(t.id)}
                className={`px-3 py-2 text-sm flex items-center gap-2 border-b-2 -mb-px ${
                  active === t.id ? 'border-[hsl(var(--brand))] font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                <t.icon className="h-4 w-4" /> {t.label}
                {t.id === 'repositories' && (
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">{repos.length}</span>
                )}
              </button>
            ))}
          </nav>

          {active === 'overview' && (
            <div className="mt-6">
              {reposForList.length > 0 ? (
                <>
                  <h3 className="text-sm font-semibold mb-3">{pinned.length ? 'Pinned' : 'Repositories'}</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {reposForList.map((r) => <RepoCard key={r.id} repo={r} />)}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-md">
                  {isMe ? (
                    <p>You haven&apos;t created any repository yet. <Link to="/new" className="text-[hsl(var(--gh-link))] hover:underline">Create one</Link></p>
                  ) : (
                    <p>This user has no public repositories yet.</p>
                  )}
                </div>
              )}

              <h3 className="text-sm font-semibold mt-8 mb-3">Contribution activity</h3>
              <div className="border border-border rounded-md p-6 bg-card">
                <div className="grid grid-cols-[repeat(52,minmax(0,1fr))] gap-[3px]">
                  {Array.from({ length: 52 * 7 }).map((_, i) => {
                    const v = ((i * 7 + (profile.username.length * 13)) % 5);
                    const bg =
                      v === 0 ? 'bg-muted' :
                      v === 1 ? 'bg-[hsl(var(--brand))]/20' :
                      v === 2 ? 'bg-[hsl(var(--brand))]/40' :
                      v === 3 ? 'bg-[hsl(var(--brand))]/70' :
                      'bg-[hsl(var(--brand))]';
                    return <div key={i} className={`aspect-square rounded-sm ${bg}`} />;
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 text-xs text-muted-foreground">
                  Less
                  <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
                  <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--brand))]/20" />
                  <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--brand))]/40" />
                  <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--brand))]/70" />
                  <span className="h-2.5 w-2.5 rounded-sm bg-[hsl(var(--brand))]" />
                  More
                </div>
              </div>
            </div>
          )}

          {active === 'repositories' && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Input placeholder="Find a repository..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 bg-card border-border max-w-md" />
                {isMe && (
                  <Link to="/new" className="ml-auto">
                    <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <BookMarked className="h-4 w-4 mr-1.5" /> New
                    </Button>
                  </Link>
                )}
              </div>
              <div className="grid gap-3">
                {filtered.map((r) => <RepoCard key={r.id} repo={r} compact />)}
                {filtered.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">No repositories found.</div>
                )}
              </div>
            </div>
          )}

          {active === 'stars' && (
            <div className="mt-10 text-center text-muted-foreground text-sm">No starred repos yet.</div>
          )}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
