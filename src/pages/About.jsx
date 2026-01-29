import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import usePageTitle from "../hooks/usePageTitle";

function AccordionItem({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion-item">
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

export default function About() {
  usePageTitle("About");

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
        I am a biomedical engineer working at the intersection of data systems,
        medical device development and regulated engineering environments. My
        work focuses on building analytical and AI-enabled tools that accelerate
        verification, decision making and regulatory outcomes without sacrificing
        rigor.
      </p>

      <div className="accordion">
        <AccordionItem title="Experience">
          <h4>Medtronic | Senior R&D Engineer</h4>
          <p>
            I develop and validate data-driven verification systems for
            transcatheter heart valve technologies operating under global
            regulatory constraints.
          </p>
          <ul>
            <li>
              Applied large language models within engineering analysis workflows
              to synthesize design verification data and accelerate technical
              reporting under regulatory constraints
            </li>
            <li>
              Designed and deployed Python-based data aggregation and automation
              pipelines to process large verification datasets reducing manual
              processing and accelerating analysis throughput
            </li>
            <li>
              Re-architected a critical-path DV strategy using legacy data and
              risk-based rationales enabling FDA submission ahead of schedule
            </li>
            <li>
              Led cross-site cross-disciplinary engineering teams to plan and
              execute DV studies supporting global market expansion
            </li>
            <li>
              Designed and fabricated 3D-printed fixtures and test components in
              SolidWorks to replicate in vivo boundary conditions integrating
              explanted patient device data to improve hydrodynamic test realism
            </li>
            <li>
              Authored technical rationales and test justifications incorporated
              into regulatory submissions to eliminate redundant testing while
              preserving traceability and risk posture
            </li>
            <li>
              Managed and mentored direct reports and helped define technical
              hiring criteria to scale verification and data-focused teams
            </li>
          </ul>

          <h4>Corrie Health | Software Developer</h4>
          <ul>
            <li>
              Developed and deployed patient-facing iOS applications for secure
              collection visualization and longitudinal tracking of physiological
              data used by clinicians for monitoring trends and outcomes
            </li>
            <li>
              Integrated Bluetooth-enabled medical devices to stream real-time
              physiological signals into mobile applications and managed
              production App Store releases
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Skills">
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
            This section is structured so a future interactive skills game can
            live here without changing the page architecture.
          </p>
        </AccordionItem>

        <AccordionItem title="Research and Publications">
          <p>
            Published peer-reviewed research applying quantitative analysis to
            characterize device performance in explanted clinical samples.
          </p>
          <ul>
            <li>
              Journal of the American College of Cardiology: Hydrodynamic
              Assessment of Explanted Degenerated Transcatheter Aortic Valves:
              Novel Insights Into Noncalcific and Calcific Mechanisms
            </li>
          </ul>

          <h4>Johns Hopkins University | Institute of NanoBiotechnology</h4>
          <ul>
            <li>
              Built machine learning models including random forest classifiers
              to predict patient outcomes using ambulatory and physiological
              datasets collected in clinical settings
            </li>
            <li>
              Developed iOS and watchOS applications to support remote
              collection of patient-reported pain metrics and physiological
              signals enabling analysis of trends and temporal patterns
            </li>
            <li>
              Led hospital-based clinical studies under a funded Research Award
              coordinating multidisciplinary teams and ensuring adherence to
              approved clinical protocol
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Education">
          <ul>
            <li>
              Johns Hopkins University (2020) MSE and BS Biomedical Engineering
              Imaging and Medical Devices
            </li>
            <li>
              Purdue University (2025) Certification Applied Generative AI
              Specialization Building LLM Applications and Agentic Frameworks
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem title="Resume">
          <p>
            Download the traditional resume format here.
          </p>
          <a
            className="btn primary"
            href="/Dante_Navarro_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download resume
          </a>
        </AccordionItem>
      </div>
    </motion.section>
  );
}