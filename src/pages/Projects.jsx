import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";

import { projectCardList, projects } from "../data/projects";
import usePageTitle from "../hooks/usePageTitle";
import { buildProjectSearchIndex, searchProjects } from "../utils/projectSearch";

const projectSearchIndex = buildProjectSearchIndex(projects);

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
  const statusOrder = {
    live: 0,
    "in-progress": 1,
  };
  const liveProjectOrder = {
    "clinical-ner-finetune": 0,
    "rag-hr-chatbot": 1,
    "semantic-paper-search-bedrock": 2,
    "lead-generation": 3,
    "amc-imax-scraper-n8n-automation": 4,
  };

  const sortedProjects = [...projectCardList].sort((a, b) => {
    const aIsSite = a.slug === "site";
    const bIsSite = b.slug === "site";
    const aIsCabbie = a.slug === "cabbie-ios";
    const bIsCabbie = b.slug === "cabbie-ios";

    if (aIsSite && bIsCabbie) {
      return -1;
    }

    if (aIsCabbie && bIsSite) {
      return 1;
    }

    const aRank = statusOrder[a.status] ?? Number.MAX_SAFE_INTEGER;
    const bRank = statusOrder[b.status] ?? Number.MAX_SAFE_INTEGER;

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    if (a.status === "live" && b.status === "live") {
      const aLiveOrder = liveProjectOrder[a.slug] ?? Number.MAX_SAFE_INTEGER;
      const bLiveOrder = liveProjectOrder[b.slug] ?? Number.MAX_SAFE_INTEGER;

      if (aLiveOrder !== bLiveOrder) {
        return aLiveOrder - bLiveOrder;
      }
    }

    return a.title.localeCompare(b.title);
  });
  const highlightedProjectSlugs = new Set(highlightedProjectSlugList);

  function handleSearchChange(event) {
    const nextQuery = event.target.value;
    setDraftSearchQuery(nextQuery);

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
    runSubmittedSearch(draftSearchQuery);
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
            Explore shipped work, in-progress builds and upcoming experiments.
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
