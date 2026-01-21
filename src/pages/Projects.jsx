import React from "react";
import { motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

export default function Projects() {

  usePageTitle("Home");
  
  return (
    <motion.section
      className="page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <h2>Projects</h2>
      <p>Add cards here for your apps, automations, and experiments.</p>
      <div className="grid">
        <div className="tile">Project 1</div>
        <div className="tile">Project 2</div>
        <div className="tile">Project 3</div>
      </div>
    </motion.section>
  );
}
