import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  BookMarked, GitPullRequest, GitMerge, XCircle,
  GitBranch, ChevronRight, FileText, Plus, Minus,
} from 'lucide-react';

// ─── Markdown renderer ────────────────────────────────────────────────────────
const renderMd = (md) => {
  if (!md) return '';
  let html = md;
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.split('\n\n').map((p) =>
    /^<(h\d|ul|pre|li)/.test(p.trim()) ? p : `<p>${p.trim()}</p>`
  ).join('\n');
  return html;
};

// ─── Diff viewer ──────────────────────────────────────────────────────────────
function DiffViewer({ diff }) {
  if (!diff) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        <GitBranch className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium mb-1">Diff unavailable</p>
        <p className="text-xs">Push the head branch to this repository to see the diff.</p>
        <code className="mt-3 inline-block text-xs bg-muted px-3 py-2 rounded font-mono">
          git push origin HEAD:&lt;head-branch&gt;
        </code>
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div className="font-mono text-xs overflow-x-auto">
      {lines.map((line, i) => {
        let cls = 'px-4 py-0.5 whitespace-pre block';
        let bg = '';
        if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ')) {
          cls += ' text-muted-foreground font-semibold';
          bg = 'bg-muted/40';
        } else if (line.startsWith('@@')) {
          cls += ' text-blue-400';
          bg = 'bg-blue-500/10';
        } else if (line.startsWith('+')) {
          cls += ' text-green-400';
          bg = 'bg-green-500/10';
        } else if (line.startsWith('-')) {
          cls += ' text-red-400';
          bg = 'bg-red-500/10';
        } else {
          cls += ' text-muted-foreground';
        }
        return (
          <span key={i} className={`${cls} ${bg}`}>
            {line || ' '}
          </span>
        );
      })}
    </div>
  );
}

