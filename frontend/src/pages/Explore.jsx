import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import RepoCard from '../components/RepoCard';
import { Star, Search, Compass, GitFork } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const Explore = () => {
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    api.get('/repos/trending')
      .then((res) => setRepos(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleStar = async (r) => {
    if (!user) { toast.error('Sign in to star'); return; }
    try {
      if (r.is_starred) {
        const { data } = await api.delete(`/repos/${r.owner}/${r.name}/star`);
        setRepos((prev) => prev.map((x) => x.id === r.id ? { ...x, ...data } : x));
      } else {
        const { data } = await api.post(`/repos/${r.owner}/${r.name}/star`);
        setRepos((prev) => prev.map((x) => x.id === r.id ? { ...x, ...data } : x));
      }
    } catch { toast.error('Action failed'); }
  };

  const filtered = repos.filter((t) => `${t.owner}/${t.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-6 py-8">
        <div className="flex items-center gap-3">
          <Compass className="h-7 w-7 text-[hsl(var(--brand))]" />
          <h1 className="text-2xl font-semibold">Explore</h1>
        </div>
        <p className="text-muted-foreground mt-1">Discover repositories from the Octopush community.</p>

        <div className="mt-6 relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories" className="pl-9 bg-card border-border" />
        </div>

        <h2 className="text-lg font-semibold mt-8 mb-3">Trending repositories</h2>
        <div className="border border-border rounded-md bg-background">
          {loading && <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>}
          {!loading && filtered.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No repositories yet.</div>}
          {filtered.map((t) => (
            <div key={t.id} className="p-4 border-b border-border last:border-0 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <Link to={`/${t.owner}/${t.name}`} className="text-[hsl(var(--gh-link))] hover:underline font-semibold">
                  {t.owner}/{t.name}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.language_color }} />
                    {t.language}
                  </span>
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {t.stars}</span>
                  <span className="flex items-center gap-1"><GitFork className="h-3.5 w-3.5" /> {t.forks}</span>
                </div>
              </div>
              <Button onClick={() => toggleStar(t)} variant={t.is_starred ? 'default' : 'outline'} size="sm"
                className={`h-7 text-xs ${t.is_starred ? 'bg-[hsl(var(--brand))]/20 text-[hsl(var(--brand))] border border-[hsl(var(--brand))]/40 hover:bg-[hsl(var(--brand))]/30' : 'border-border'}`}>
                <Star className={`h-3.5 w-3.5 mr-1 ${t.is_starred ? 'fill-[hsl(var(--brand))]' : ''}`} /> {t.is_starred ? 'Starred' : 'Star'}
              </Button>
            </div>
          ))}
        </div>

        {repos.length > 0 && (
          <>
            <h2 className="text-lg font-semibold mt-10 mb-3">Discover more</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {repos.slice(0, 4).map((r) => <RepoCard key={r.id} repo={r} />)}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Explore;
