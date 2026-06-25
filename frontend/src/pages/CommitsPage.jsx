import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../lib/api';
import { BookMarked, GitCommitHorizontal, Copy, Check } from 'lucide-react';

// ─── Graph constants ─────────────────────────────────────────────────────────
const LANE_W = 20;
const ROW_H = 52;
const DOT_R = 4.5;
const GRAPH_COLORS = [
  '#3b82f6', '#f97316', '#22c55e', '#a855f7',
  '#ef4444', '#06b6d4', '#eab308', '#ec4899',
  '#f43f5e', '#10b981', '#8b5cf6', '#fb923c',
];

// ─── Graph algorithm ─────────────────────────────────────────────────────────
function buildGraph(commits) {
  let lanes = []; // lanes[i] = {sha, color} | null
  let colorIdx = 0;

  return commits.map((commit) => {
    const parents = commit.parents || [];

    // Find which lane this commit belongs to
    let myLane = lanes.findIndex((l) => l && l.sha === commit.fullSha);
    if (myLane === -1) {
      myLane = lanes.findIndex((l) => !l);
      if (myLane === -1) myLane = lanes.length;
      const color = GRAPH_COLORS[colorIdx++ % GRAPH_COLORS.length];
      if (myLane >= lanes.length) lanes.push({ sha: commit.fullSha, color });
      else lanes[myLane] = { sha: commit.fullSha, color };
    }

    const myColor = lanes[myLane].color;
    const lanesBefore = lanes.map((l) => (l ? { ...l } : null));
    const extras = []; // extra SVG lines (merges / new branches)
    const newLanes = lanes.map((l) => (l ? { ...l } : null));

    if (parents.length === 0) {
      newLanes[myLane] = null;
    } else {
      const firstParent = parents[0];
      const existingSlot = newLanes.findIndex(
        (l, idx) => idx !== myLane && l && l.sha === firstParent
      );
      if (existingSlot !== -1) {
        extras.push({ fromLane: myLane, toLane: existingSlot, color: myColor });
        newLanes[myLane] = null;
      } else {
        newLanes[myLane] = { sha: firstParent, color: myColor };
      }

      if (parents.length >= 2) {
        const secondParent = parents[1];
        const existing2 = newLanes.findIndex(
          (l, idx) => idx !== myLane && l && l.sha === secondParent
        );
        if (existing2 !== -1) {
          extras.push({ fromLane: myLane, toLane: existing2, color: newLanes[existing2]?.color || myColor });
        } else {
          const newColor = GRAPH_COLORS[colorIdx++ % GRAPH_COLORS.length];
          let slot = newLanes.findIndex((l, idx) => idx !== myLane && !l);
          if (slot === -1) slot = newLanes.length;
          if (slot >= newLanes.length) newLanes.push({ sha: secondParent, color: newColor });
          else newLanes[slot] = { sha: secondParent, color: newColor };
          extras.push({ fromLane: myLane, toLane: slot, color: newColor });
        }
      }
    }

    while (newLanes.length > 0 && !newLanes[newLanes.length - 1]) newLanes.pop();
    lanes = newLanes;

    return {
      ...commit,
      lane: myLane,
      color: myColor,
      lanesBefore,
      lanesAfter: newLanes.map((l) => (l ? { ...l } : null)),
      extras,
    };
  });
}

