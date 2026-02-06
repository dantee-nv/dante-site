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
        Explore shipped work, in-progress builds, and upcoming experiments.
      </Motion.p>

      <Motion.div className="grid" variants={grid} initial="initial" animate="animate">
        {projectCardList.map((project) => (
          <Motion.div key={project.slug} variants={tile} transition={{ duration: 0.35 }}>
            <Link className="tile tile-link" to={`/projects/${project.slug}`}>
              <div className="tile-top">
                <h3 className="tile-title">{project.title}</h3>
                <span className={`project-status ${project.status}`}>
                  {formatStatus(project.status)}
                </span>
              </div>
              <p className="tile-summary">{project.summary}</p>
              {project.tags.length > 0 ? (
                <div className="project-tags">
                  {project.tags.map((tag) => (
                    <span className="project-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          </Motion.div>
        ))}
      </Motion.div>
    </Motion.section>
  );
}
