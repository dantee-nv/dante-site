import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Accordion({ items, openId, setOpenId }) {
  return (
    <div className="accordion">
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <div className="accordion-item" key={item.id}>
            <button
              className="accordion-header"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
            >
              <span className="accordion-title">{item.title}</span>

              <motion.span
                className="accordion-icon"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                aria-hidden="true"
              >
                ▾
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  className="accordion-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    className="accordion-inner"
                    layout
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  >
                    {item.content}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}