import React from "react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { to: "/projects", label: "Projects" },
  { to: "/background", label: "Background" },
  { to: "/contact", label: "Contact" },
];

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner">
          <Link className="logo" to="/" aria-label="Home">
            <img className="logo-mark" src="/favicon.svg" alt="" aria-hidden="true" />
            <span className="logo-name">Dante Navarro</span>
            <span className="logo-sep" aria-hidden="true">
              |
            </span>
            <span className="logo-home">Home</span>
          </Link>

          <nav className="nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="main">{children}</main>

      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} Dante Navarro</span>
          <span className="footer-dot">•</span>
          <a className="footer-link" href="https://www.linkedin.com/in/dante-navarro/" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <span className="footer-dot">•</span>
          <a className="footer-link" href="https://github.com/dantee-nv" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