// ─── State badge ──────────────────────────────────────────────────────────────
function StateBadge({ state }) {
  if (state === 'merged') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
        <GitMerge className="h-4 w-4" /> Merged
      </span>
    );
  }
  if (state === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="h-4 w-4" /> Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/15 text-green-400 border border-green-500/30">
      <GitPullRequest className="h-4 w-4" /> Open
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const PRDetailPage = () => {
  const { username, repo: repoName, number } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pr, setPr] = useState(null);
  const [diff, setDiff] = useState(null);
  const [diffFiles, setDiffFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('conversation');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/repos/${username}/${repoName}/pulls/${number}`)
      .then((r) => setPr(r.data))
      .catch(() => setPr(null))
      .finally(() => setLoading(false));
  }, [username, repoName, number]);

  const loadDiff = () => {
    if (diff !== null || diffFiles.length) return;
    api.get(`/repos/${username}/${repoName}/pulls/${number}/diff`)
      .then((r) => { setDiff(r.data.diff); setDiffFiles(r.data.files || []); })
      .catch(() => { setDiff(null); setDiffFiles([]); });
  };

  const handleAction = async (state) => {
    setBusy(true);
    try {
      const { data } = await api.patch(`/repos/${username}/${repoName}/pulls/${number}`, { state });
      setPr(data);
      toast.success(state === 'merged' ? 'Pull request merged' : 'Pull request closed');
    } catch { toast.error('Action failed'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Pull request not found.</div>
      </div>
    );
  }

  const isOwner = user && pr.author === user.username;
  const canAct = user && (isOwner || user.username === username);
  const isOpen = pr.state === 'open';

  const addedFiles = diffFiles.filter((f) => f.status === 'A').length;
  const modifiedFiles = diffFiles.filter((f) => f.status === 'M').length;
  const deletedFiles = diffFiles.filter((f) => f.status === 'D').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap text-muted-foreground">
          <BookMarked className="h-4 w-4" />
          <Link to={`/${username}`} className="text-[hsl(var(--gh-link))] hover:underline">{username}</Link>
          <span>/</span>
          <Link to={`/${username}/${repoName}`} className="text-[hsl(var(--gh-link))] hover:underline font-semibold">{repoName}</Link>
          <span>/</span>
          <Link to={`/${username}/${repoName}/pulls`} className="text-[hsl(var(--gh-link))] hover:underline">Pull requests</Link>
          <span>/</span>
          <span className="text-foreground font-semibold">#{pr.number}</span>
        </div>

        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold leading-tight mb-3">
            {pr.title}
            <span className="ml-2 text-muted-foreground font-normal">#{pr.number}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <StateBadge state={pr.state} />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{pr.author}</span>
              {pr.state === 'merged' ? ' merged' : ' wants to merge'} {pr.when}
            </span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="text-[hsl(var(--brand))]">{pr.head}</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{pr.base}</span>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="border-b border-border flex gap-1 mb-5">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${activeTab === 'conversation' ? 'border-[hsl(var(--brand))] font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Conversation
          </button>
          <button
            onClick={() => { setActiveTab('files'); loadDiff(); }}
            className={`px-4 py-2 text-sm border-b-2 -mb-px flex items-center gap-1.5 ${activeTab === 'files' ? 'border-[hsl(var(--brand))] font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Files changed
            {diffFiles.length > 0 && (
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{diffFiles.length}</span>
            )}
          </button>
        </div>

        {/* Conversation tab */}
        {activeTab === 'conversation' && (
          <div className="space-y-4">
            {/* Body */}
            {pr.body ? (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="bg-card px-4 py-2 border-b border-border text-sm font-medium flex items-center gap-2">
                  <span className="text-[hsl(var(--brand))]">{pr.author}</span>
                  <span className="text-muted-foreground font-normal">— {pr.when}</span>
                </div>
                <div
                  className="markdown p-5 text-sm"
                  dangerouslySetInnerHTML={{ __html: renderMd(pr.body) }}
                />
              </div>
            ) : (
              <div className="border border-border rounded-md p-6 text-center text-sm text-muted-foreground">
                No description provided.
              </div>
            )}

            {/* Merge box */}
            {canAct && isOpen && (
              <div className="border border-border rounded-md p-5">
                <div className="flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center shrink-0">
                    <GitMerge className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-0.5">This branch has no conflicts with the base branch</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Merging can be performed automatically. This will merge <code className="bg-muted px-1 rounded font-mono">{pr.head}</code> into <code className="bg-muted px-1 rounded font-mono">{pr.base}</code>.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        disabled={busy}
                        onClick={() => handleAction('merged')}
                        className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-sm"
                      >
                        <GitMerge className="h-3.5 w-3.5 mr-1.5" /> Merge pull request
                      </Button>
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleAction('closed')}
                        className="h-8 text-sm border-border text-muted-foreground"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pr.state === 'merged' && (
              <div className="border border-purple-500/30 rounded-md p-5 bg-purple-500/5">
                <div className="flex items-center gap-3">
                  <GitMerge className="h-5 w-5 text-purple-400" />
                  <p className="text-sm">
                    <span className="font-medium">{pr.author}</span> merged this pull request {pr.when}
                  </p>
                </div>
              </div>
            )}

            {pr.state === 'closed' && (
              <div className="border border-border rounded-md p-5">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">This pull request is closed.</p>
                  {canAct && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => handleAction('open')}
                      className="ml-auto h-7 text-xs border-border"
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Files changed tab */}
        {activeTab === 'files' && (
          <div className="space-y-3">
            {diffFiles.length > 0 && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground p-3 bg-card border border-border rounded-md">
                <FileText className="h-4 w-4" />
                <span>{diffFiles.length} file{diffFiles.length !== 1 ? 's' : ''} changed</span>
                {addedFiles > 0 && (
                  <span className="flex items-center gap-0.5 text-green-400">
                    <Plus className="h-3.5 w-3.5" />{addedFiles}
                  </span>
                )}
                {modifiedFiles > 0 && <span className="text-yellow-400">{modifiedFiles} modified</span>}
                {deletedFiles > 0 && (
                  <span className="flex items-center gap-0.5 text-red-400">
                    <Minus className="h-3.5 w-3.5" />{deletedFiles}
                  </span>
                )}
              </div>
            )}

            {diffFiles.length > 0 && (
              <div className="border border-border rounded-md overflow-hidden">
                <div className="bg-card border-b border-border px-4 py-2">
                  {diffFiles.map((f) => (
                    <div key={f.path} className="flex items-center gap-2 text-xs py-0.5">
                      <span className={
                        f.status === 'A' ? 'text-green-400' :
                        f.status === 'D' ? 'text-red-400' : 'text-yellow-400'
                      }>
                        {f.status === 'A' ? '+' : f.status === 'D' ? '-' : 'M'}
                      </span>
                      <span className="font-mono text-muted-foreground">{f.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border border-border rounded-md overflow-hidden">
              <DiffViewer diff={diff} />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PRDetailPage;
