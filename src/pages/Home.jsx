import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

export default function Home() {
  
  usePageTitle("Home");
  
  return (
    <motion.section
      className="hero"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="hero-bg" aria-hidden="true" />
      <div className="hero-inner">
        <motion.p
          className="badge"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          R&D Engineer • Automation Builder • LA
        </motion.p>

        <motion.h1
          className="headline"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          Building tools that feel effortless.
        </motion.h1>

        <motion.p
          className="subhead"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          I create clean, high-impact software and automation—then ship it fast.
          This site is a hub for my projects, experiments, and future work.
        </motion.p>

        <motion.div
          className="cta-row"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <Link className="btn primary" to="/projects">
            View Projects
          </Link>
          <Link className="btn ghost" to="/resume">
            Resume
          </Link>
        </motion.div>

        <motion.div
          className="cards"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.6 }}
        >
          <Link to="/projects" className="card">
            <div className="card-title">Featured Builds</div>
            <div className="card-desc">
              Automation, dashboards, and “small tools with big leverage.”
            </div>
          </Link>

          <Link to="/resume" className="card">
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
        </motion.div>
      </div>
    </motion.section>
  );
}
