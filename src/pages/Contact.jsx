import React from "react";
import { motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

export default function Contact() {

  usePageTitle("Home");
  
  return (
    <motion.section
      className="page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <h2>Contact</h2>
      <p>Put email + links here. Later we can add a real form (Lambda).</p>
      <div className="contact-row">
        <a className="btn primary" href="mailto:you@domain.com">Email Me</a>
        <a className="btn ghost" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </motion.section>
  );
}