// ─── SVG graph renderer ───────────────────────────────────────────────────────
function GraphSVG({ graphData }) {
  if (!graphData.length) return null;

  const maxLanes = graphData.reduce(
    (m, c) => Math.max(m, c.lane + 1, c.lanesBefore.length, c.lanesAfter.length),
    1
  );
  const W = maxLanes * LANE_W + LANE_W / 2;
  const H = graphData.length * ROW_H;

  return (
    <svg width={W} height={H} className="block" style={{ minWidth: W }}>
      {graphData.map((c, i) => {
        const cy = i * ROW_H + ROW_H / 2;
        const dotX = c.lane * LANE_W + LANE_W / 2;
        const elems = [];

        // Collect all lane indices active in this row
        const laneIdxs = new Set([
          ...c.lanesBefore.map((_, idx) => idx).filter((idx) => c.lanesBefore[idx]),
          ...c.lanesAfter.map((_, idx) => idx).filter((idx) => c.lanesAfter[idx]),
        ]);

        laneIdxs.forEach((lIdx) => {
          const lx = lIdx * LANE_W + LANE_W / 2;
          const above = c.lanesBefore[lIdx];
          const below = c.lanesAfter[lIdx];

          if (lIdx === c.lane) {
            // This commit's own lane
            if (above) {
              elems.push(
                <line key={`top-${lIdx}`} x1={lx} y1={cy - ROW_H / 2} x2={lx} y2={cy}
                  stroke={above.color} strokeWidth={2.5} strokeLinecap="round" />
              );
            }
            if (below) {
              elems.push(
                <line key={`bot-${lIdx}`} x1={lx} y1={cy} x2={lx} y2={cy + ROW_H / 2}
                  stroke={below.color} strokeWidth={2.5} strokeLinecap="round" />
              );
            }
          } else {
            // Lane passing through (not this commit)
            const color = above?.color || below?.color;
            if (!color) return;
            const fromY = above ? cy - ROW_H / 2 : cy;
            const toY = below ? cy + ROW_H / 2 : cy;
            elems.push(
              <line key={`thru-${lIdx}`} x1={lx} y1={fromY} x2={lx} y2={toY}
                stroke={color} strokeWidth={2.5} strokeLinecap="round" />
            );
          }
        });

        // Extra lines for merges / new branches (bezier curves)
        c.extras.forEach((ex, j) => {
          const fx = ex.fromLane * LANE_W + LANE_W / 2;
          const tx = ex.toLane * LANE_W + LANE_W / 2;
          const d = `M ${fx} ${cy} C ${fx} ${cy + ROW_H / 2}, ${tx} ${cy}, ${tx} ${cy + ROW_H / 2}`;
          elems.push(
            <path key={`ex-${j}`} d={d} fill="none" stroke={ex.color}
              strokeWidth={2} strokeLinecap="round" />
          );
        });

        // Commit dot (drawn last so it's on top)
        elems.push(
          <circle key="ring" cx={dotX} cy={cy} r={DOT_R + 2}
            fill="hsl(var(--background))" />,
          <circle key="dot" cx={dotX} cy={cy} r={DOT_R}
            fill={c.color} />
        );

        return <g key={c.sha}>{elems}</g>;
      })}
    </svg>
  );
}

// ─── Commit row ───────────────────────────────────────────────────────────────
function CommitRow({ c, username, repoName }) {
  const [copied, setCopied] = useState(false);

  const copy = (e) => {
    e.preventDefault();
    navigator.clipboard.writeText(c.fullSha);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const initials = (c.author || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="flex items-center gap-3 px-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
      style={{ height: ROW_H }}
    >
      {/* Author avatar */}
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-white"
        style={{ background: c.color }}
      >
        {initials}
      </div>

      {/* Message + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate max-w-lg">{c.message}</span>
          {c.refs && c.refs.map((ref) => (
            <span
              key={ref}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-[hsl(var(--brand))]/40 text-[hsl(var(--brand))] bg-[hsl(var(--brand))]/10 font-mono shrink-0"
            >
              {ref}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
          <GitCommitHorizontal className="h-3 w-3" />
          <span className="font-medium text-foreground/70">{c.author}</span>
          <span>committed</span>
          <span>{c.when}</span>
        </div>
      </div>

      {/* SHA + copy */}
      <div className="flex items-center gap-1.5 shrink-0">
        <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded select-all">
          {c.sha}
        </code>
        <button
          onClick={copy}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Copy full SHA"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const CommitsPage = () => {
  const { username, repo: repoName } = useParams();
  const [repo, setRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/repos/${username}/${repoName}`),
      api.get(`/repos/${username}/${repoName}/commits?limit=200`),
    ])
      .then(([r, c]) => {
        setRepo(r.data);
        setCommits(c.data || []);
      })
      .finally(() => setLoading(false));
  }, [username, repoName]);

  const graphData = useMemo(() => buildGraph(commits), [commits]);

  const maxLanes = useMemo(
    () =>
      graphData.reduce(
        (m, c) => Math.max(m, c.lane + 1, c.lanesBefore.length, c.lanesAfter.length),
        1
      ),
    [graphData]
  );
  const graphW = maxLanes * LANE_W + LANE_W / 2 + 8;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-5 flex-wrap">
          <BookMarked className="h-4 w-4 text-muted-foreground" />
          <Link to={`/${username}`} className="text-[hsl(var(--gh-link))] hover:underline">
            {username}
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link to={`/${username}/${repoName}`} className="text-[hsl(var(--gh-link))] hover:underline font-semibold">
            {repoName}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold">Commits</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {commits.length} commit{commits.length !== 1 ? 's' : ''}
          </span>
        </div>

        {commits.length === 0 ? (
          <div className="border border-border rounded-md p-12 text-center text-sm text-muted-foreground">
            No commits yet.
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="flex">
              {/* Graph column */}
              <div
                className="shrink-0 bg-background border-r border-border overflow-hidden"
                style={{ width: graphW }}
              >
                <GraphSVG graphData={graphData} />
              </div>

              {/* Commit rows */}
              <div className="flex-1 min-w-0 overflow-hidden">
                {graphData.map((c) => (
                  <CommitRow
                    key={c.sha}
                    c={c}
                    username={username}
                    repoName={repoName}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CommitsPage;
