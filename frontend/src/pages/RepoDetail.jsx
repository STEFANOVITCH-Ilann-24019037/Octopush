import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { MOCK_FILES, MOCK_CODE_SAMPLE, MOCK_COMMITS } from '../mock';
import CodeViewer from '../components/CodeViewer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Star, GitFork, BookMarked, CircleDot, GitPullRequest, GitMerge,
  BarChart3, Settings, FolderOpen, FileText, Code2,
  ChevronDown, Plus, History, GitBranch, Bell, Trash2, CheckCircle2, XCircle
} from 'lucide-react';

const tabsConfig = [
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'issues', label: 'Issues', icon: CircleDot },
  { id: 'pulls', label: 'Pull requests', icon: GitPullRequest },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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
  html = html.split('\n\n').map((p) => /^<(h\d|ul|pre|li)/.test(p.trim()) ? p : `<p>${p.trim()}</p>`).join('\n');
  return html;
};

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

const CodeTab = ({ repo }) => {
  const [currentPath, setCurrentPath] = useState([]);
  const [viewFile, setViewFile] = useState(null);
  const [blobContent, setBlobContent] = useState(null);
  const [files, setFiles] = useState([]);
  const [latestCommit, setLatestCommit] = useState(null);
  const [gitLoading, setGitLoading] = useState(true);
  const [readmeContent, setReadmeContent] = useState(null);
  const [languages, setLanguages] = useState(null);
  const [showClone, setShowClone] = useState(false);
  const [copied, setCopied] = useState(false);
  const cloneUrl = `${BACKEND_URL}/${repo.owner}/${repo.name}.git`;

  useEffect(() => {
    api.get(`/repos/${repo.owner}/${repo.name}/languages`)
      .then(r => setLanguages(r.data))
      .catch(() => setLanguages([{ language: repo.language, color: repo.language_color, percentage: 100 }]));
  }, [repo.owner, repo.name, repo.language, repo.language_color]);

  useEffect(() => {
    setGitLoading(true);
    setBlobContent(null);
    setViewFile(null);
    const pathStr = currentPath.join('/');
    const treeUrl = `/repos/${repo.owner}/${repo.name}/tree${pathStr ? `?path=${encodeURIComponent(pathStr)}` : ''}`;
    const treeReq = api.get(treeUrl);
    const commitsReq = currentPath.length === 0
      ? api.get(`/repos/${repo.owner}/${repo.name}/commits`)
      : Promise.resolve(null);

    Promise.all([treeReq, commitsReq]).then(([t, c]) => {
      const treeData = t.data || [];
      setFiles(treeData);
      if (c && c.data) setLatestCommit(c.data[0] || null);
      const readmeEntry = treeData.find(f => f.name.toLowerCase() === 'readme.md');
      if (readmeEntry) {
        const blobPath = pathStr ? `${pathStr}/README.md` : 'README.md';
        api.get(`/repos/${repo.owner}/${repo.name}/blob/${blobPath}`)
          .then(r => setReadmeContent(r.data.content))
          .catch(() => setReadmeContent(null));
      } else {
        setReadmeContent(null);
      }
    }).catch(() => {
      if (currentPath.length === 0) setFiles(MOCK_FILES);
      else setFiles([]);
      setReadmeContent(null);
    }).finally(() => setGitLoading(false));
  }, [repo.owner, repo.name, currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showClone) return;
    const handler = (e) => { if (!e.target.closest('[data-clone-popover]')) setShowClone(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showClone]);

  const handleFileClick = async (filename) => {
    const pathStr = currentPath.join('/');
    const fullPath = pathStr ? `${pathStr}/${filename}` : filename;
    try {
      const res = await api.get(`/repos/${repo.owner}/${repo.name}/blob/${fullPath}`);
      setBlobContent(res.data.content);
      setViewFile(fullPath);
    } catch {
      setBlobContent(MOCK_CODE_SAMPLE);
      setViewFile(fullPath);
    }
  };

  const handleFolderClick = (folderName) => {
    setCurrentPath(prev => [...prev, folderName]);
  };

  const navigateTo = (index) => {
    setCurrentPath(prev => index < 0 ? [] : prev.slice(0, index + 1));
  };

  const copyCloneUrl = () => {
    navigator.clipboard.writeText(cloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayFiles = files.length > 0 ? files : (gitLoading ? [] : (currentPath.length === 0 ? MOCK_FILES : []));
  const isViewingCode = viewFile && !viewFile.toLowerCase().endsWith('readme.md');
  const isViewingReadme = viewFile && viewFile.toLowerCase().endsWith('readme.md');
  const readmeSource = isViewingReadme ? blobContent : readmeContent;
  const viewerTitle = viewFile ? viewFile.split('/').pop() : 'README.md';

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-8 border-border">
              <GitBranch className="h-4 w-4 mr-1.5" /> {repo.branch}
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
            <span className="text-sm text-muted-foreground">
              <span className="hover:text-[hsl(var(--gh-link))]">1 branch</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Input placeholder="Go to file" className="h-8 bg-card border-border w-44" />
              <Button variant="outline" className="h-8 border-border">
                <Plus className="h-4 w-4 mr-1.5" /> Add file
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <div className="relative" data-clone-popover>
                <Button
                  className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => setShowClone((v) => !v)}
                >
                  <Code2 className="h-4 w-4 mr-1.5" /> Code
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
                {showClone && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-80 rounded-md border border-border bg-card shadow-lg p-4">
                    <p className="text-xs font-semibold mb-2 text-foreground">Clone with HTTPS</p>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={cloneUrl}
                        className="h-8 bg-background border-border text-xs font-mono flex-1 min-w-0"
                        onFocus={(e) => e.target.select()}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 border-border text-xs"
                        onClick={copyCloneUrl}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Push requires your Octopush username and password.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {currentPath.length > 0 && (
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <button onClick={() => navigateTo(-1)} className="text-[hsl(var(--gh-link))] hover:underline font-mono">
                {repo.name}
              </button>
              {currentPath.map((seg, i) => (
                <React.Fragment key={i}>
                  <span className="text-muted-foreground">/</span>
                  {i < currentPath.length - 1 ? (
                    <button onClick={() => navigateTo(i)} className="text-[hsl(var(--gh-link))] hover:underline font-mono">{seg}</button>
                  ) : (
                    <span className="font-mono font-semibold">{seg}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="border border-border rounded-md bg-background overflow-hidden">
            <div className="bg-card px-4 py-2 flex items-center gap-3 text-sm border-b border-border">
              <span className="font-semibold">{repo.owner}</span>
              <span className="text-muted-foreground truncate">
                {latestCommit ? latestCommit.message : (gitLoading ? '…' : 'No commits yet')}
              </span>
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
                {latestCommit && (
                  <code className="px-1.5 py-0.5 rounded bg-muted text-xs">{latestCommit.sha}</code>
                )}
                <span className="hidden md:inline">{latestCommit?.when}</span>
                <Link to={`/${repo.owner}/${repo.name}/commits`} className="flex items-center gap-1 hover:text-[hsl(var(--gh-link))]">
                  <History className="h-3.5 w-3.5" /><span className="hidden md:inline">History</span>
                </Link>
              </span>
            </div>
            {gitLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
            ) : displayFiles.length === 0 && currentPath.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Repository is empty.
                <div className="mt-3 font-mono text-xs bg-muted rounded p-3 text-left max-w-sm mx-auto">
                  git clone {cloneUrl}<br />
                  cd {repo.name}<br />
                  git push origin main
                </div>
              </div>
            ) : (
              <>
                {currentPath.length > 0 && (
                  <div className="flex items-center px-4 py-2 hover:bg-muted/40 border-b border-border text-sm">
                    <FolderOpen className="h-4 w-4 text-[hsl(var(--brand))] mr-2 shrink-0" />
                    <button
                      onClick={() => navigateTo(currentPath.length - 2)}
                      className="hover:text-[hsl(var(--gh-link))] hover:underline font-mono"
                    >
                      ..
                    </button>
                  </div>
                )}
                {displayFiles.map((f) => (
                  <div key={f.name} className="flex items-center px-4 py-2 hover:bg-muted/40 border-b border-border last:border-0 text-sm">
                    {f.type === 'folder' ? (
                      <FolderOpen className="h-4 w-4 text-[hsl(var(--brand))] mr-2 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                    )}
                    <button
                      onClick={() => f.type === 'folder' ? handleFolderClick(f.name) : handleFileClick(f.name)}
                      className="hover:text-[hsl(var(--gh-link))] hover:underline truncate text-left"
                    >
                      {f.name}
                    </button>
                    <span className="ml-auto text-xs text-muted-foreground hidden md:block truncate max-w-xs">{f.lastCommit}</span>
                    <span className="ml-4 text-xs text-muted-foreground hidden md:block">{f.when}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="border border-border rounded-md bg-background overflow-hidden">
            <div className="bg-card px-4 py-2 border-b border-border flex items-center gap-2 text-sm">
              <BookMarked className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{viewerTitle}</span>
              {viewFile && (
                <button
                  onClick={() => { setViewFile(null); setBlobContent(null); }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  ← README
                </button>
              )}
            </div>
            <div className="p-6">
              {isViewingCode ? (
                <CodeViewer code={blobContent || ''} />
              ) : readmeSource ? (
                <div className="markdown" dangerouslySetInnerHTML={{ __html: renderMd(readmeSource) }} />
              ) : gitLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No README found.</div>
              )}
            </div>
          </div>
        </div>

        <aside className="hidden xl:block w-72 shrink-0">
          <h3 className="font-semibold mb-2">About</h3>
          <p className="text-sm text-muted-foreground">{repo.description || 'No description provided.'}</p>
          {repo.topics && repo.topics.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {repo.topics.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--brand))]/10 text-[hsl(var(--brand))]">{t}</span>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Star className="h-4 w-4" /> {repo.stars} stars</div>
            <div className="flex items-center gap-2"><GitFork className="h-4 w-4" /> {repo.forks} forks</div>
          </div>
          <hr className="my-4 border-border" />
          <h3 className="font-semibold mb-2">Languages</h3>
          {languages && languages.length > 0 ? (
            <>
              <div className="flex h-2 rounded overflow-hidden bg-muted">
                {languages.map((l) => (
                  <div key={l.language} className="h-full" style={{ width: `${l.percentage}%`, backgroundColor: l.color }} />
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {languages.map((l) => (
                  <div key={l.language} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="font-medium text-foreground">{l.language}</span>
                    <span>{l.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-2 rounded bg-muted" />
          )}
        </aside>
      </div>
    </div>
  );
};

const IssuesTab = ({ owner, name, isOwner }) => {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/repos/${owner}/${name}/issues`)
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, [owner, name]);

  const createIssue = async () => {
    if (!newTitle.trim()) { toast.error('Title is required'); return; }
    try {
      await api.post(`/repos/${owner}/${name}/issues`, { title: newTitle, body: newBody });
      toast.success('Issue created');
      setNewTitle(''); setNewBody(''); setShowNew(false);
      load();
    } catch { toast.error('Failed'); }
  };

  const toggleState = async (issue) => {
    try {
      await api.patch(`/repos/${owner}/${name}/issues/${issue.number}`, { state: issue.state === 'open' ? 'closed' : 'open' });
      load();
    } catch { toast.error('Failed'); }
  };

  const filtered = items.filter((i) => i.state === tab);
  const openCount = items.filter((i) => i.state === 'open').length;
  const closedCount = items.length - openCount;

  return (
    <div className="mt-4 border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
        <Input placeholder="Filter issues..." className="h-8 bg-background border-border max-w-md" />
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogTrigger asChild>
            <Button className="h-8 ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">New issue</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>New issue</DialogTitle></DialogHeader>
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="bg-background border-border" />
            <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Leave a comment" rows={5} className="bg-background border-border" />
            <DialogFooter>
              <Button variant="outline" className="border-border" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={createIssue}>Submit new issue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-4 px-4 py-2 bg-card border-b border-border text-sm font-medium">
        <button onClick={() => setTab('open')} className={`flex items-center gap-1.5 ${tab === 'open' ? 'text-foreground' : 'text-muted-foreground'}`}>
          <CircleDot className="h-4 w-4" /> {openCount} Open
        </button>
        <button onClick={() => setTab('closed')} className={`flex items-center gap-1.5 ${tab === 'closed' ? 'text-foreground' : 'text-muted-foreground'}`}>
          <CheckCircle2 className="h-4 w-4 text-purple-500" /> {closedCount} Closed
        </button>
      </div>
      {loading && <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">No {tab} issues.</div>
      )}
      <div>
        {filtered.map((it) => (
          <div key={it.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30">
            {it.state === 'open' ?
              <CircleDot className="h-4 w-4 mt-0.5 text-[hsl(var(--gh-success))]" /> :
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-purple-500" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{it.title}</span>
                {it.labels?.map((l) => (
                  <span key={l.name} className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: l.color, color: l.color }}>{l.name}</span>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                #{it.number} {it.when} by <span className="hover:text-[hsl(var(--gh-link))]">{it.author}</span>
              </div>
            </div>
            {isOwner && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleState(it)}>
                {it.state === 'open' ? 'Close' : 'Reopen'}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


const PullsTab = ({ owner, name, isOwner }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('open');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', head: '', base: 'main' });

  const load = () => {
    setLoading(true);
    api.get(`/repos/${owner}/${name}/pulls`)
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(load, [owner, name]);

  const createPR = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.head.trim()) { toast.error('Head branch is required'); return; }
    try {
      await api.post(`/repos/${owner}/${name}/pulls`, form);
      toast.success('Pull request created');
      setForm({ title: '', body: '', head: '', base: 'main' });
      setShowNew(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const filtered = items.filter((p) => p.state === (tab === 'open' ? 'open' : tab === 'merged' ? 'merged' : 'closed'));
  const openCount = items.filter((p) => p.state === 'open').length;
  const closedCount = items.filter((p) => p.state === 'closed').length;
  const mergedCount = items.filter((p) => p.state === 'merged').length;

  const StateIcon = ({ state }) => {
    if (state === 'merged') return <GitMerge className="h-4 w-4 text-purple-400 shrink-0" />;
    if (state === 'closed') return <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
    return <GitPullRequest className="h-4 w-4 text-[hsl(var(--gh-success))] shrink-0" />;
  };

  return (
    <div className="mt-4 border border-border rounded-md overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
        <Input placeholder="Filter pull requests..." className="h-8 bg-background border-border max-w-md" />
        {user && (
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button className="h-8 ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                New pull request
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Open a pull request</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Head branch <span className="text-destructive">*</span></label>
                    <Input
                      value={form.head}
                      onChange={(e) => setForm({ ...form, head: e.target.value })}
                      placeholder="feature/my-feature"
                      className="bg-background border-border font-mono text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Base branch</label>
                    <Input
                      value={form.base}
                      onChange={(e) => setForm({ ...form, base: e.target.value })}
                      placeholder="main"
                      className="bg-background border-border font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title <span className="text-destructive">*</span></label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Add awesome feature"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <Textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Describe your changes…"
                    rows={5}
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-border" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={createPR}>
                  Create pull request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2 bg-card border-b border-border text-sm font-medium">
        {[
          { key: 'open', label: `${openCount} Open`, Icon: GitPullRequest, cls: 'text-[hsl(var(--gh-success))]' },
          { key: 'merged', label: `${mergedCount} Merged`, Icon: GitMerge, cls: 'text-purple-400' },
          { key: 'closed', label: `${closedCount} Closed`, Icon: XCircle, cls: 'text-muted-foreground' },
        ].map(({ key, label, Icon, cls }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 ${tab === key ? 'text-foreground' : 'text-muted-foreground'}`}>
            <Icon className={`h-4 w-4 ${cls}`} /> {label}
          </button>
        ))}
      </div>

      {loading && <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>}
      {!loading && filtered.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No {tab} pull requests.
        </div>
      )}
      <div>
        {filtered.map((pr) => (
          <div
            key={pr.id}
            className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
            onClick={() => navigate(`/${owner}/${name}/pulls/${pr.number}`)}
          >
            <StateIcon state={pr.state} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold hover:text-[hsl(var(--gh-link))]">{pr.title}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                <span>#{pr.number}</span>
                <span>·</span>
                <span>{pr.when}</span>
                <span>by</span>
                <span className="hover:text-[hsl(var(--gh-link))]">{pr.author}</span>
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded ml-1">
                  {pr.head} → {pr.base}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const InsightsTab = ({ repo }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/repos/${repo.owner}/${repo.name}/stats`)
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, [repo.owner, repo.name]);

  // Lazy-load Recharts only when tab is mounted
  const [Charts, setCharts] = useState(null);
  useEffect(() => {
    import('recharts').then((mod) => setCharts(mod));
  }, []);

  const maxCommits = useMemo(
    () => Math.max(1, ...(stats?.activity?.map((w) => w.commits) || [1])),
    [stats]
  );

  if (loading) return <div className="mt-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const s = stats || { activity: [], contributors: [], total_commits: 0, open_issues: 0, open_prs: 0, stars: 0, forks: 0 };

  return (
    <div className="mt-6 space-y-6 max-w-4xl">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Commits', value: s.total_commits },
          { label: 'Stars', value: s.stars },
          { label: 'Forks', value: s.forks },
          { label: 'Open issues', value: s.open_issues },
          { label: 'Open PRs', value: s.open_prs },
          { label: 'Contributors', value: s.contributors.length },
        ].map(({ label, value }) => (
          <div key={label} className="border border-border rounded-md bg-card px-4 py-3 text-center">
            <div className="text-2xl font-bold text-[hsl(var(--brand))]">{value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Commit activity */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-card px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Commit activity — last 26 weeks</h3>
        </div>
        <div className="p-5">
          {Charts && s.activity.length > 0 ? (
            <Charts.ResponsiveContainer width="100%" height={180}>
              <Charts.BarChart data={s.activity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <Charts.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <Charts.XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                />
                <Charts.YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Charts.Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(v) => [v, 'Commits']}
                />
                <Charts.Bar dataKey="commits" fill="hsl(var(--brand))" radius={[3, 3, 0, 0]} maxBarSize={24} />
              </Charts.BarChart>
            </Charts.ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No commit data yet.
            </div>
          )}
        </div>
      </div>

      {/* Commit frequency heatmap (simple grid) */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-card px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Contribution heatmap</h3>
        </div>
        <div className="p-5">
          <div className="flex flex-wrap gap-1">
            {s.activity.map((w, i) => {
              const intensity = w.commits === 0 ? 0 : Math.ceil((w.commits / maxCommits) * 4);
              const bg = [
                'bg-muted',
                'bg-[hsl(var(--brand))]/20',
                'bg-[hsl(var(--brand))]/40',
                'bg-[hsl(var(--brand))]/65',
                'bg-[hsl(var(--brand))]',
              ][intensity];
              return (
                <div
                  key={i}
                  title={`${w.week}: ${w.commits} commit${w.commits !== 1 ? 's' : ''}`}
                  className={`h-5 w-5 rounded-sm ${bg} cursor-default transition-opacity hover:opacity-80`}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            {['bg-muted','bg-[hsl(var(--brand))]/20','bg-[hsl(var(--brand))]/40','bg-[hsl(var(--brand))]/65','bg-[hsl(var(--brand))]'].map((c, i) => (
              <div key={i} className={`h-3.5 w-3.5 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Contributors */}
      <div className="border border-border rounded-md overflow-hidden">
        <div className="bg-card px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Contributors</h3>
        </div>
        {s.contributors.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No contributors yet.</div>
        ) : (
          <div>
            {s.contributors.map((c, i) => {
              const pct = Math.round((c.commits / s.total_commits) * 100);
              return (
                <div key={c.author} className="flex items-center gap-4 px-5 py-3 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: `hsl(${(i * 47 + 210) % 360}, 60%, 50%)` }}
                  >
                    {c.author.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm flex-1">{c.author}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-32 hidden sm:block">
                      <div className="h-1.5 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-[hsl(var(--brand))] rounded" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs w-20 text-right">
                      {c.commits} commit{c.commits !== 1 ? 's' : ''} · {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsTab = ({ repo, onUpdate, onDelete }) => {
  const [name, setName] = useState(repo.name);
  const [description, setDescription] = useState(repo.description || '');
  const [website, setWebsite] = useState(repo.website || '');
  const [visibility, setVisibility] = useState(repo.visibility);
  const [topicsInput, setTopicsInput] = useState((repo.topics || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const topics = topicsInput.split(',').map(t => t.trim()).filter(Boolean);
      const { data } = await api.patch(`/repos/${repo.owner}/${repo.name}`, {
        name: name.trim(),
        description,
        website,
        visibility,
        topics,
      });
      toast.success('Settings saved');
      onUpdate(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/repos/${repo.owner}/${repo.name}`);
      toast.success('Repository deleted');
      onDelete();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="mt-6 max-w-2xl space-y-8">
      {/* General */}
      <section className="border border-border rounded-md overflow-hidden">
        <div className="bg-card px-5 py-3 border-b border-border">
          <h2 className="font-semibold">General</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Repository name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-background border-border"
              placeholder="repo-name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="bg-background border-border"
              placeholder="A short description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              className="bg-background border-border"
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Topics <span className="text-muted-foreground font-normal">(comma-separated)</span></label>
            <Input
              value={topicsInput}
              onChange={e => setTopicsInput(e.target.value)}
              className="bg-background border-border"
              placeholder="react, typescript, ui"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Visibility</label>
            <div className="flex gap-3">
              {['Public', 'Private'].map(v => (
                <label key={v} className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${visibility === v ? 'border-[hsl(var(--brand))] bg-[hsl(var(--brand))]/5' : 'border-border hover:bg-muted/40'}`}>
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                    className="mt-0.5 accent-[hsl(var(--brand))]"
                  />
                  <div>
                    <div className="text-sm font-medium">{v}</div>
                    <div className="text-xs text-muted-foreground">
                      {v === 'Public' ? 'Anyone can see this repository.' : 'Only you can see this repository.'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <Button
              onClick={save}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="border border-destructive/40 rounded-md overflow-hidden">
        <div className="bg-destructive/5 px-5 py-3 border-b border-destructive/40">
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
        </div>
        <div className="divide-y divide-destructive/20">
          <div className="flex items-center justify-between px-5 py-4 gap-4">
            <div>
              <p className="text-sm font-medium">Delete this repository</p>
              <p className="text-xs text-muted-foreground mt-0.5">Once deleted, there is no going back. This will permanently delete the repository and all its contents.</p>
            </div>
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-destructive">Delete repository</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This action <strong>cannot be undone</strong>. Type <code className="text-xs bg-muted px-1 py-0.5 rounded">{repo.owner}/{repo.name}</code> to confirm.
                </p>
                <Input
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder={`${repo.owner}/${repo.name}`}
                  className="bg-background border-border font-mono text-sm"
                />
                <DialogFooter>
                  <Button variant="outline" className="border-border" onClick={() => { setShowDeleteDialog(false); setDeleteConfirm(''); }}>Cancel</Button>
                  <Button
                    disabled={deleteConfirm !== `${repo.owner}/${repo.name}`}
                    onClick={doDelete}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    I understand, delete this repository
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>
    </div>
  );
};

const RepoDetail = () => {
  const { username, repo: repoName, tab = 'code' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/repos/${username}/${repoName}`);
      setRepo(data);
      setError(null);
    } catch (e) {
      setError(e?.response?.status === 404 ? 'Repository not found' : 'Failed to load');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [username, repoName]);

  const isOwner = user && repo && repo.owner === user.username;

  const toggleStar = async () => {
    if (!user) { navigate('/login'); return; }
    setBusy(true);
    try {
      const { data } = repo.is_starred
        ? await api.delete(`/repos/${repo.owner}/${repo.name}/star`)
        : await api.post(`/repos/${repo.owner}/${repo.name}/star`);
      setRepo({ ...repo, ...data });
    } catch { toast.error('Action failed'); }
    finally { setBusy(false); }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete ${repo.owner}/${repo.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/repos/${repo.owner}/${repo.name}`);
      toast.success('Repository deleted');
      navigate(`/${user.username}`);
    } catch { toast.error('Failed'); }
  };

  if (loading) return <div className="min-h-screen flex flex-col"><Navbar /><div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div></div>;
  if (error || !repo) return <div className="min-h-screen flex flex-col"><Navbar /><div className="flex-1 flex items-center justify-center text-muted-foreground">{error}</div></div>;

  const issuesCount = 0; // not fetched at top-level (UI shows numbers inside)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6">
        <div className="flex items-center flex-wrap gap-2">
          <BookMarked className="h-5 w-5 text-muted-foreground" />
          <Link to={`/${repo.owner}`} className="text-xl text-[hsl(var(--gh-link))] hover:underline">{repo.owner}</Link>
          <span className="text-xl text-muted-foreground">/</span>
          <Link to={`/${repo.owner}/${repo.name}`} className="text-xl text-[hsl(var(--gh-link))] font-semibold hover:underline">{repo.name}</Link>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border ml-1">{repo.visibility}</Badge>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 border-border text-xs">
              <Bell className="h-3.5 w-3.5 mr-1" /> Watch <span className="ml-1.5 bg-muted px-1.5 rounded">{repo.watchers}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 border-border text-xs">
              <GitFork className="h-3.5 w-3.5 mr-1" /> Fork <span className="ml-1.5 bg-muted px-1.5 rounded">{repo.forks}</span>
            </Button>
            <Button onClick={toggleStar} disabled={busy} variant="outline" size="sm"
              className={`h-7 text-xs ${repo.is_starred ? 'bg-[hsl(var(--brand))]/15 border-[hsl(var(--brand))]/40 text-[hsl(var(--brand))]' : 'border-border'}`}>
              <Star className={`h-3.5 w-3.5 mr-1 ${repo.is_starred ? 'fill-[hsl(var(--brand))]' : ''}`} />
              {repo.is_starred ? 'Starred' : 'Star'}
              <span className="ml-1.5 bg-muted px-1.5 rounded">{repo.stars}</span>
            </Button>
            {isOwner && (
              <Button variant="outline" size="sm" onClick={onDelete} className="h-7 border-border text-xs text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <nav className="mt-4 border-b border-border flex items-center gap-1 overflow-x-auto">
          {tabsConfig.filter(tc => tc.id !== 'settings' || isOwner).map((tc) => (
            <Link key={tc.id} to={`/${repo.owner}/${repo.name}${tc.id === 'code' ? '' : '/' + tc.id}`}
              className={`px-3 py-2 text-sm flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap ${
                tab === tc.id ? 'border-[hsl(var(--brand))] font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <tc.icon className="h-4 w-4" /> {tc.label}
            </Link>
          ))}
        </nav>

        {tab === 'code' && <CodeTab repo={repo} />}
        {tab === 'issues' && <IssuesTab owner={repo.owner} name={repo.name} isOwner={isOwner} />}
        {tab === 'pulls' && <PullsTab owner={repo.owner} name={repo.name} isOwner={isOwner} />}
        {tab === 'insights' && <InsightsTab repo={repo} />}
        {tab === 'settings' && isOwner && (
          <SettingsTab
            repo={repo}
            onUpdate={(updated) => {
              setRepo(updated);
              navigate(`/${updated.owner}/${updated.name}/settings`, { replace: true });
            }}
            onDelete={() => navigate(`/${user.username}`)}
          />
        )}
        {tab === 'settings' && !isOwner && (
          <div className="mt-10 text-center text-muted-foreground text-sm">Not found.</div>
        )}
        {!['code', 'issues', 'pulls', 'insights', 'settings'].includes(tab) && (
          <div className="mt-10 text-center text-muted-foreground text-sm">This section is empty for now.</div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default RepoDetail;
