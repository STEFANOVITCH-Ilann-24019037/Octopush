import React from 'react';
import { Link } from 'react-router-dom';
import { Star, GitFork, BookMarked, Lock } from 'lucide-react';
import { Badge } from './ui/badge';

const RepoCard = ({ repo, compact = false }) => {
  // support both API (snake_case) and mock (camelCase)
  const langColor = repo.language_color || repo.languageColor;
  return (
    <div className="border border-border rounded-md p-4 hover:border-[hsl(var(--brand))]/50 transition-colors bg-background gh-fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {repo.visibility === 'Private' ? (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <BookMarked className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <Link to={`/${repo.owner}/${repo.name}`} className="font-semibold text-[hsl(var(--gh-link))] hover:underline truncate">
            {compact ? repo.name : `${repo.owner}/${repo.name}`}
          </Link>
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground border-border px-1.5 py-0">
            {repo.visibility}
          </Badge>
        </div>
      </div>

      {repo.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
      )}

      {repo.topics && repo.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {repo.topics.slice(0, 4).map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {repo.language && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: langColor }} />
            {repo.language}
          </span>
        )}
        {repo.stars > 0 && (
          <span className="flex items-center gap-1 hover:text-[hsl(var(--gh-link))]">
            <Star className="h-3.5 w-3.5" /> {repo.stars.toLocaleString()}
          </span>
        )}
        {repo.forks > 0 && (
          <span className="flex items-center gap-1 hover:text-[hsl(var(--gh-link))]">
            <GitFork className="h-3.5 w-3.5" /> {repo.forks.toLocaleString()}
          </span>
        )}
        {repo.updated_at && (
          <span>Updated {new Date(repo.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </div>
  );
};

export default RepoCard;
