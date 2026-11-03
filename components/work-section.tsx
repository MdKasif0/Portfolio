"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValue
} from "framer-motion";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent
} from "react";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { SectionHeader } from "@/components/section-header";

const work = portfolioContent.work;
type Project = (typeof work.projects)[number];
const allFilter = work.filters[0];

export function ProductMock({ project, mode = "final" }: { project: Project; mode?: "wire" | "final" }) {
  return (
    <div className={`mock-product mock-${project.art}${mode === "wire" ? " is-wireframe" : ""}`} data-layer="card" data-kind={mode === "wire" ? "wire-project-mock" : "project-mock"}>
      <div className="mock-browser" data-layer="line" data-kind="browser-frame">
        <div className="mock-browser-bar">
          <span className="mock-browser-dots" aria-hidden="true">
            <i data-layer="icon" /><i data-layer="icon" /><i data-layer="icon" />
          </span>
          <span className="mock-address" data-layer="text">{project.title.toLowerCase().replaceAll(" ", "")}.app</span>
          <span className="mock-browser-menu" aria-hidden="true">•••</span>
        </div>
        <div className="mock-screen" data-layer="card" data-kind="mock-screen">
          {project.art === "gitroasted" && (
            <div className="gitroasted-view">
              <div className="roast-profile" data-layer="card">
                <span className="roast-avatar" data-layer="icon">G</span>
                <span><b>github.com/you</b><small>PROFILE SCANNED</small></span>
                <i className="roast-spark" data-layer="icon">✳</i>
              </div>
              <div className="roast-bubble" data-layer="text">“Your contribution graph has commitment issues.”</div>
              <div className="heat-meter" data-layer="line"><i /><i /><i /><i /><i /><i /><i /><i /></div>
              <span className="heat-label" data-layer="text">ROAST LEVEL <b>TOASTED</b></span>
            </div>
          )}
          {project.art === "reviewpilot" && (
            <div className="review-view">
              <div className="review-filebar" data-layer="text"><span>src/components/Review.tsx</span><b>+12 −3</b></div>
              <div className="review-code" data-layer="card">
                <span><i>18</i><b> const result = await reviewPullRequest();</b></span>
                <span className="review-added"><i>19</i> if (!result) return null;</span>
                <span><i>20</i><b> return &lt;Review data=&#123;result&#125; /&gt;;</b></span>
                <span><i>21</i><b> &#125;</b></span>
              </div>
              <div className="review-comment" data-layer="text"><b>✳ AI REVIEW</b><span>Consider handling the empty response before rendering.</span></div>
            </div>
          )}
          {project.art === "greenboard" && (
            <div className="greenboard-view">
              <div className="tutor-heading" data-layer="text"><b>Find your next tutor</b><span>View all ↗</span></div>
              <div className="tutor-cards">
                {["A", "M", "R"].map((initial, index) => (
                  <div className={`tutor-card tutor-card-${index + 1}`} data-layer="card" key={initial}>
                    <i data-layer="icon">{initial}</i><span><b>{["Anika", "Maya", "Rohan"][index]}</b><small>{["Mathematics", "Physics", "Chemistry"][index]}</small></span><em>★ 4.9</em>
                  </div>
                ))}
              </div>
              <div className="tutor-schedule" data-layer="line"><b>YOUR WEEK</b><span>MON　TUE　WED　THU　FRI</span><i /></div>
            </div>
          )}
          {project.art === "gravites" && (
            <div className="gravites-view">
              <svg viewBox="0 0 360 170" aria-hidden="true" data-layer="line">
                <path d="M66 82 145 38 223 73 294 34M66 82l69 60 88-69 71 60M145 38l-10 104m88-69 71 60" />
              </svg>
              <span className="network-node node-brand" data-layer="icon">BRAND</span>
              <span className="network-node node-creator node-one" data-layer="icon">@creator_01</span>
              <span className="network-node node-creator node-two" data-layer="icon">@creator_02</span>
              <span className="network-node node-creator node-three" data-layer="icon">@creator_03</span>
              <span className="network-node node-creator node-four" data-layer="icon">@creator_04</span>
              <small data-layer="text">GOOD PEOPLE. BETTER REACH.</small>
            </div>
          )}
          {project.art === "checkers" && (
            <div className="checkers-view">
              <div className="checkers-player" data-layer="text"><i /> GPT-4o <b>VS</b> Claude 3.7 <i /></div>
              <div className="checkers-board" data-layer="card" aria-hidden="true">
                {Array.from({ length: 64 }, (_, square) => {
                  const dark = (Math.floor(square / 8) + square % 8) % 2 === 1;
                  const piece = dark && (square < 16 || square > 47 || square === 34);
                  return <span className={`board-square${dark ? " is-dark" : ""}`} key={square}>{piece && <i className={square < 24 ? "piece-light" : "piece-red"} data-layer="icon" />}</span>;
                })}
              </div>
              <span className="checkers-caption" data-layer="text">INTERNATIONAL CHECKERS · LIVE</span>
            </div>
          )}
          {project.art === "cookie" && (
            <div className="cookie-view">
              <div className="cookie-desktop-icons" data-layer="line"><i /><i /><i /><span>Desktop</span></div>
              <div className="cookie-window" data-layer="card">
                <span className="cookie-ear cookie-ear-left" /><span className="cookie-ear cookie-ear-right" />
                <svg viewBox="0 0 120 90" aria-label="A small cartoon cat companion">
                  <path d="M15 36 10 5l29 18Q59 13 81 23L108 8l-3 37c11 29-8 43-44 42S8 70 15 36Z" />
                  <path className="cookie-face" d="M15 42Q60 30 105 42v25Q60 84 15 67Z" />
                  <ellipse cx="42" cy="52" rx="4" ry="6" /><ellipse cx="77" cy="52" rx="4" ry="6" />
                  <path className="cookie-nose" d="m55 61 5 4 5-4Z" /><path className="cookie-whiskers" d="m26 63-14-4m15 9-14 3m81-8 14-4m-15 9 14 3" />
                </svg>
                <span className="cookie-chat" data-layer="text">A little company?</span>
              </div>
              <span className="cookie-caption" data-layer="text">OFFLINE · RIGHT AT HOME</span>
            </div>
          )}
          {project.art === "shiftkit" && (
            <div className="shiftkit-view">
              <div className="shiftkit-files" data-layer="card"><i /><i /><i /><span>project-files.zip</span></div>
              <div className="shiftkit-menu" data-layer="card">
                {["IMG", "PDF", "ZIP", "MOV", "↗", "＋"].map((item, index) => <span className={`shiftkit-action shiftkit-action-${index + 1}`} data-layer="icon" key={item}>{item}</span>)}
                <b data-layer="icon">⌘</b>
              </div>
              <small data-layer="text">HOLD SHIFT · PICK AN ACTION</small>
            </div>
          )}
        </div>
      </div>
      {mode === "wire" && (
        <div className="mock-ruler-overlay" aria-hidden="true">
          <span className="mock-ruler-top" data-layer="line">0　64　128　192　256</span>
          <span className="mock-ruler-side" data-layer="line">0<br />48<br />96<br />144</span>
          <i className="mock-spacing-mark mock-spacing-top" data-layer="line">24</i>
          <i className="mock-spacing-mark mock-spacing-side" data-layer="line">24</i>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  index,
  imagePath,
  onOpen
}: {
  project: Project;
  index: number;
  imagePath?: string;
  onOpen: (project: Project) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  const moveCard = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    tiltX.set((0.5 - y) * 12);
    tiltY.set((x - 0.5) * 12);
    event.currentTarget.style.setProperty("--glare-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--glare-y", `${y * 100}%`);
    event.currentTarget.style.setProperty("--cursor-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--cursor-y", `${event.clientY - bounds.top}px`);
  };

  return (
    <motion.article
      className="project-card"
      data-cursor-label="VIEW"
      data-layer="card"
      data-kind="project-card"
      data-project-position={index + 1}
      layout
      style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: 12 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      onPointerMove={moveCard}
      onPointerLeave={(event) => {
        tiltX.set(0);
        tiltY.set(0);
        event.currentTarget.style.removeProperty("--glare-x");
        event.currentTarget.style.removeProperty("--glare-y");
      }}
    >
      <button
        className="project-link"
        data-layer="button"
        data-kind="project-open"
        type="button"
        onClick={() => onOpen(project)}
        aria-label={`View case study: ${project.title}`}
      >
        <div className={`project-thumbnail art-${project.art}${imagePath && !imageFailed ? " has-project-image" : ""}`} data-layer="image" data-kind="project-thumbnail">
          <ProductMock project={project} />
          {imagePath && !imageFailed && (
            <Image
              className="project-real-image"
              src={imagePath}
              alt={`${project.title} product screenshot`}
              fill
              sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 30vw"
              onError={() => setImageFailed(true)}
            />
          )}
          {project.tag && <span className="project-tag" data-layer="text" data-kind="project-tag">{project.tag}</span>}
          <span className="project-index" data-layer="text" data-kind="project-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className="project-view-cursor" aria-hidden="true">VIEW <i>↗</i></span>
          <div className="project-stack-chips" aria-hidden="true">
            {project.stack.map((item) => <span data-layer="text" data-kind="project-stack-chip" key={item}>{item}</span>)}
          </div>
        </div>
        <div className="project-card-copy" data-layer="card" data-kind="project-card-copy">
          <div className="project-card-title">
            <div>
              <h3 data-layer="text" data-kind="project-title">{project.title}</h3>
              <p className="project-subtitle" data-layer="text" data-kind="project-description">{project.subtitle}</p>
            </div>
            <span className="project-arrow" data-layer="icon" data-kind="project-arrow" aria-hidden="true">↗</span>
          </div>
          <p className="project-meta" data-layer="text" data-kind="project-meta">
            {[project.categories[0]?.toUpperCase(), project.year].filter(Boolean).join(" / ")}
          </p>
        </div>
      </button>
    </motion.article>
  );
}

function ProjectDrawer({ project, onClose }: { project: Project; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = closeButton.current?.closest<HTMLElement>('[role="dialog"]');
      const focusable = drawer?.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <motion.div
      className="project-drawer-backdrop"
      data-layer="card"
      data-kind="case-study-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.aside
        className="project-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-drawer-title"
        aria-describedby="project-drawer-overview"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="project-drawer-heading">
          <span className="project-drawer-kicker" data-layer="text" data-kind="drawer-kicker">SELECTED WORK / {String(work.projects.indexOf(project) + 1).padStart(2, "0")}</span>
          <button ref={closeButton} className="project-drawer-close" data-magnetic type="button" onClick={onClose} aria-label="Close case study">×</button>
        </div>
        <h2 id="project-drawer-title" data-layer="text" data-kind="drawer-title">{project.title}<span>.</span></h2>
        <p id="project-drawer-overview" className="project-drawer-overview" data-layer="text" data-kind="drawer-overview">{project.overview}</p>
        <div className="project-drawer-gallery" data-layer="image" data-kind="drawer-gallery">
          <div className={`project-thumbnail art-${project.art}`}>
            <ProductMock project={project} />
          </div>
        </div>
        <dl className="project-drawer-details">
          <div><dt>ROLE</dt><dd data-layer="text" data-kind="drawer-role">{project.role}</dd></div>
          <div><dt>STACK / FOCUS</dt><dd className="project-drawer-stack">{project.stack.map((item) => <span data-layer="text" data-kind="drawer-stack" key={item}>{item}</span>)}</dd></div>
          <div><dt>CATEGORY</dt><dd data-layer="text" data-kind="drawer-category">{project.categories.join(" · ") || "Selected work"}</dd></div>
        </dl>
        <div className="project-drawer-links">
          {project.liveHref && <a className="project-drawer-link is-primary" data-cursor-label="OPEN" data-layer="button" data-kind="drawer-live-link" href={project.liveHref} target="_blank" rel="noreferrer">VISIT LIVE PROJECT <span>↗</span></a>}
          {project.githubHref && <a className="project-drawer-link" data-cursor-label="OPEN" data-layer="button" data-kind="drawer-github-link" href={project.githubHref} target="_blank" rel="noreferrer">VIEW ON GITHUB <span>↗</span></a>}
        </div>
      </motion.aside>
    </motion.div>
  );
}

export function WorkSection({ projectImages = {} }: { projectImages?: Record<string, string> }) {
  const { motionEnabled } = useMotionPreference();
  const [activeFilter, setActiveFilter] = useState<string>(allFilter);
  const [search, setSearch] = useState("");
  const [viewAll, setViewAll] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [carouselProgress, setCarouselProgress] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScroll: number; lastX: number; lastTime: number; velocity: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const filterId = (filter: string) => `project-filter-${filter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return work.projects.filter((project) => {
      const matchesFilter = activeFilter === allFilter || project.categories.some((category) => category === activeFilter);
      const matchesSearch = !query || `${project.title} ${project.tag ?? ""} ${project.subtitle ?? ""} ${project.categories.join(" ")} ${project.stack.join(" ")}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  const closeDrawer = useCallback(() => setSelectedProject(null), []);
  const categoryCounts = useMemo(() => Object.fromEntries(
    work.filters.map((filter) => [filter, filter === allFilter ? work.projects.length : work.projects.filter((project) => project.categories.some((category) => category === filter)).length])
  ), []);

  const updateCarouselProgress = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const max = carousel.scrollWidth - carousel.clientWidth;
    setCarouselProgress(max > 0 ? carousel.scrollLeft / max : 0);
  }, []);

  const moveCarousel = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const card = carousel.querySelector<HTMLElement>(".project-card");
    const distance = card ? card.offsetWidth + 24 : carousel.clientWidth * 0.8;
    carousel.scrollBy({ left: direction * distance * 2, behavior: motionEnabled ? "smooth" : "instant" });
  };

  const onCarouselPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      startX: event.clientX,
      startScroll: event.currentTarget.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      moved: false
    };
  };

  const onCarouselPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 5) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.classList.add("is-dragging");
    }
    if (!drag.moved) return;
    const now = performance.now();
    drag.velocity = (event.clientX - drag.lastX) / Math.max(1, now - drag.lastTime);
    drag.lastX = event.clientX;
    drag.lastTime = now;
    event.currentTarget.scrollLeft = drag.startScroll - delta;
    event.preventDefault();
  };

  const onCarouselPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.moved) {
      event.currentTarget.scrollBy({ left: -drag.velocity * 230, behavior: "smooth" });
      event.currentTarget.classList.remove("is-dragging");
      suppressClickRef.current = true;
      window.setTimeout(() => { suppressClickRef.current = false; }, 120);
    }
    dragRef.current = null;
  };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    updateCarouselProgress();
  }, [filteredProjects.length, updateCarouselProgress, viewAll]);

  return (
    <section className="work-section section-shell container-x" id="work" data-scene="work" aria-labelledby="work-heading">
      <SectionHeader
        className="work-heading-row"
        index={work.eyebrowNumber}
        label={work.eyebrowLabel}
        titleLines={[`${work.title}.`]}
        id="work-heading"
        titleClassName="work-heading"
        action={<a className="work-all-link" data-magnetic data-layer="button" href={portfolioContent.work.githubProfile} target="_blank" rel="noreferrer">{work.allWork} <span aria-hidden="true">↗</span></a>}
      />

      <div className="work-toolbar" data-layer="line" data-kind="work-toolbar">
        <div className="work-filters" data-layer="card" data-kind="filter-segment" role="tablist" aria-label="Filter projects by category">
          {work.filters.map((filter) => (
            <button
              className={`work-filter${activeFilter === filter ? " is-active" : ""}`}
              data-magnetic
              data-layer="button"
              data-kind="filter-tab"
              key={filter}
              type="button"
              role="tab"
              id={filterId(filter)}
              aria-controls="project-results"
              aria-selected={activeFilter === filter}
              tabIndex={activeFilter === filter ? 0 : -1}
              onClick={() => { setActiveFilter(filter); setViewAll(false); if (carouselRef.current) carouselRef.current.scrollLeft = 0; }}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
                const currentIndex = tabs.indexOf(event.currentTarget);
                const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                tabs[nextIndex]?.focus();
                tabs[nextIndex]?.click();
              }}
            >
              <span>{filter}</span><small>{categoryCounts[filter]}</small>
              {activeFilter === filter && <motion.i className="work-filter-indicator" layoutId="work-filter-indicator" data-layer="line" data-kind="filter-indicator" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <label className="work-search" data-layer="card" data-kind="work-search">
          <span aria-hidden="true">⌕</span>
          <input
            ref={searchRef}
            type="search"
            data-layer="button"
            data-kind="search-input"
            value={search}
            onChange={(event) => { setSearch(event.currentTarget.value); setViewAll(false); if (carouselRef.current) carouselRef.current.scrollLeft = 0; }}
            placeholder={work.searchPlaceholder}
            aria-label={work.searchPlaceholder}
            aria-keyshortcuts="Control+K Meta+K"
          />
          <kbd aria-hidden="true">⌘K</kbd>
        </label>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {filteredProjects.length === 0 ? (
          <motion.p className="work-empty" key="empty" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {work.noResults}
          </motion.p>
        ) : viewAll ? (
          <motion.div
            className="work-grid work-grid-expanded"
            key="expanded-grid"
            id="project-results"
            role="tabpanel"
            aria-labelledby={filterId(activeFilter)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerMove={(event) => event.stopPropagation()}
          >
            <AnimatePresence initial={false}>
              {filteredProjects.map((project) => (
                <ProjectCard key={project.title} project={project} index={work.projects.indexOf(project)} imagePath={projectImages[project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")]} onOpen={setSelectedProject} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            className="work-carousel"
            key="carousel"
            id="project-results"
            role="tabpanel"
            aria-labelledby={filterId(activeFilter)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="work-grid work-carousel-track"
              data-cursor-label="DRAG"
              ref={carouselRef}
              onScroll={updateCarouselProgress}
              onPointerDown={onCarouselPointerDown}
              onPointerMove={onCarouselPointerMove}
              onPointerUp={onCarouselPointerUp}
              onPointerCancel={onCarouselPointerUp}
              onClickCapture={(event) => {
                if (!suppressClickRef.current) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              tabIndex={0}
              aria-label="Selected projects"
            >
              <AnimatePresence initial={false}>
                {filteredProjects.map((project) => (
                  <ProjectCard key={project.title} project={project} index={work.projects.indexOf(project)} imagePath={projectImages[project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")]} onOpen={setSelectedProject} />
                ))}
              </AnimatePresence>
            </div>
            <div className="work-carousel-footer">
              <button className="work-view-all" data-magnetic data-layer="button" data-kind="view-all" type="button" onClick={() => setViewAll(true)}>
                VIEW ALL <span>({filteredProjects.length})</span><i aria-hidden="true">↗</i>
              </button>
              <div className="work-carousel-progress" data-layer="line" data-kind="carousel-progress" role="progressbar" aria-label="Carousel position" aria-valuenow={Math.round(carouselProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ transform: `scaleX(${carouselProgress})` }} data-layer="line" data-kind="carousel-progress-value" />
              </div>
              <div className="work-carousel-controls">
                <button data-magnetic data-layer="button" data-kind="carousel-prev" type="button" onClick={() => moveCarousel(-1)} aria-label="Scroll to previous projects">←</button>
                <button data-magnetic data-layer="button" data-kind="carousel-next" type="button" onClick={() => moveCarousel(1)} aria-label="Scroll to next projects">→</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProject && <ProjectDrawer project={selectedProject} onClose={closeDrawer} />}
      </AnimatePresence>
    </section>
  );
}
