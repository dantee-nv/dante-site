import React from "react";
import { Link, NavLink } from "react-router-dom";

const navItems = [
  { to: "/projects", label: "Projects" },
  { to: "/resume", label: "Resume" },
  { to: "/contact", label: "Contact" },
];

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-inner">
          <Link className="logo" to="/" aria-label="Home">
            Dante Navarro
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
          <a className="footer-link" href="https://www.linkedin.com" target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <span className="footer-dot">•</span>
          <a className="footer-link" href="https://github.com" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
