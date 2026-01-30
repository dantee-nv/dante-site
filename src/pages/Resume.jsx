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
          <AccordionItem id="work experience" title="Work Experience">
            <CompanyHeader
              company="Medtronic"
              companyUrl="https://www.medtronic.com/en-us/l/patients/treatments-therapies/transcatheter-aortic-valve-replacement.html"
              role="R&D Engineer – Testing and Data Analysis"
              meta="Orange County, CA • 2020–Present"
            />
            <ul>
              <li>
                Apply large language models (LLMs) within engineering analysis workflows to synthesize DV data, 
                compare historical results and accelerate technical reporting under regulatory constraints
              </li>
              <li>
                Design and deploy Python-based data aggregation and automation pipelines to process large verification datasets, 
                reducing manual processing and accelerating engineering analysis throughput
              </li>
              <li>
                Re-architected a one-year critical-path DV strategy by leveraging legacy data and risk-based test rationales, 
                enabling FDA submission two months ahead of schedule
              </li>
              <li>
                Lead cross-site, cross-disciplinary engineering teams to plan and execute DV studies supporting global market expansion
              </li>
              <li>
                Design and fabricate rapid 3D-printed fixtures and test components in SolidWorks to replicate in-vivo boundary conditions, 
                integrating explanted patient device data to improve hydrodynamic test realism
              </li>
              <li>
                Author formal technical rationales and test justifications incorporated into regulatory submissions to eliminate redundant 
                testing while preserving traceability and risk posture
              </li>
              <li>
                Manage and mentor direct reports while defining technical hiring criteria to scale verification and data-focused teams
              </li>
            </ul>
            
            <CompanyHeader
              company="Corrie Health"
              companyUrl="https://corriehealth.com/"
              role="iOS Software Developer"
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

            <CompanyHeader
              company="Medtronic"
              companyUrl="https://www.medtronic.com/en-us/healthcare-professionals/products/cardiac-rhythm/ventricular-assist-devices/heartware-hvad-system.html"
              role="Clinical Engineering Intern – Automation and Algorithm Development"
              meta="Miami Lakes, FL • Summer 2019"
            />
            <ul>
              <li>
                Created an automated testing system implemented on algorithms to examine sensitivity and false positive rates
              </li>
              <li>
                Built a custom analytics system to assess the significance of circadian disruption in predicting adverse outcomes
              </li>
              <li>
                Developed an algorithm to identify cardiac preload to non-invasively manage HVAD controller speed
              </li>
            </ul>

            <CompanyHeader
              company="imec"
              companyUrl="https://www.imec-int.com/en/expertise/health-technologies/vital-sign-monitoring#%20Wearable"
              role="Wearable Technology Integration Intern"
              meta="Leuven, Belgium • Summer 2018"
            />
            <ul>
              <li>
                Designed and developed an iOS application to securely ingest and visualize physiological data from a clinical grade wearable prototype
              </li>
              <li>
                Enabled contextual interpretation of stress trends from physiological stress signals in relation to geolocation and time based patterns 
              </li>
              <li>
                Implemented server communication pipelines to deliver real time derived stress metrics within the mobile application
              </li>
              <li>
                Independently owned project execution end to end, defining milestones and checkpoints to meet delivery timelines
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
            <div className="skills-grid">
              <div className="skills-column">
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
              </div>

              <div className="skills-column">
                <h4>Physical Systems</h4>
                <ul>
                  <li>3D modeling and rapid prototyping for test systems</li>
                  <li>CAD-based fixture and experimental setup design</li>
                  <li>Sensor-integrated prototyping for system-level evaluation</li>
                </ul>

                <h4>Regulated MedTech & Verification</h4>
                <ul>
                  <li>Design Verification (DV) strategy and execution</li>
                  <li>Medical device standards and test traceability (ISO 5840)</li>
                  <li>Experimental design and statistical rigor</li>
                </ul>
              </div>
            </div>

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
          <AccordionItem id="research" title="Research">
            <CompanyHeader
              company="Journal of the American College of Cardiology (JACC)"
              companyUrl="https://www.sciencedirect.com/science/article/pii/S1936879824006472"
              role="Author"
              meta="Published in 2024"
            />
            <ul>
              <li>
                Hydrodynamic Assessment of Explanted Degenerated Transcatheter Aortic Valves: Novel Insights Into Noncalcific and Calcific Mechanisms
              </li>
            </ul>

            <CompanyHeader
              company="Johns Hopkins University"
              companyUrl="https://www.hopkinsmedicine.org/inhealth"
              role="inHealth Precision Medicine – Project Lead"
              meta="Baltimore, MD • 2016–2021"
            />
            <ul>
              <li>
                Built machine learning models, including random forest classifiers, to predict patient outcomes using 
                ambulatory and physiological datasets collected in clinical settings
              </li>
              <li>
                Developed iOS and watchOS applications to support remote collection of patient-reported pain metrics 
                and physiological signals, enabling analysis of trends and temporal patterns
              </li>
              <li>
                Led hospital-based clinical studies under a funded Research Award, coordinating multidisciplinary 
                teams and ensuring adherence to approved clinical protocol
              </li>
            </ul>

            <CompanyHeader
              company="Johns Hopkins University"
              companyUrl="https://www.hopkinsmedicine.org/inhealth"
              role="Master's Thesis Project"
              meta="Baltimore, MD • 2019-2020"
            />
            <ul>
              <li>
                Integrated IMUs and flex sensors to capture wrist and hand kinematics and wirelessly control an actuated 
                3D printed hand with embedded tactile sensing using conductive traces and piezoresistive fabric
              </li>
              <li>
                Developed a Python based graphical interface to visualize tactile sensor activation and monitor system performance in real time
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
              company="Johns Hopkins University"
              companyUrl="https://www.bme.jhu.edu"
              role="Degrees (2020)"
              meta=""
            />
            <ul>
              <li>
                M.S.E. in Biomedical Engineering – Imaging and Medical Devices
              </li>
              <li>
                B.S. in Biomedical Engineering – Minor: Computer Integrated Surgery
              </li>
            </ul>
            <CompanyHeader
              company="Purdue University"
              companyUrl="https://bootcamp-sl.discover.online.purdue.edu/applied-artificial-intelligence-course"
              role="Certification (2026)"
              meta=""
            />
            <ul>
              <li>
                Applied Generative AI Specialization – Building LLM
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
          <div className="accordion-item" id="resume">
            <a
              className="accordion-header accordion-download"
              href="/Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="accordion-title">Download PDF</span>
              <span className="accordion-icon" aria-hidden="true">
                ↧
              </span>
            </a>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}