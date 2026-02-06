import React from "react";
import { motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

export default function Contact() {

  usePageTitle("Contact");
  
  return (
    <motion.section
      className="page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <h2>Contact</h2>
      <div className="contact-row">
        <a className="btn primary" href="mailto:contact@dantenavarro.com?subject=Website%20Inquiry">Email Me</a>
        <a className="btn ghost" href="https://www.linkedin.com/in/dante-navarro/" target="_blank" rel="noreferrer">LinkedIn</a>
        <a className="btn ghost" href="https://github.com/dantee-nv" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </motion.section>
  );
}
