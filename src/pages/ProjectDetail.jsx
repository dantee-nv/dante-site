import React from "react";
import { Link, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";

import { getProjectBySlug } from "../data/projects";
import usePageTitle from "../hooks/usePageTitle";
import NotFound from "./NotFound";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

function formatStatus(status) {
  if (!status) {
    return "";
  }

  return status
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function renderMetaRows(meta) {
  if (!meta) {
    return null;
  }

  const rows = [
    { label: "Timeline", value: meta.timeline },
    { label: "Role", value: meta.role },
    { label: "Stack", value: meta.stack },
  ].filter((row) => Boolean(row.value));

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="project-meta">
      {rows.map((row) => (
        <p key={row.label} className="project-meta-line">
          <span className="project-meta-label">{row.label}:</span> {row.value}
        </p>
      ))}
    </div>
  );
}

function renderCtaAction(action, index) {
  if (!action?.label || !action?.to) {
    return null;
  }

  if (action.external) {
    return (
      <a
        key={`${action.label}-${index}`}
        className="btn ghost"
        href={action.to}
        target="_blank"
        rel="noreferrer"
      >
        {action.label}
      </a>
    );
  }

  return (
    <Link key={`${action.label}-${index}`} className="btn ghost" to={action.to}>
      {action.label}
    </Link>
  );
}

export default function ProjectDetail() {
  const { projectSlug } = useParams();
  const project = getProjectBySlug(projectSlug);
  usePageTitle(project ? project.title : "404");

  if (!project) {
    return <NotFound />;
  }

  const ctaActions = project.cta.filter((action) => action?.label && action?.to);

  return (
    <Motion.section
      className="page"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link className="btn ghost" to="/projects">
        Back to Projects
      </Link>

      <header className="project-detail-hero">
        <h2>{project.title}</h2>
        <p>{project.summary}</p>
        <div className="project-detail-meta">
          {project.status ? (
            <span className={`project-status ${project.status}`}>
              {formatStatus(project.status)}
            </span>
          ) : null}
          {project.tags.length > 0 ? (
            <div className="project-tags">
              {project.tags.map((tag) => (
                <span className="project-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {renderMetaRows(project.meta)}
      </header>

      {project.template === "stub" ? (
        <section className="project-section">
          <h3>In Progress</h3>
          <p>
            This page is intentionally lightweight while the project is being
            defined and built. It will expand into a full case study as work
            ships.
          </p>
        </section>
      ) : null}

      {project.sections.length > 0 ? (
        <div className="project-sections">
          {project.sections.map((section) => (
            <section className="project-section" key={section.heading}>
              <h3>{section.heading}</h3>
              {section.body ? <p>{section.body}</p> : null}
              {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}

      {project.highlights.length > 0 ? (
        <section className="project-highlights">
          <h3>Highlights</h3>
          <ul>
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {ctaActions.length > 0 ? (
        <div className="project-cta-row">
          {ctaActions.map((action, index) => renderCtaAction(action, index))}
        </div>
      ) : null}
    </Motion.section>
  );
}
