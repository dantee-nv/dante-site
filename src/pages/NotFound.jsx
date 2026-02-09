import React from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

export default function NotFound() {

  usePageTitle("404");
  
  return (
    <Motion.section
      className="page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
    >
      <h2>404</h2>
      <p>This page doesn’t exist.</p>
      <Link className="btn ghost" to="/">Go Home</Link>
    </Motion.section>
  );
}
