import React from "react";
import { Link, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";

import ProjectDemoPanel from "../components/ProjectDemoPanel";
import { getProjectBySlug } from "../data/projects";
import usePageTitle from "../hooks/usePageTitle";
import NotFound from "./NotFound";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

const flow = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const pop = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
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

function formatSkillLane(lane) {
  if (lane === "ai") {
    return "AI";
  }

  if (!lane) {
    return "General";
  }

  return `${lane.charAt(0).toUpperCase()}${lane.slice(1)}`;
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
  const atGlanceSkills = project.atGlance?.skills || [];
  const atGlanceMetrics = project.atGlance?.metrics || [];

  return (
    <Motion.section
      className="page"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Motion.div variants={flow} initial="initial" animate="animate">
        <Motion.div variants={pop} transition={{ duration: 0.35 }}>
          <Link className="btn ghost" to="/projects">
            Back to Projects
          </Link>
        </Motion.div>

        <Motion.header
          className="project-detail-hero"
          variants={pop}
          transition={{ duration: 0.35 }}
        >
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
        </Motion.header>

        {atGlanceSkills.length > 0 || atGlanceMetrics.length > 0 ? (
          <Motion.section
            className="project-section project-at-glance"
            variants={pop}
            transition={{ duration: 0.35 }}
          >
            <h3>At a Glance</h3>

            {atGlanceSkills.length > 0 ? (
              <div>
                <h4>Skills Used</h4>
                <ul className="project-skill-list" aria-label={`${project.title} skills used`}>
                  {atGlanceSkills.map((skill, index) => (
                    <li
                      className={`project-skill-chip lane-${skill.lane}`}
                      key={`${project.slug}-detail-skill-${skill.label}-${index}`}
                    >
                      <span className="project-skill-lane">{formatSkillLane(skill.lane)}</span>
                      <span>{skill.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {atGlanceMetrics.length > 0 ? (
              <div>
                <h4>Project Signals</h4>
                <ul className="project-metric-row" aria-label={`${project.title} project signals`}>
                  {atGlanceMetrics.map((metric, index) => (
                    <li
                      className={`project-metric-pill tone-${metric.tone}`}
                      key={`${project.slug}-detail-metric-${metric.label}-${index}`}
                    >
                      <span className="project-metric-label">{metric.label}</span>
                      <span className="project-metric-value">{metric.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Motion.section>
        ) : null}

        {project.template === "stub" ? (
          <Motion.section
            className="project-section"
            variants={pop}
            transition={{ duration: 0.35 }}
          >
            <h3>In Progress</h3>
            <p>
              This page is intentionally lightweight while the project is being
              defined and built. It will expand into a full case study as work
              ships.
            </p>
          </Motion.section>
        ) : null}

        {project.sections.length > 0 ? (
          <div className="project-sections">
            {project.sections.map((section) => (
              <Motion.section
                className="project-section"
                key={section.heading}
                variants={pop}
                transition={{ duration: 0.35 }}
              >
                <h3>{section.heading}</h3>
                {section.body ? <p>{section.body}</p> : null}
                {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </Motion.section>
            ))}
          </div>
        ) : null}

        {project.slug === "rag-hr-chatbot" ? (
          <Motion.div variants={pop} transition={{ duration: 0.35 }}>
            <ProjectDemoPanel />
          </Motion.div>
        ) : null}

        {project.highlights.length > 0 ? (
          <Motion.section
            className="project-highlights"
            variants={pop}
            transition={{ duration: 0.35 }}
          >
            <h3>Highlights</h3>
            <ul>
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </Motion.section>
        ) : null}

        {ctaActions.length > 0 ? (
          <Motion.div
            className="project-cta-row"
            variants={pop}
            transition={{ duration: 0.35 }}
          >
            {ctaActions.map((action, index) => renderCtaAction(action, index))}
          </Motion.div>
        ) : null}
      </Motion.div>
    </Motion.section>
  );
}
