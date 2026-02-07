const baseProjects = [
  {
    slug: "dante-site",
    title: "This Site",
    summary:
      "An AWS Amplify-hosted personal site built to ship quickly, look polished, and support real outreach through a production contact pipeline.",
    status: "live",
    tags: ["React", "Vite", "React Router", "Framer Motion", "AWS", "Amplify"],
    template: "case-study",
    meta: {
      timeline: "January 2026 - Ongoing",
      role: "Design + Frontend + Backend Integration",
      stack:
        "React, Vite, React Router, Framer Motion, AWS Amplify Hosting, AWS API Gateway, Lambda, SES, SAM",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "The goal was to launch a clean site that feels intentional, presents work clearly, and gives visitors a direct way to start a conversation.",
        bullets: [
          "Keep navigation simple and fast.",
          "Use reusable patterns so new pages are easy to add.",
          "Ship with a real contact workflow instead of a static mailto-only flow.",
        ],
      },
      {
        heading: "Frontend Foundation",
        body:
          "The site is built with React + Vite and routed with React Router. Framer Motion handles page transitions and staggered reveals to keep motion consistent across pages.",
        bullets: [
          "Single app shell with shared header and footer.",
          "Route-based pages for Home, Projects, Resume, and Contact.",
          "Reusable animation variants for page and card entry.",
        ],
      },
      {
        heading: "UI System Decisions",
        body:
          "The visual direction uses a glass-style panel system over a layered radial background. Core spacing, borders, and color tokens are centralized in one stylesheet for consistency.",
        bullets: [
          "Card and tile components share border and hover behavior.",
          "Typography and spacing are tuned for readability on desktop and mobile.",
          "Focus and hover states are designed to support keyboard navigation and clarity.",
        ],
      },
      {
        heading: "Skills Challenge Development",
        body:
          "A skills challenge experience was developed directly into the site to make technical ability more tangible than static bullets alone.",
        bullets: [
          "Designed an interactive challenge flow that aligns with the existing visual system.",
          "Integrated challenge development into the broader resume and projects narrative.",
          "Used the feature as a proving ground for iterative UX and frontend implementation decisions.",
        ],
      },
      {
        heading: "Contact Pipeline Architecture",
        body:
          "Contact submissions flow from the frontend to API Gateway, then into a Lambda function that sends mail through SES with validation and response handling.",
        bullets: [
          "Frontend posts JSON payloads from the Contact page.",
          "API endpoint is environment-configured with VITE_CONTACT_API_URL.",
          "Backend validates input, rate-limits, and returns user-safe responses.",
        ],
      },
      {
        heading: "Deployment and Environment Strategy",
        body:
          "The frontend is hosted on AWS Amplify, while infrastructure for the contact API is defined under SAM and deployed with AWS tooling. Frontend deployment is configured to consume the API output URL without hardcoding runtime secrets.",
        bullets: [
          "Amplify handles hosting and frontend deployment workflow.",
          "Contact API stack deploys via SAM.",
          "Allowed origins are restricted for production and localhost.",
          "Environment variable wiring keeps client and backend decoupled.",
        ],
      },
      {
        heading: "Current Outcome and Next Iterations",
        body:
          "The site is live and now transitioning from scaffolding into richer project storytelling. Next iterations focus on deeper project case studies and long-term maintainability.",
        bullets: [
          "Convert all project cards into full detail pages.",
          "Continue expanding the skills challenge development experience.",
          "Expand project metadata and comparison-friendly structure.",
          "Continue improving content depth while keeping performance tight.",
        ],
      },
    ],
    highlights: [
      "Hosted on AWS Amplify with a production-ready frontend deployment flow.",
      "Built and integrated a skills challenge development experience into the site narrative.",
      "Shipped with a live contact form pipeline instead of placeholder interactions.",
      "Uses one shared layout and style system to keep page additions predictable.",
      "Ready for incremental project growth through a data-driven project model.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
      { label: "View GitHub", to: "https://github.com/dantee-nv", external: true },
    ],
  },
  {
    slug: "project-2",
    title: "Crexi Broker Pipeline",
    summary:
      "Built a repeatable pipeline that filters raw Crexi listings, deduplicates brokers, and enriches broker records with active listing totals for outreach and market analysis.",
    status: "live",
    tags: ["Python", "Data Pipeline", "Playwright", "Async Scraping", "Data Quality", "Automation"],
    template: "case-study",
    meta: {
      timeline: "2026 (Idaho territory snapshot run)",
      role: "Data + Automation Engineer",
      stack: "Python, JSON, CSV, Playwright, Asyncio, Regex, Apify Actor output",
    },
    sections: [
      {
        heading: "Project Snapshot",
        body:
          "I built a data pipeline that turns raw Crexi listing data into a clean broker dataset, then enriches each broker with total active listings from their public Crexi profile.",
        bullets: [
          "Designed for speed, accuracy, and repeatability.",
          "Combined backend parsing with browser automation in one workflow.",
          "Created a reusable process for outreach and market analysis datasets.",
        ],
      },
      {
        heading: "Problem and Goal",
        body:
          "SDR workflows required manual territory searches, listing checks, broker profile reviews, and outreach qualification one broker at a time.",
        bullets: [
          "Reduce manual profile-by-profile research for identified territories.",
          "Apply business logic around PRO versus non-PRO broker targeting.",
          "Prioritize lead quality signals including active listing volume and recent activity context.",
          "Produce a reliable broker dataset for outreach and analysis.",
        ],
      },
      {
        heading: "What I Built",
        body:
          "I implemented a three-stage pipeline from raw listing export to enrichment-ready and analysis-ready broker output.",
        bullets: [
          "API Parse.py handled data filtering and broker extraction from 1,243 raw asset records.",
          "Generated normalized broker profile URLs and deduplicated to 200 unique brokers.",
          "Crexi Scraper.py enriched broker rows with Active Listings Total using layered fallback selectors.",
        ],
      },
      {
        heading: "Results and Impact (One Territory Snapshot)",
        body:
          "These metrics are from a single Idaho territory export run and represent one repeatable snapshot of the workflow.",
        bullets: [
          "Input scope: 1,243 raw assets.",
          "Final target set: 200 unique broker profiles.",
          "Enriched successfully: 197 / 200 (98.5% coverage).",
          "Unresolved: 3 rows marked N/A.",
        ],
      },
      {
        heading: "Challenges and Engineering Decisions",
        body:
          "Dynamic pages and inconsistent structures required reliability-focused extraction logic instead of one brittle selector.",
        bullets: [
          "Used layered fallback extraction to handle dynamic profile layouts.",
          "Prioritized direct text signals before broader DOM heuristics to avoid overcounting.",
          "Blocked heavy resources and used targeted timeouts to reduce scraping overhead.",
          "Added retries and exponential backoff to recover from transient failures.",
        ],
      },
      {
        heading: "Skills Matrix",
        body: "How project skills translated into measurable outcomes.",
        bullets: [
          "Python scripting - Built end-to-end pipeline scripts - Automated a manual workflow.",
          "JSON processing - Parsed and iterated 1,243 raw assets - Structured ingestion at scale.",
          "CSV pipeline design - Produced filtered and enriched outputs - Clean stage-to-stage handoff.",
          "Business-rule filtering - Excluded PRO brokers by logic - Improved lead targeting quality.",
          "Deduplication strategy - Removed duplicate broker URLs - Delivered 200 unique broker rows.",
          "Async Playwright scraping - Ran worker concurrency for profile enrichment - Increased throughput and coverage.",
          "Reliability engineering - Implemented retry and backoff - Improved resilience on dynamic pages.",
          "Regex and text extraction - Parsed Active Listings Total via fallbacks - More robust enrichment.",
          "Data quality controls - Skipped already-filled rows and normalized N/A values - Safer reruns.",
        ],
      },
      {
        heading: "Step-by-Step Timeline",
        body:
          "Execution moved from raw ingestion through hardened enrichment and final metric validation.",
        bullets: [
          "1. Loaded Idaho JSON export and validated record structure for broker extraction.",
          "2. Implemented business filters for non-PRO targeting across single- and multi-broker assets.",
          "3. Generated normalized broker URLs and deduplicated records by profile URL.",
          "4. Produced enrichment-ready broker CSV with stable handoff fields.",
          "5. Implemented async Playwright workers to scrape Active Listings Total from broker profiles.",
          "6. Added layered fallbacks, request blocking, retries, and backoff for extraction stability.",
          "7. Validated final coverage at 197/200 enriched profiles (98.5%) with 3 rows marked N/A.",
        ],
      },
      {
        heading: "What This Demonstrates",
        body:
          "The project demonstrates full-stack automation execution from business logic translation to production-usable output quality.",
        bullets: [
          "Converted outreach requirements into explicit, testable filtering logic.",
          "Handled edge cases in dynamic web extraction with resilient fallback strategies.",
          "Optimized runtime through concurrency and selective request blocking.",
          "Delivered analysis-ready output that reduces manual research effort.",
        ],
      },
    ],
    highlights: [
      "Built a repeatable broker enrichment workflow from raw export to outreach-ready output.",
      "Achieved 98.5% enrichment coverage on the 200-profile target set.",
      "Implemented robust fallback extraction for dynamic profile page variance.",
      "Reduced manual SDR research workload with automated filtering and enrichment.",
      "Produced a clean dataset suitable for both outreach execution and market analysis.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
    ],
  },
  {
    slug: "project-3",
    title: "Nestle HR Policy RAG Chatbot",
    summary:
      "A Retrieval-Augmented Generation chatbot that answers Nestle HR policy questions with concise, policy-grounded responses while minimizing hallucinations.",
    status: "live",
    tags: ["RAG", "LangChain", "OpenAI", "FAISS", "Gradio", "GPT-4.1-nano"],
    template: "case-study",
    meta: {
      role: "LLM + Retrieval Engineer",
      stack:
        "Python, LangChain, OpenAI text-embedding-3-small, FAISS, GPT-4.1-nano, Gradio",
    },
    sections: [
      {
        heading: "Project Goal",
        body:
          "This project implements a Retrieval-Augmented Generation chatbot for Nestle Human Resources policy support, with answers constrained to approved HR documents.",
        bullets: [
          "Provide accurate, concise, and policy-grounded responses.",
          "Minimize hallucinations through context-constrained generation.",
          "Acknowledge when requested information is not present in source policy content.",
        ],
      },
      {
        heading: "Technical Overview",
        body:
          "A Nestle HR Policy PDF is ingested and processed with LangChain. The document is chunked into semantically meaningful passages, embedded, and indexed for semantic retrieval.",
        bullets: [
          "Text chunks are embedded with OpenAI text-embedding-3-small.",
          "Embeddings are stored in a FAISS vector database for efficient similarity search.",
          "User questions trigger retrieval of the most relevant policy excerpts.",
          "Retrieved context is injected into a custom prompt template before generation.",
        ],
      },
      {
        heading: "Model and Prompting Strategy",
        body:
          "Response generation uses GPT-4.1-nano with a prompt that frames the assistant as Nestle's Human Resources Policy Assistant.",
        bullets: [
          "Prompt constraints enforce context-only answers and no speculation.",
          "Responses are kept to one or two short sentences for clarity.",
          "Assistant tone is professional and HR-focused.",
          "Prompt explicitly prevents legal-advice style responses.",
        ],
      },
      {
        heading: "User Interface",
        body:
          "A lightweight Gradio frontend provides a chat-style experience for policy Q&A.",
        bullets: [
          "Users submit questions through a text input and receive concise answers.",
          "An Answer Stats section displays latency, token usage, and estimated cost.",
          "Performance details are collapsible to keep primary responses uncluttered.",
        ],
      },
      {
        heading: "Outcome",
        body:
          "The project demonstrates a reliable, transparent, and cost-aware way to apply RAG to internal policy documentation.",
        bullets: [
          "Shows how retrieval grounding improves trust in HR policy responses.",
          "Provides a modular base for adding more policy documents.",
          "Supports future upgrades in retrieval strategy and production deployment.",
        ],
      },
    ],
    highlights: [
      "Built a policy-grounded RAG flow using LangChain, OpenAI embeddings, and FAISS.",
      "Implemented prompt constraints that prioritize concise, context-only answers.",
      "Delivered a Gradio chat interface with built-in latency/token/cost visibility.",
      "Designed with modular structure for multi-document and production-ready expansion.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
    ],
  },
];

function normalizeProject(project) {
  return {
    ...project,
    status: project.status || "planned",
    template: project.template || "case-study",
    tags: Array.isArray(project.tags) ? project.tags : [],
    sections: Array.isArray(project.sections) ? project.sections : [],
    highlights: Array.isArray(project.highlights) ? project.highlights : [],
    cta: Array.isArray(project.cta) ? project.cta : [],
  };
}

export const projects = baseProjects.map(normalizeProject);

export const projectCardList = projects.map(
  ({ slug, title, summary, status, tags, template }) => ({
    slug,
    title,
    summary,
    status,
    tags,
    template,
  })
);

export function getProjectBySlug(slug) {
  if (!slug) {
    return undefined;
  }

  return projects.find((project) => project.slug === slug);
}
