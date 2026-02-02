import React from "react";
import { motion } from "framer-motion";
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
  
  return (
    <motion.section
      className="page"
      variants={page}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
      >
        Projects
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Add cards here for your apps, automations, and experiments.
      </motion.p>
      <motion.div className="grid" variants={grid} initial="initial" animate="animate">
        <motion.div className="tile" variants={tile} transition={{ duration: 0.35 }}>
          Project 1
        </motion.div>
        <motion.div className="tile" variants={tile} transition={{ duration: 0.35 }}>
          Project 2
        </motion.div>
        <motion.div className="tile" variants={tile} transition={{ duration: 0.35 }}>
          Project 3
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
