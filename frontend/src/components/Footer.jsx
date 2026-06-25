import React from 'react';
import { Link } from 'react-router-dom';
import GhLogo from './GhLogo';

const Footer = () => {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <GhLogo className="h-6 w-6" />
          <span><b className="text-foreground">Octopush</b> &copy; {new Date().getFullYear()}</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/" className="hover:text-[hsl(var(--brand))]">Terms</Link>
          <Link to="/" className="hover:text-[hsl(var(--brand))]">Privacy</Link>
          <Link to="/" className="hover:text-[hsl(var(--brand))]">Security</Link>
          <Link to="/" className="hover:text-[hsl(var(--brand))]">Docs</Link>
          <Link to="/" className="hover:text-[hsl(var(--brand))]">Contact</Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
