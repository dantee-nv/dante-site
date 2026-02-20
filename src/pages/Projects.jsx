import React from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";

import { projectCardList } from "../data/projects";
import usePageTitle from "../hooks/usePageTitle";

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
  const statusOrder = {
    live: 0,
    "in-progress": 1,
  };
  const liveProjectOrder = {
    "rag-hr-chatbot": 0,
    "semantic-paper-search-bedrock": 1,
    "lead-generation": 2,
    "amc-imax-scraper-n8n-automation": 3,
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

      <Motion.div className="grid" variants={grid} initial="initial" animate="animate">
        {sortedProjects.map((project) => {
          const skills = project.atGlance?.skills || [];

          return (
            <Motion.div
              key={project.slug}
              className="tile-frame"
              variants={tile}
              transition={{ duration: 0.35 }}
            >
              <Link className="tile tile-link" to={`/${project.slug}`}>
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
