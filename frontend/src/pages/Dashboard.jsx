import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Star, BookMarked, Plus, TrendingUp, GitFork } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [myRepos, setMyRepos] = useState([]);
  const [trending, setTrending] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get(`/users/${user.username}/repos`),
      api.get('/repos/trending'),
      api.get('/feed'),
    ]).then(([r1, r2, r3]) => {
      setMyRepos(r1.data);
      setTrending(r2.data.filter((t) => t.owner !== user.username).slice(0, 4));
      setFeed(r3.data.slice(0, 6));
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px] gap-6 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6">
        <aside className="space-y-4">
          <div className="border border-border rounded-md bg-card">
            <div className="p-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Top repositories</h2>
              <Link to="/new">
                <Button size="sm" className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-3.5 w-3.5 mr-1" /> New
                </Button>
              </Link>
            </div>
            <div className="border-t border-border">
              {myRepos.length === 0 && !loading && (
                <div className="p-4 text-xs text-muted-foreground">
                  No repositories yet. <Link to="/new" className="text-[hsl(var(--gh-link))] hover:underline">Create one</Link>
                </div>
              )}
              {myRepos.slice(0, 6).map((r) => (
                <Link key={r.id} to={`/${r.owner}/${r.name}`} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-sm">
                  <img src={user?.avatar} alt="" className="h-5 w-5 rounded-full bg-muted" />
                  <span className="text-[hsl(var(--gh-link))] truncate">{r.owner}/{r.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="border border-border rounded-md bg-card">
            <div className="p-3"><h2 className="text-sm font-semibold">Quick links</h2></div>
            <div className="border-t border-border p-3 text-xs text-muted-foreground space-y-2">
              <Link to="/explore" className="block hover:text-[hsl(var(--gh-link))]">→ Explore trending projects</Link>
              <Link to="/new" className="block hover:text-[hsl(var(--gh-link))]">→ Start a new repository</Link>
              <Link to={`/${user?.username}`} className="block hover:text-[hsl(var(--gh-link))]">→ Your profile</Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="border-b border-border pb-2 mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Home</h1>
            <div className="text-xs text-muted-foreground">Latest · For you</div>
          </div>

          {loading && (
            <div className="text-sm text-muted-foreground text-center py-10">Loading…</div>
          )}

          <div className="space-y-3">
            {feed.map((item) => (
              <article key={item.id} className="border border-border rounded-md p-4 bg-background gh-fade-up">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {item.type === 'release' ? <BookMarked className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                  <span><b className="text-foreground">{item.actor}</b> {item.type === 'release' ? 'released' : 'pushed to'}</span>
                </div>
                <Link to={`/${item.target}`} className="mt-2 inline-block font-semibold text-[hsl(var(--gh-link))] hover:underline">
                  {item.target}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">{item.targetDescription}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.languageColor }} />
                    {item.language}
                  </span>
                  <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> {item.stars}</span>
                </div>
              </article>
            ))}
            {!loading && feed.length === 0 && (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-md">
                <p className="text-sm">Your feed is empty.</p>
                <Link to="/explore" className="text-[hsl(var(--gh-link))] hover:underline text-sm">Explore projects to populate it.</Link>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:block space-y-4">
          <div className="border border-border rounded-md bg-card">
            <div className="p-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--brand))]" />
              <h2 className="text-sm font-semibold">Explore repositories</h2>
            </div>
            <div className="border-t border-border">
              {trending.map((t) => (
                <div key={t.id} className="p-3 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <Link to={`/${t.owner}/${t.name}`} className="text-sm font-semibold text-[hsl(var(--gh-link))] hover:underline truncate block">
                      {t.owner}/{t.name}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.language_color }} />
                        {t.language}
                      </span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {t.stars}</span>
                      <span className="flex items-center gap-1"><GitFork className="h-3 w-3" /> {t.forks}</span>
                    </div>
                  </div>
                </div>
              ))}
              {trending.length === 0 && !loading && (
                <div className="p-4 text-xs text-muted-foreground">No trending repos yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
