import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Bell, Plus, GitPullRequest, CircleDot, BookMarked,
  Sun, Moon, Menu, LogOut, User as UserIcon, Settings
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel
} from './ui/dropdown-menu';
import GhLogo from './GhLogo';

const Navbar = () => {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-[hsl(var(--gh-header-bg))]/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <GhLogo className="h-8 w-8" />
          <span className="font-bold text-lg tracking-tight hidden sm:inline">Octopush</span>
        </Link>

        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Octopush"
              className="pl-9 h-8 bg-card border-border text-sm"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
              /
            </kbd>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-4 text-sm font-medium">
          <Link to="/explore" className="hover:text-[hsl(var(--brand))] text-foreground/90 transition-colors">Pull requests</Link>
          <Link to="/explore" className="hover:text-[hsl(var(--brand))] text-foreground/90 transition-colors">Issues</Link>
          <Link to="/explore" className="hover:text-[hsl(var(--brand))] text-foreground/90 transition-colors">Explore</Link>
        </nav>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-8 w-8">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/new')}>
                    <BookMarked className="h-4 w-4 mr-2" /> New repository
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/explore')}>
                    <CircleDot className="h-4 w-4 mr-2" /> Explore repos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bell className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 rounded-full overflow-hidden ring-offset-2 hover:ring-2 ring-[hsl(var(--brand))]">
                    <img src={user.avatar} alt={user.username} className="h-7 w-7 rounded-full bg-muted" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-xs text-muted-foreground">Signed in as</div>
                    <div className="font-semibold">{user.username}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(`/${user.username}`)}>
                    <UserIcon className="h-4 w-4 mr-2" /> Your profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/${user.username}`)}>
                    <BookMarked className="h-4 w-4 mr-2" /> Your repositories
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { logout(); navigate('/'); }}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" className="h-8 text-sm" onClick={() => navigate('/login')}>Sign in</Button>
              <Button className="h-8 text-sm bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate('/signup')}>Sign up</Button>
            </>
          )}

          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
