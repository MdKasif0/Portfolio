"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";

const work = portfolioContent.work;

export function WorkSection() {
  const { motionEnabled } = useMotionPreference();
  const [activeFilter, setActiveFilter] = useState<string>(work.filters[0]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return work.projects.filter((project) => {
      const matchesFilter = activeFilter === work.filters[0] || project.categories.some((category) => category === activeFilter);
      const matchesSearch = !query || `${project.title} ${project.tag} ${project.subtitle} ${project.categories.join(" ")}`.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / work.pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleProjects = filteredProjects.slice(currentPage * work.pageSize, (currentPage + 1) * work.pageSize);

  function changeFilter(filter: string) {
    setActiveFilter(filter);
    setPage(0);
  }

  function changeSearch(value: string) {
    setSearch(value);
    setPage(0);
  }

  return (
    <section className="work-section section-shell" id="work" data-scene="work" aria-labelledby="work-heading">
      <div className="work-heading-row" data-layer="line">
        <div>
          <p className="eyebrow" data-layer="text"><span>{work.eyebrowNumber}</span> / {work.eyebrowLabel}</p>
          <h2 className="display-title work-heading" data-layer="text" id="work-heading">{work.title}<span className="title-period">.</span></h2>
        </div>
        <a className="work-all-link" data-layer="button" href={portfolioContent.work.githubProfile} target="_blank" rel="noreferrer">
          {work.allWork} <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="work-toolbar" data-layer="line">
        <div className="work-filters" data-layer="line" role="tablist" aria-label="Filter projects by category">
          {work.filters.map((filter) => (
            <button
              className={`work-filter${activeFilter === filter ? " is-active" : ""}`}
              data-layer="button"
              key={filter}
              type="button"
              role="tab"
              id={`project-filter-${filter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              aria-controls="project-results"
              aria-selected={activeFilter === filter}
              tabIndex={activeFilter === filter ? 0 : -1}
              onClick={() => changeFilter(filter)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
                const currentIndex = tabs.indexOf(event.currentTarget);
                const nextIndex = event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                tabs[nextIndex]?.focus();
                tabs[nextIndex]?.click();
              }}
            >
              {filter}
            </button>
          ))}
        </div>
        <label className="work-search">
          <span>⌕</span>
          <input
            type="search"
            data-layer="button"
            value={search}
            onChange={(event) => changeSearch(event.currentTarget.value)}
            placeholder={work.searchPlaceholder}
            aria-label={work.searchPlaceholder}
          />
        </label>
      </div>

      <div
        className="work-grid"
        id="project-results"
        role="tabpanel"
        aria-labelledby={`project-filter-${activeFilter.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        aria-live="polite"
      >
        {visibleProjects.map((project, index) => (
            <motion.article
              className="project-card"
              data-layer="card"
              key={project.title}
              layout={motionEnabled}
              initial={motionEnabled ? { opacity: 0, y: 18 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionEnabled ? 0.32 : 0, delay: motionEnabled ? index * 0.045 : 0 }}
            >
              <a
                className="project-link"
                data-layer="button"
                href={project.href === "[PLACEHOLDER]" ? portfolioContent.work.githubProfile : project.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${work.openProject}: ${project.title}${project.href === "[PLACEHOLDER]" ? " — GitHub profile; project URL placeholder" : ""}`}
                title={project.href === "[PLACEHOLDER]" ? "Project URL [PLACEHOLDER] — open GitHub profile" : work.openProject}
              >
                <div className={`project-thumbnail art-${project.art}`} data-layer="image">
                  <div className="thumbnail-window" data-layer="image" aria-hidden="true">
                    <span /><span /><span />
                    <i />
                    <b />
                    <em />
                  </div>
                  <span className="project-tag" data-layer="text">{project.tag}</span>
                  <span className="project-index" data-layer="text">{String(work.projects.indexOf(project) + 1).padStart(2, "0")}</span>
                  <span className="thumbnail-placeholder" data-layer="text">{work.placeholderThumbnail} · [PLACEHOLDER]</span>
                </div>
                <div className="project-card-copy" data-layer="card">
                  <div className="project-card-title">
                    <div>
                      <h3 data-layer="text">{project.title}</h3>
                      <p className="project-subtitle" data-layer="text">{project.subtitle}</p>
                    </div>
                    <span className="project-arrow" data-layer="icon" aria-hidden="true">↗</span>
                  </div>
                  <p className="project-meta" data-layer="text">{project.categories[0].toUpperCase()} / {project.year}</p>
                </div>
              </a>
            </motion.article>
          ))}
      </div>

      {visibleProjects.length === 0 && <p className="work-empty">{work.noResults}</p>}

      <div className="work-pagination" data-layer="line">
        <span className="work-page-count" data-layer="text">{work.viewAll} ({filteredProjects.length})</span>
        <div className="work-page-controls">
          <button data-layer="button" type="button" aria-label="Previous projects" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>←</button>
          <div className="work-page-dots" aria-label={`Page ${currentPage + 1} of ${pageCount}`}>
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                type="button"
                data-layer="button"
                key={index}
                className={index === currentPage ? "is-active" : ""}
                aria-label={`Go to project page ${index + 1}`}
                aria-current={index === currentPage ? "page" : undefined}
                onClick={() => setPage(index)}
              />
            ))}
          </div>
          <button data-layer="button" type="button" aria-label="Next projects" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>→</button>
        </div>
      </div>
    </section>
  );
}
