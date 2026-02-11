import React from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

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
          <Link to="/projects" className="card">
            <div className="card-title">Featured Builds</div>
            <div className="card-desc">
              Automation, dashboards and “small tools with big leverage.”
            </div>
          </Link>

          <Link to="/background" className="card">
            <div className="card-title">Background</div>
            <div className="card-desc">
              R&D + verification mindset, applied to software and systems.
            </div>
          </Link>

          <Link to="/contact" className="card">
            <div className="card-title">Contact</div>
            <div className="card-desc">
              If you’re hiring or building, let’s connect.
            </div>
          </Link>
        </Motion.div>
      </div>
    </Motion.section>
  );
}
