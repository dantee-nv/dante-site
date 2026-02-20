import React from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

const homeCards = [
  {
    to: "/projects",
    title: "Projects",
    icon: "projects",
    desc: "Automation, dashboards and “small tools with big leverage.”",
  },
  {
    to: "/background",
    title: "Background",
    icon: "background",
    desc: "R&D + verification mindset, applied to software and systems.",
  },
  {
    to: "/contact",
    title: "Contact",
    icon: "contact",
    desc: "If you’re hiring or building, let’s connect.",
  },
];

function CardIcon({ icon }) {
  if (icon === "projects") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    );
  }

  if (icon === "background") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M8 5h8.5a2.5 2.5 0 0 1 2.5 2.5V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        <path d="M6 8H5a2 2 0 0 0-2 2v9.5A2.5 2.5 0 0 0 5.5 22H14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.5 6h11a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4 3v-3H6.5A2.5 2.5 0 0 1 4 15.5v-7A2.5 2.5 0 0 1 6.5 6Z" />
      <path d="M8 11h8M8 14h5" />
    </svg>
  );
}

export default function Home() {
  
  usePageTitle("Home");
  
  return (
    <Motion.section
      className="hero"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-inner">
        <Motion.p
          className="badge"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <span className="badge-location">LA Based</span>
          <span className="badge-copy">R&D Engineer • Automation Builder</span>
        </Motion.p>

        <Motion.h1
          className="headline"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          Building tools that feel effortless.
        </Motion.h1>

        <Motion.p
          className="subhead"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          I create clean, high-impact software and automation, then ship it fast.
          This site is a hub for my projects, experiments and future work.
        </Motion.p>

        <Motion.div
          className="cards"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          {homeCards.map((card) => (
            <Link to={card.to} className="card" key={card.to}>
              <div className="card-title-row">
                <span className="card-icon" aria-hidden="true">
                  <CardIcon icon={card.icon} />
                </span>
                <div className="card-title">{card.title}</div>
              </div>
              <div className="card-desc">{card.desc}</div>
            </Link>
          ))}
        </Motion.div>
      </div>
    </Motion.section>
  );
}
