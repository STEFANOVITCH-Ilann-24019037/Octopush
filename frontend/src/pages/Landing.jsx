import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Code2, GitBranch, GitPullRequest, ShieldCheck,
  Sparkles, Zap, Users, Play, Terminal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import GhLogo from '../components/GhLogo';

const Stat = ({ value, label }) => (
  <div>
    <div className="text-3xl md:text-4xl font-semibold text-foreground">{value}</div>
    <div className="text-sm text-muted-foreground mt-1">{label}</div>
  </div>
);

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-50 dark:opacity-100 pointer-events-none"
          style={{
            background:
              'radial-gradient(60% 50% at 50% 0%, hsl(var(--brand) / 0.25), transparent 70%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-12 text-center">
          <div className="flex justify-center mb-6">
            <GhLogo className="h-20 w-20 tentacle-pulse" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Welcome to Octopush
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight max-w-4xl mx-auto leading-[1.05]">
            Push your code with <span className="text-[hsl(var(--brand))]">eight arms</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Host your projects, collaborate with friends, ship faster.
            Octopush is your friendly home for code.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); navigate('/signup'); }}
            className="mt-8 max-w-md mx-auto flex flex-col sm:flex-row gap-2"
          >
            <Input placeholder="Email address" type="email" className="h-11 bg-card border-border" />
            <Button type="submit" className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground">
              Sign up for free <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </form>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            <Stat value="8" label="Arms" />
            <Stat value="∞" label="Repositories" />
            <Stat value="100%" label="Open Source" />
            <Stat value="0$" label="To start" />
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-20">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-center">
          Everything you need to ship
        </h2>
        <p className="text-center text-muted-foreground mt-3 max-w-2xl mx-auto">
          Built for solo devs, indie hackers, and small teams. No noise, just code.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {[
            { icon: Code2, title: 'Repositories', body: 'Create public or private repos in seconds. README, topics, languages.' },
            { icon: GitBranch, title: 'Branches', body: 'Organize your work the way you want with named branches.' },
            { icon: GitPullRequest, title: 'Pull requests', body: 'Discuss and review changes before merging them.' },
            { icon: ShieldCheck, title: 'Privacy first', body: 'Private repos are truly private. Your code, your rules.' },
            { icon: Zap, title: 'Lightning fast', body: 'A snappy UI that respects your time. Dark mode included.' },
            { icon: Users, title: 'Community', body: 'Follow other devs, star projects, get inspired daily.' },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-lg border border-border bg-card hover:border-[hsl(var(--brand))]/40 transition-colors hover:-translate-y-0.5">
              <f.icon className="h-6 w-6 text-[hsl(var(--brand))]" />
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 mt-24 mb-16">
        <div className="rounded-2xl border border-border bg-card p-10 md:p-16 text-center">
          <Terminal className="h-10 w-10 mx-auto text-[hsl(var(--brand))]" />
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight mt-4">
            Ready to push?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Your first repository is one click away.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button onClick={() => navigate('/signup')} className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              Get started for free
            </Button>
            <Button variant="outline" className="h-11 px-6 border-border" onClick={() => navigate('/explore')}>
              <Play className="h-4 w-4 mr-1.5" /> Explore projects
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
