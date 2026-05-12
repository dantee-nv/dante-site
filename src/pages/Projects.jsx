import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";

import { projectCardList, projects } from "../data/projects";
import usePageTitle from "../hooks/usePageTitle";
import { buildProjectSearchIndex, searchProjects } from "../utils/projectSearch";

const projectSearchIndex = buildProjectSearchIndex(projects);

const quickSearches = [
  {
    label: "RAG",
    query: "rag langchain faiss approved",
    excludeSlugs: ["cabbie-ios"],
  },
  {
    label: "AWS",
    query: "aws lambda api gateway dynamodb bedrock ses",
    excludeSlugs: ["cabbie-ios"],
  },
  {
    label: "Healthcare",
    query: "clinical biomedical medical",
    excludeSlugs: ["cabbie-ios"],
  },
  {
    label: "AI",
    query: "llm openai embeddings model",
  },
  {
    label: "Full Stack",
    query: "react api lambda frontend backend",
  },
  {
    label: "Frontend",
    query: "react ux browser frontend",
  },
  {
    label: "Backend",
    query: "python lambda api gateway dynamodb",
  },
  {
    label: "Evals + Guardrails",
    query: "guardrails grounded approved answers",
  },
  {
    label: "Automation",
    query: "n8n email automation",
    excludeSlugs: ["clinical-ner-finetune", "rag-hr-chatbot"],
  },
  {
    label: "Semantic Search",
    query: "titan reranking scholar",
  },
  {
    label: "Data Pipelines",
    query: "scraping data pipeline playwright",
  },
];

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

const grid = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.46 },
  },
};

