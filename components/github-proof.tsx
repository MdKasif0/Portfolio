"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import snapshot from "@/data/github.json";
import { portfolioContent } from "@/data/content";

const copy = portfolioContent.writing;
const CACHE_KEY = "kasif-github-live";
const CACHE_MINUTES = 30;
const CELL = 11;
const STEP = 14;
const TOP = 16;
// The colours live in CSS (.gh-graph), so the light theme can set its own.
const LEVEL_COLORS = [0, 1, 2, 3, 4].map((level) => `var(--gh-level-${level})`);
// Written out, because browsers disagree on short month names ("Sep", "Sept") and the page is built on a server.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatDate = (date: Date) => `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

const dayAt = (index: number) => new Date(Date.parse(`${snapshot.start}T00:00:00Z`) + index * 86_400_000);

function ago(iso: string) {
  const minutes = (Date.now() - Date.parse(iso)) / 60_000;
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (minutes < 60) return format.format(-Math.max(1, Math.round(minutes)), "minute");
  if (minutes < 1440) return format.format(-Math.round(minutes / 60), "hour");
  return format.format(-Math.round(minutes / 1440), "day");
}

type Live = { stars: number; repos: number; repo: string; at: string };

/** The graph is the snapshot from the last deploy, because GitHub doesn't offer it to browsers. Stars, repos and the last push are fetched live, and the snapshot stays if that fails. */
export function GithubProof() {
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [lastPush, setLastPush] = useState(snapshot.lastPush ? formatDate(new Date(snapshot.lastPush.at)) : "");
  const [hover, setHover] = useState<string | null>(null);

  const { paths, months, weeks } = useMemo(() => {
    const byLevel = ["", "", "", "", ""];
    const firstDay = dayAt(0).getUTCDay();
    const labels: { x: number; label: string }[] = [];
    let lastMonth = -1;
    for (let index = 0; index < snapshot.levels.length; index++) {
      const slot = index + firstDay;
      const week = Math.floor(slot / 7);
      const x = week * STEP;
      const y = TOP + (slot % 7) * STEP;
      byLevel[Number(snapshot.levels[index])] += `M${x} ${y}h${CELL}v${CELL}h-${CELL}z`;
      const date = dayAt(index);
      if (date.getUTCDate() <= 7 && date.getUTCMonth() !== lastMonth && slot % 7 === 0) {
        lastMonth = date.getUTCMonth();
        labels.push({ x, label: MONTHS[date.getUTCMonth()] });
      }
    }
    return { paths: byLevel, months: labels, weeks: Math.ceil((snapshot.levels.length + firstDay) / 7) };
  }, []);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const read = async () => {
      try {
        const cached = window.sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { savedAt, value } = JSON.parse(cached) as { savedAt: number; value: Live };
          if (Date.now() - savedAt < CACHE_MINUTES * 60_000) return value;
        }
      } catch { /* Storage can be blocked. */ }
      const response = await fetch(`https://api.github.com/users/${snapshot.user}/repos?per_page=100&sort=pushed`, { headers: { Accept: "application/vnd.github+json" } });
      if (!response.ok) return null;
      const repos = (await response.json()) as { fork: boolean; stargazers_count: number; name: string; pushed_at: string }[];
      const own = repos.filter((repo) => !repo.fork);
      if (!own.length) return null;
      const value: Live = { stars: own.reduce((sum, repo) => sum + repo.stargazers_count, 0), repos: own.length, repo: own[0].name, at: own[0].pushed_at };
      try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), value })); } catch { /* Fine without the cache. */ }
      return value;
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      read().then((value) => { if (value) setLive(value); }).catch(() => undefined);
    }, { rootMargin: "400px 0px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (live) setLastPush(ago(live.at));
    else if (snapshot.lastPush) setLastPush(ago(snapshot.lastPush.at));
  }, [live]);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const scale = (weeks * STEP) / box.width;
    const week = Math.floor(((event.clientX - box.left) * scale) / STEP);
    const row = Math.floor(((event.clientY - box.top) * scale - TOP) / STEP);
    const index = week * 7 + row - dayAt(0).getUTCDay();
    if (row < 0 || row > 6 || index < 0 || index >= snapshot.counts.length) { setHover(null); return; }
    const count = snapshot.counts[index];
    setHover(`${count === 0 ? "No" : count} contribution${count === 1 ? "" : "s"} on ${formatDate(dayAt(index))}`);
  };

  return (
    <div className="ed-open-block" ref={root}>
      <div className="ed-open-head">
        <h3 className="ed-label" data-layer="text">{copy.githubLabel}</h3>
        <a href={`https://github.com/${snapshot.user}`} target="_blank" rel="noreferrer" data-layer="text" data-kind="github-link">{copy.githubCta} <i aria-hidden="true">↗</i></a>
      </div>
      <div className="gh-graph-wrap">
      <svg
        className="gh-graph"
        viewBox={`0 0 ${weeks * STEP - (STEP - CELL)} ${TOP + 7 * STEP - (STEP - CELL)}`}
        role="img"
        aria-label={`GitHub activity for the last year: ${snapshot.contributions.toLocaleString("en-US")} contributions.`}
        data-layer="image"
        data-kind="github-graph"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
      >
        {months.map((month) => <text key={`${month.label}-${month.x}`} x={month.x} y={9}>{month.label}</text>)}
        {paths.map((d, level) => d && <path key={level} d={d} fill={LEVEL_COLORS[level]} />)}
      </svg>
      </div>
      <p className="gh-readout ed-label">
        <span>{hover ?? "Hover over a day"}</span>
        <span className={`gh-live${live ? " is-live" : ""}`}>{live && <i aria-hidden="true" />}{live ? "Stars and last push are live. Graph as of" : "As of"} {formatDate(new Date(`${snapshot.asOf}T00:00:00Z`))}</span>
      </p>
      <dl className="ed-numbers gh-stats">
        <div data-layer="line" data-kind="github-stat"><dt data-layer="text">Contributions in the last year</dt><dd data-layer="text">{snapshot.contributions.toLocaleString("en-US")}</dd></div>
        <div data-layer="line" data-kind="github-stat"><dt data-layer="text">Public repositories, forks excluded</dt><dd data-layer="text">{live?.repos ?? snapshot.repos}</dd></div>
        <div data-layer="line" data-kind="github-stat"><dt data-layer="text">Stars earned</dt><dd data-layer="text">{live?.stars ?? snapshot.stars}</dd></div>
        <div data-layer="line" data-kind="github-last-push"><dt data-layer="text">Last push{(live?.repo ?? snapshot.lastPush?.repo) ? `, ${live?.repo ?? snapshot.lastPush?.repo}` : ""}</dt><dd className="gh-last" data-layer="text">{lastPush}</dd></div>
      </dl>
    </div>
  );
}
