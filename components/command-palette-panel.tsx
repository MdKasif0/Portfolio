"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAgentBuild } from "@/components/agent-build/BuildProvider";
import { useMotionPreference } from "@/components/motion-shell";
import { caseStudies, caseStudyForProject } from "@/data/case-studies";
import { portfolioContent } from "@/data/content";
import { notes } from "@/data/notes";

type Item = { id: string; group: string; label: string; hint?: string; keywords?: string; run: () => void };

const SECTIONS: { label: string; href: string; keywords?: string }[] = [
  { label: "Work", href: "/#work", keywords: "projects portfolio" },
  { label: "Recognition", href: "/#recognition", keywords: "hackathon award runner-up certificate" },
  { label: "Under the surface", href: "/#architecture", keywords: "architecture machines systems" },
  { label: "How I build", href: "/#about", keywords: "about stack skills process" },
  { label: "Journey", href: "/#journey", keywords: "experience milestones" },
  { label: "Built in the open", href: "/#writing", keywords: "github x twitter posts writing" },
  { label: "What I build", href: "/#services", keywords: "services offers hire" },
  { label: "Contact", href: "/#contact", keywords: "email form talk hire" }
];

export function CommandPalettePanel({ onClose, onPlayReel }: { onClose: () => void; onPlayReel: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { motionEnabled, setMotionEnabled } = useMotionPreference();
  const { replayBuild } = useAgentBuild();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const { contact, hero, services, work } = portfolioContent;

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => { onClose(); router.push(href); };
    const open = (href: string) => () => { onClose(); window.open(href, "_blank", "noreferrer"); };
    const result: Item[] = [
      ...caseStudies.map((study) => ({ id: `study-${study.slug}`, group: "Case studies", label: study.title, hint: study.stack.slice(0, 2).join(", "), keywords: study.deck, run: go(`/work/${study.slug}`) })),
      ...caseStudies.filter((study) => study.demo).map((study) => ({ id: `try-${study.slug}`, group: "Try it live", label: `${study.demo?.label}: ${study.title}`, keywords: "demo play live", run: go(`/work/${study.slug}#try`) })),
      ...notes.map((note) => ({ id: `note-${note.slug}`, group: "Engineering notes", label: note.title, hint: note.project, keywords: note.deck, run: go(`/notes/${note.slug}`) })),
      { id: "notes", group: "Engineering notes", label: "All notes", keywords: "writing blog articles", run: go("/notes") },
      ...work.projects.filter((project) => !caseStudyForProject(project.title)).map((project) => ({ id: `project-${project.cover}`, group: "More projects", label: project.title, hint: "GitHub ↗", keywords: `${project.subtitle} ${project.stack.join(" ")}`, run: open(project.githubHref) })),
      ...SECTIONS.map((section) => ({ id: `section-${section.href}`, group: "Go to", label: section.label, keywords: section.keywords, run: go(section.href) })),
      {
        id: "copy-email", group: "Do", label: "Copy my email", hint: contact.email, keywords: "contact mail",
        run: () => {
          navigator.clipboard?.writeText(contact.email).then(() => setStatus("Email copied")).catch(() => setStatus(contact.email));
          window.setTimeout(onClose, 900);
        }
      },
      {
        id: "cv", group: "Do", label: "Download my CV", hint: "PDF", keywords: "resume",
        run: () => {
          const link = document.createElement("a");
          link.href = hero.cvHref;
          link.download = "Md-Kasif-Uddin-CV.pdf";
          link.click();
          onClose();
        }
      },
      { id: "reel", group: "Do", label: "Play the reel", hint: "4 films", keywords: "video showreel film", run: () => { onClose(); onPlayReel(); } },
      ...(services.bookHref ? [{ id: "book", group: "Do", label: services.bookLabel, hint: "Cal.com ↗", keywords: "call meeting schedule", run: open(services.bookHref) }] : []),
      ...(pathname === "/" ? [{ id: "replay", group: "Do", label: "Replay the build", keywords: "intro film", run: () => { onClose(); replayBuild(); } }] : []),
      { id: "motion", group: "Do", label: motionEnabled ? "Turn motion off" : "Turn motion on", keywords: "animation reduce", run: () => { setMotionEnabled(!motionEnabled); onClose(); } },
      ...contact.socials.map((social) => ({ id: `social-${social.label}`, group: "Do", label: `Open ${social.label}`, hint: `${social.value} ↗`, run: open(social.href) }))
    ];
    return result;
  }, [contact, hero.cvHref, motionEnabled, onClose, onPlayReel, pathname, replayBuild, router, services, setMotionEnabled, work.projects]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items.filter((item) => {
      const text = `${item.label} ${item.group} ${item.hint ?? ""} ${item.keywords ?? ""}`.toLowerCase();
      return words.every((word) => text.includes(word));
    });
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length) setActive((value) => (value + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : Math.max(0, results.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[active]?.run();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      // The results are reached with the arrow keys, so focus stays in the dialog.
      event.preventDefault();
    }
  };

  return (
    <div className="palette" data-lenis-prevent onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="palette-panel" role="dialog" aria-modal="true" aria-label="Search the site">
        <input
          ref={input}
          className="palette-input"
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-autocomplete="list"
          aria-activedescendant={results[active] ? `palette-${results[active].id}` : undefined}
          aria-label="Search projects, notes and actions"
          placeholder="Search projects, notes and actions…"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={onKeyDown}
        />
        <ul className="palette-results" id="palette-results" role="listbox" aria-label="Results" ref={list}>
          {results.length === 0 && <li className="palette-empty" role="presentation">Nothing matches “{query}”.</li>}
          {results.map((item, index) => (
            <li
              className={`palette-item${index === active ? " is-active" : ""}`}
              id={`palette-${item.id}`}
              role="option"
              aria-selected={index === active}
              data-index={index}
              key={item.id}
              onMouseMove={() => setActive(index)}
              onClick={item.run}
            >
              {(index === 0 || results[index - 1].group !== item.group) && <span className="palette-group" aria-hidden="true">{item.group}</span>}
              <span className="palette-row">
                <span className="palette-label">{item.label}</span>
                {item.hint && <span className="palette-hint">{item.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="palette-foot" aria-live="polite">{status || <><span>↑↓ to move</span><span>↵ to open</span><span>esc to close</span></>}</p>
      </div>
    </div>
  );
}