const tile = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export default function Projects() {
  usePageTitle("Projects");
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [highlightedProjectSlugList, setHighlightedProjectSlugList] = useState([]);
  const [isDraggingShortcuts, setIsDraggingShortcuts] = useState(false);
  const [selectedQuickSearchLabel, setSelectedQuickSearchLabel] = useState("");
  const shortcutDragState = useRef({
    isDragging: false,
    pointerId: null,
    scrollLeft: 0,
    startX: 0,
  });
  const suppressShortcutClick = useRef(false);
  const sortedProjects = projectCardList;
  const highlightedProjectSlugs = new Set(highlightedProjectSlugList);

  function handleSearchChange(event) {
    const nextQuery = event.target.value;
    setDraftSearchQuery(nextQuery);
    setSelectedQuickSearchLabel("");

    if (!nextQuery.trim()) {
      setHighlightedProjectSlugList([]);
    }
  }

  function runSubmittedSearch(query) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setHighlightedProjectSlugList([]);
      return;
    }

    setHighlightedProjectSlugList(searchProjects(trimmedQuery, projectSearchIndex));
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setSelectedQuickSearchLabel("");
    runSubmittedSearch(draftSearchQuery);
  }

  function handleQuickSearch(quickSearch) {
    if (suppressShortcutClick.current) {
      suppressShortcutClick.current = false;
      return;
    }

    if (selectedQuickSearchLabel === quickSearch.label) {
      setSelectedQuickSearchLabel("");
      setDraftSearchQuery("");
      setHighlightedProjectSlugList([]);
      return;
    }

    setSelectedQuickSearchLabel(quickSearch.label);
    setDraftSearchQuery("");
    const excludedSlugs = new Set(quickSearch.excludeSlugs || []);
    setHighlightedProjectSlugList(
      searchProjects(quickSearch.query, projectSearchIndex).filter((slug) => !excludedSlugs.has(slug))
    );
  }

  function handleShortcutPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    shortcutDragState.current = {
      isDragging: false,
      pointerId: event.pointerId,
      scrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
  }

  function handleShortcutPointerMove(event) {
    const dragState = shortcutDragState.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextDistance = event.clientX - dragState.startX;

    if (Math.abs(nextDistance) > 4) {
      dragState.isDragging = true;
      suppressShortcutClick.current = true;
      setIsDraggingShortcuts(true);

      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (!dragState.isDragging) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollLeft = dragState.scrollLeft - nextDistance;
  }

  function handleShortcutPointerEnd(event) {
    if (shortcutDragState.current.pointerId !== event.pointerId) {
      return;
    }

    shortcutDragState.current.pointerId = null;
    shortcutDragState.current.isDragging = false;
    setIsDraggingShortcuts(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    runSubmittedSearch(draftSearchQuery);
  }

  function formatStatus(status) {
    if (!status) {
      return "";
    }

    return status
      .split("-")
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  }

  return (
    <Motion.section
      className="page"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="projects-header">
        <div className="projects-header-copy">
          <Motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
          >
            Projects
          </Motion.h2>
          <Motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Explore shipped work, in-progress builds and{" "}
            <span className="projects-copy-break">upcoming experiments.</span>
          </Motion.p>
        </div>

        <Motion.form
          className="projects-search"
          role="search"
          onSubmit={handleSearchSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.45 }}
        >
          <div className="projects-search-main">
            <label className="sr-only" htmlFor="projects-search-input">
              Search projects
            </label>
            <div className="projects-search-control">
              <input
                id="projects-search-input"
                className="projects-search-input"
                type="search"
                value={draftSearchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search projects by skill, stack, or outcome"
                autoComplete="off"
              />
              <button className="projects-search-submit" type="submit">
                Search
              </button>
            </div>
            <div className="projects-search-info-wrap">
              <button
                className="projects-search-info"
                type="button"
                aria-label="About project search"
                aria-describedby="projects-search-tooltip"
              >
                i
              </button>
              <span
                className="projects-search-tooltip"
                id="projects-search-tooltip"
                role="tooltip"
              >
                Local search highlights matching project cards from the full project
                context. No generated answers, snippets, API calls, or RAG. For this use
                case, simpler retrieval is the right tool.
              </span>
            </div>
          </div>
          <div
            className={`projects-search-shortcuts${isDraggingShortcuts ? " dragging" : ""}`}
            aria-label="Suggested project searches"
            onPointerCancel={handleShortcutPointerEnd}
            onPointerDown={handleShortcutPointerDown}
            onPointerMove={handleShortcutPointerMove}
            onPointerUp={handleShortcutPointerEnd}
          >
            {quickSearches.map((quickSearch) => (
              <button
                className={`projects-search-chip${
                  selectedQuickSearchLabel === quickSearch.label ? " active" : ""
                }`}
                key={quickSearch.label}
                type="button"
                aria-pressed={selectedQuickSearchLabel === quickSearch.label}
                onClick={() => handleQuickSearch(quickSearch)}
              >
                {quickSearch.label}
              </button>
            ))}
          </div>
        </Motion.form>
      </div>

      <Motion.div className="grid" variants={grid} initial="initial" animate="animate">
        {sortedProjects.map((project) => {
          const skills = project.atGlance?.skills || [];
          const isSearchMatch = highlightedProjectSlugs.has(project.slug);

          return (
            <Motion.div
              key={project.slug}
              className="tile-frame"
              variants={tile}
              transition={{ duration: 0.35 }}
            >
              <Link
                className={`tile tile-link${isSearchMatch ? " search-match" : ""}`}
                to={`/${project.slug}`}
              >
                <div className="tile-top">
                  <h3 className="tile-title">{project.title}</h3>
                  <span className={`project-status ${project.status}`}>
                    {formatStatus(project.status)}
                  </span>
                </div>

                <p className="tile-summary">{project.summary}</p>

                {skills.length > 0 ? (
                  <ul
                    className="project-skill-list project-skill-list-outline"
                    aria-label={`${project.title} skills`}
                  >
                    {skills.map((skill, index) => (
                      <li
                        className="project-skill-chip project-skill-chip-outline"
                        key={`${project.slug}-skill-${skill.label}-${index}`}
                      >
                        {skill.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Link>
            </Motion.div>
          );
        })}
      </Motion.div>
    </Motion.section>
  );
}
