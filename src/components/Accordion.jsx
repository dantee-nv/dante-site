import React from "react";
import { motion as Motion } from "framer-motion";

export function Accordion({ items, openId, setOpenId }) {
  return (
    <div className="accordion project-accordion">
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div className="accordion-item" key={item.id}>
            <button
              className="accordion-header"
              onClick={() =>
                setOpenId((currentId) => (currentId === item.id ? null : item.id))
              }
              aria-expanded={isOpen}
              aria-controls={`${item.id}-panel`}
              id={`${item.id}-trigger`}
            >
              <span className="accordion-title">{item.title}</span>

              <Motion.span
                className="accordion-icon"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 26, mass: 0.6 }}
                aria-hidden="true"
              >
                ▾
              </Motion.span>
            </button>

            <div
              className={`accordion-content ${isOpen ? "open" : ""}`}
              id={`${item.id}-panel`}
              role="region"
              aria-labelledby={`${item.id}-trigger`}
              aria-hidden={!isOpen}
            >
              <div className="accordion-inner">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
