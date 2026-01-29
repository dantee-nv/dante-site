import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

const page = {
  initial: { opacity: 0, y: 14, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(6px)" },
};

function AccordionItem({ id, title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion-item" id={id}>
      <button
        className="accordion-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        type="button"
      >
        <span className="accordion-title">{title}</span>
        <motion.span
          className="accordion-icon"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          aria-hidden="true"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="accordion-content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="accordion-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompanyHeader({ company, companyUrl, role, meta }) {
  return (
    <div className="company-header">
      <div className="company-line">
        <div className="company-left">
          <span className="company-link-group">
            <a
              className="company-name"
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {company}
            </a>

            <a
              className="company-link-icon"
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${company}`}
              title={`Open ${company}`}
            >
              ↗
            </a>
          </span>

          <span className="company-sep">•</span>

          <span className="company-role">{role}</span>
        </div>
      </div>

      {meta ? <div className="company-meta">{meta}</div> : null}
    </div>
  );
}

export default function Resume() {
  usePageTitle("Resume");

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
        Resume
      </motion.h2>

      <motion.h3
        className="resume-intro-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.45 }}
      >
        Summary
      </motion.h3>

      <motion.p
        className="resume-intro"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        I am a biomedical engineer working at the intersection of data systems,
        medical device development and regulated engineering environments. My work
        focuses on building analytical and AI-enabled tools that accelerate verification,
        decision making and regulatory outcomes without sacrificing rigor.
      </motion.p>

      <motion.div
        className="accordion"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42, duration: 0.6 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5 }}
        >
          <AccordionItem id="experience" title="Experience">
            <CompanyHeader
              company="Medtronic"
              companyUrl="https://www.medtronic.com/"
              role="R&D Engineer – Testing and Data Analysis"
              meta="Orange County, CA • 2020–Present"
            />
            <ul>
              <li>
                Applied large language models within engineering analysis workflows to
                synthesize design verification data and accelerate technical reporting
                under regulatory constraints
              </li>
              <li>
                Designed and deployed Python-based data aggregation and automation pipelines
                to process large verification datasets reducing manual processing and
                accelerating analysis throughput
              </li>
              <li>
                Re-architected a critical-path DV strategy using legacy data and risk-based
                rationales enabling FDA submission ahead of schedule
              </li>
              <li>
                Led cross-site cross-disciplinary engineering teams to plan and execute DV
                studies supporting global market expansion
              </li>
            </ul>

            <CompanyHeader
              company="Corrie Health"
              companyUrl="https://corriehealth.com/"
              role="Software Developer"
              meta="Remote • 2018–2021"
            />
            <ul>
              <li>
                Developed and deployed patient-facing iOS applications for secure collection,
                visualization and longitudinal tracking of physiological data used by clinicians
                for monitoring trends and outcomes
              </li>
              <li>
                Integrated Bluetooth-enabled medical devices to stream real-time physiological
                signals into mobile applications and managed production App Store releases
              </li>
            </ul>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.56, duration: 0.5 }}
        >
          <AccordionItem id="skills" title="Skills">
            <CompanyHeader
              company="Core strengths"
              companyUrl="#skills"
              role="Future interactive skills section goes here"
              meta=""
            />

            <h4>AI and Data Systems</h4>
            <ul>
              <li>LLM-enabled analytics and workflow integration</li>
              <li>Machine learning and predictive modeling</li>
              <li>Data pipelines automation and model evaluation</li>
            </ul>

            <h4>Software Engineering</h4>
            <ul>
              <li>Python-based analytical and visualization tooling</li>
              <li>Algorithm development and verification</li>
              <li>User-facing tools for engineering and clinical workflows</li>
            </ul>

            <h4>Physical and Regulated Systems</h4>
            <ul>
              <li>3D modeling and rapid prototyping for test systems</li>
              <li>Design verification strategy and execution</li>
              <li>Medical device standards and test traceability (ISO 5840)</li>
              <li>Experimental design and statistical rigor</li>
            </ul>

            <p className="skills-note">
              This section is structured so a future interactive skills game can live here.
            </p>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.64, duration: 0.5 }}
        >
          <AccordionItem id="research" title="Research and Publications">
            <CompanyHeader
              company="Publications"
              companyUrl="#research"
              role="Selected research highlights"
              meta=""
            />
            <ul>
              <li>
                Journal of the American College of Cardiology: Hydrodynamic Assessment of
                Explanted Degenerated Transcatheter Aortic Valves
              </li>
            </ul>

            <CompanyHeader
              company="Johns Hopkins University"
              companyUrl="https://www.jhu.edu/"
              role="Institute of NanoBioTechnology – Project Lead"
              meta="Baltimore, MD • 2016–2021"
            />
            <ul>
              <li>
                Built machine learning models including random forest classifiers to predict
                patient outcomes using ambulatory and physiological datasets collected in
                clinical settings
              </li>
              <li>
                Developed iOS and watchOS applications to support remote collection of
                patient-reported pain metrics and physiological signals
              </li>
            </ul>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 0.5 }}
        >
          <AccordionItem id="education" title="Education">
            <CompanyHeader
              company="Education"
              companyUrl="#education"
              role="Degrees and specialization"
              meta=""
            />
            <ul>
              <li>
                Johns Hopkins University (2020) MSE and BS Biomedical Engineering – Imaging and
                Medical Devices
              </li>
              <li>
                Purdue University (2025) Applied Generative AI Specialization – Building LLM
                Applications and Agentic Frameworks
              </li>
            </ul>
          </AccordionItem>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.80, duration: 0.5 }}
        >
          <AccordionItem id="resume" title="Resume PDF">
            <CompanyHeader
              company="Download"
              companyUrl="#resume"
              role="Traditional format for applications"
              meta=""
            />
            <p>Download the traditional resume format here.</p>
            <a
              className="btn primary"
              href="/Dante_Navarro_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download resume
            </a>
          </AccordionItem>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}