import React from "react";
import { motion } from "framer-motion";

export default function About() {
  return (
    <motion.section
      className="page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <h2>About</h2>
      <p>
        Short bio here. (We can make this punchy and tailored to the roles you want.)
      </p>
    </motion.section>
  );
}
