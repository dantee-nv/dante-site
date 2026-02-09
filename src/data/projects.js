import idahoResultsFlow from "../content/lead-generation/idaho-results-impact.mmd?raw";

const validSkillLanes = new Set([
  "frontend",
  "backend",
  "data",
  "ai",
  "automation",
  "cloud",
  "general",
]);

const validMetricTones = new Set(["neutral", "info", "success"]);

function normalizeAtGlanceSkills(rawSkills, fallbackTags) {
  const skills = Array.isArray(rawSkills)
    ? rawSkills
        .map((skill) => {
          const label = typeof skill?.label === "string" ? skill.label.trim() : "";
          if (!label) {
            return null;
          }

          const lane = validSkillLanes.has(skill.lane) ? skill.lane : "general";
          return { label, lane };
        })
        .filter(Boolean)
    : [];

  if (skills.length > 0) {
    return skills;
  }

  if (!Array.isArray(fallbackTags)) {
    return [];
  }

  return fallbackTags
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .map((label) => ({ label, lane: "general" }));
}

function normalizeAtGlanceMetrics(rawMetrics) {
  if (!Array.isArray(rawMetrics)) {
    return [];
  }

  return rawMetrics
    .map((metric) => {
      const label = typeof metric?.label === "string" ? metric.label.trim() : "";
      const value = typeof metric?.value === "string" ? metric.value.trim() : "";

      if (!label || !value) {
        return null;
      }

      const tone = validMetricTones.has(metric.tone) ? metric.tone : "neutral";
      return { label, value, tone };
    })
    .filter(Boolean);
}

const baseProjects = [
  {
    slug: "site",
    title: "This Site",
    summary:
      "An AWS Amplify-hosted personal site built to ship quickly, look polished and support real outreach through a production contact pipeline.",
    status: "live",
    tags: ["React", "Vite", "React Router", "Framer Motion", "AWS", "Amplify"],
    atGlance: {
      skills: [
        { label: "React", lane: "frontend" },
        { label: "Vite", lane: "frontend" },
        { label: "React Router", lane: "frontend" },
        { label: "Framer Motion", lane: "frontend" },
        { label: "AWS", lane: "cloud" },
        { label: "Amplify", lane: "cloud" },
      ],
      metrics: [
        { label: "Hosting", value: "Live on AWS Amplify", tone: "info" },
        { label: "Contact API", value: "Production contact API", tone: "success" },
        { label: "Phase", value: "Ongoing iteration", tone: "neutral" },
      ],
    },
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
          "The goal was to launch a clean site that feels intentional, presents work clearly and gives visitors a direct way to start a conversation.",
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
          "Route-based pages for Home, Projects, Background, and Contact.",
          "Reusable animation variants for page and card entry.",
        ],
      },
      {
        heading: "UI System Decisions",
        body:
          "The visual direction uses a glass-style panel system over a layered radial background. Core spacing, borders and color tokens are centralized in one stylesheet for consistency.",
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
          "Integrated challenge development into the broader background and projects narrative.",
          "Used the feature as a proving ground for iterative UX and frontend implementation decisions.",
          "Mobile use case developed.",
        ],
      },
      {
        heading: "Contact Pipeline Architecture",
        body:
          "Contact submissions flow from the frontend to API Gateway, then into a Lambda function that sends mail through SES with validation and response handling.",
        bullets: [
          "Frontend posts JSON payloads from the Contact page.",
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
          "More interactive features are scoped.",
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
    slug: "cabbie-ios",
    title: "Cabbie Quiz (iOS)",
    summary:
      "An iOS trivia app that blends LLM-generated local knowledge with quiz UX.",
    status: "in-progress",
    tags: ["Swift", "SwiftUI", "MVVM", "JSON Decoding", "iOS", "LLM Integration"],
    atGlance: {
      skills: [
        { label: "Swift", lane: "frontend" },
        { label: "SwiftUI", lane: "frontend" },
        { label: "JSON Decoding", lane: "data" },
        { label: "UI State Control", lane: "frontend" },
        { label: "LLM Integration", lane: "ai" },
      ],
      metrics: [
        { label: "Platform", value: "iOS (SwiftUI)", tone: "info" },
        { label: "Current Cities", value: "LA deployed, multiple cities scaffolded", tone: "neutral" },
        { label: "Question Source", value: "JSON output of LLM generated daily quizes; live API deployed", tone: "success" },
      ],
    },
    template: "case-study",
    meta: {
      timeline: "Current build phase",
      role: "iOS Engineer (UI + App Flow)",
      stack:
        "Swift, SwiftUI, ObservableObject, @Published, JSON decoding, API integration design",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "Cabbie Quiz is an iOS quiz app focused on city-specific learning, designed to turn local knowledge into a fast, interactive game loop.",
        bullets: [
          "Project name: Cabbie Quiz (iOS).",
          "Value statement: An iOS city-trivia app that blends LLM-generated local knowledge with quiz UX.",
          "Platform: iOS (SwiftUI architecture).",
        ],
      },
      {
        heading: "Purpose of the Application",
        body:
          "The app solves the problem of making city-specific learning engaging by packaging local facts into short trivia rounds.",
        bullets: [
          "Users learn city context through quick quiz interaction rather than static reading.",
          "A city-category model scopes question sets by selected location.",
          "Question delivery is designed to be dynamic so each city can receive refreshed content over time.",
        ],
      },
      {
        heading: "How It Works",
        body:
          "The user flow follows a clear quiz lifecycle from city choice to completion and replay.",
        bullets: [
          "City selection -> choose a location context for the round.",
          "Question retrieval and formatting -> decode prompt, answer, and decoys into UI-ready options.",
          "Answer selection -> user picks one option with submit gating to prevent invalid state.",
          "Scoring and progress -> track score and question index across the session.",
          "Completion and restart -> show final result and allow replay from the start.",
          "Current implementation status: Los Angeles flow is implemented; Austin and Baltimore scaffolds are present.",
        ],
      },
      {
        heading: "Skills Used",
        body:
          "The implementation demonstrates iOS app architecture, data modeling, and UI state management with room for live backend integration.",
        bullets: [
          "Swift and SwiftUI for native interface and interaction design.",
          "MVVM-style state management using ObservableObject and @Published.",
          "JSON decoding and data modeling for question payload ingestion.",
          "UI state control for option selection, submit gating, and progress tracking.",
          "API and LLM integration concept with backend communication pipeline (collaborator-owned generation path).",
        ],
      },
      {
        heading: "Collaboration Breakdown",
        body:
          "Development responsibilities are split between iOS app execution and backend question generation services.",
        bullets: [
          "My role: iOS UI, quiz flow state management, scoring/progress logic, and overall app structure.",
          "Collaborator role: backend API communication and LLM-backed question generation for current local quiz data.",
        ],
      },
      {
        heading: "What Makes It Impressive",
        body:
          "The project combines applied AI content generation with a production-minded mobile interaction loop.",
        bullets: [
          "Pairs AI-assisted question generation with a polished quiz UX on iOS.",
          "Shows end-to-end thinking from backend data contract to view model and interactive UI.",
          "Uses an expandable multi-city architecture with a direct path to productionization.",
        ],
      },
      {
        heading: "Roadmap / Next Iteration",
        body:
          "The next phase moves from scaffolded prototype behavior into production-grade reliability and scale.",
        bullets: [
          "Activate Austin and Baltimore quiz pipelines.",
          "Replace static JSON stubs with live API responses.",
          "Add real tests across unit and UI layers.",
          "Add content validation and fallback rules for malformed LLM output.",
        ],
      },
      {
        heading: "Important Public APIs / Interfaces / Types",
        body:
          "The backend-to-app contract and app-side mapping are intentionally explicit to reduce integration ambiguity.",
        bullets: [
          "Backend question contract: question: String.",
          "Backend question contract: decoys: [String].",
          "Backend question contract: answer: String.",
          "App-side mapped decode type: JSONQuestion from backend payload.",
          "View-consumption model: question object with shuffled options via newOptions.",
        ],
      },
    ],
    highlights: [
      "Designed and implemented a native iOS trivia loop with structured state transitions.",
      "Modeled a clean backend question contract that can scale across cities.",
      "Integrated architecture choices that support LLM-generated content safely over time.",
      "Built with clear ownership boundaries across iOS and backend collaboration.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
    ],
  },
  {
    slug: "lead-generation",
    title: "Automated Lead Generation",
    summary:
      "Automated an SDR territory workflow by turning one filtered search URL into a qualified non-PRO lead list with contact details and Active Listings counts for AE demo pipeline handoff.",
    status: "live",
    tags: ["Python", "Data Pipeline", "Playwright", "Async Scraping", "Data Quality", "Automation"],
    atGlance: {
      skills: [
        { label: "Python", lane: "data" },
        { label: "Data Pipeline", lane: "data" },
        { label: "Playwright", lane: "automation" },
        { label: "Async Scraping", lane: "automation" },
        { label: "Data Quality", lane: "data" },
        { label: "Automation", lane: "automation" },
      ],
      metrics: [
        { label: "Territory", value: "Idaho SDR snapshot (1,243 assets parsed)", tone: "info" },
        {
          label: "Lead Rule",
          value: "Target non-PRO users with recently updated, high-activity listing profiles",
          tone: "neutral",
        },
        {
          label: "Output",
          value: "200 deduped non-PRO leads with contact data + Active Listings",
          tone: "success",
        },
        { label: "Coverage", value: "197 / 200 enriched (98.5%)", tone: "success" },
      ],
    },
    template: "case-study",
    meta: {
      timeline: "2026 (Idaho territory snapshot run)",
      role: "Data + Automation Engineer",
      stack: "Python, JSON, CSV, Playwright, Asyncio, Regex, Apify Actor output",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "This workflow improves how an SDR works a defined territory by converting manual profile-by-profile qualification into a repeatable pipeline from one search URL.",
        bullets: [
          "Support the SDR motion of booking demos that Account Executives close as PRO subscriptions.",
          "Apply explicit regular-user vs PRO-user targeting logic at scale.",
          "Return outreach-ready rows that preserve lead quality context for call prioritization.",
        ],
      },
      {
        heading: "Manual Baseline Process",
        body:
          "The original territory workflow was fully manual and required repetitive drill-down across assets, users, and profiles before a lead could even be scored.",
        bullets: [
          "Run a territory search and open assets one at a time.",
          "Check each asset's users to find non-PRO candidates.",
          "Open each user profile and inspect Active Listings to judge lead strength.",
          "Use recent listing activity + Active Listings volume as lead quality signals before outreach.",
        ],
      },
      {
        heading: "Automated Workflow and Qualification Logic",
        body:
          "I automated the flow so the SDR can provide the initial search URL and receive a targeted output of non-PRO users with contact info and Active Listings totals.",
        bullets: [
          "Parsed 1,243 Idaho assets and filtered records to enforce non-PRO targeting rules.",
          "Handled both single-broker and multi-broker assets while excluding rows that violate targeting criteria.",
          "Deduplicated broker profiles into one outreach-ready target set and enriched with Active Listings totals.",
          "Produced a clean handoff for SDR calling and AE demo conversion workflows.",
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
        heading: "Step-by-Step Timeline",
        body:
          "Execution moved from territory input through qualification logic, enrichment, and final SDR handoff output.",
        bullets: [
          "1. Started from the Idaho territory search export and validated extraction structure.",
          "2. Implemented business filters for non-PRO targeting across single- and multi-broker assets.",
          "3. Generated normalized broker profile URLs and deduplicated records by profile URL.",
          "4. Produced enrichment-ready broker CSV with stable contact and profile handoff fields.",
          "5. Implemented async Playwright workers to scrape Active Listings Total from broker profiles.",
          "6. Added layered fallbacks, request blocking, retries, and backoff for extraction stability.",
          "7. Delivered AE-ready SDR lead output with 197 / 200 enriched profiles (98.5%) and 3 rows marked N/A.",
        ],
      },
      {
        heading: "Results and Impact (One Territory Snapshot)",
        body:
          "This Idaho run shows how the automated qualification funnel compresses manual SDR research into a repeatable territory snapshot.",
        visual: {
          kind: "mermaid",
          markdown: idahoResultsFlow,
          caption: "Idaho territory funnel from raw assets to deduped outreach targets.",
        },
      },
      {
        heading: "What This Demonstrates",
        body:
          "The project demonstrates measurable process improvement, not just scraping output, by preserving lead quality intent while removing manual SDR bottlenecks.",
        bullets: [
          "Replaced multi-click manual qualification with one-input automated lead generation.",
          "Improved targeting precision by codifying non-PRO and lead-quality rules.",
          "Strengthened SDR-to-AE handoff with actionable contact + Active Listings context.",
          "Delivered repeatable territory snapshots for ongoing outreach planning.",
        ],
      },
    ],
    highlights: [
      "Replaced manual asset-user-profile qualification with a one-URL automated pipeline.",
      "Applied non-PRO targeting logic with lead-quality prioritization tied to recent activity and active inventory.",
      "Generated AE-ready SDR call targets with contact context and Active Listings totals.",
      "Produced 200 deduped broker targets from 1,243 Idaho assets with 98.5% enrichment coverage.",
      "Maintained a repeatable territory workflow for ongoing outreach execution and analysis.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
    ],
  },
  {
    slug: "rag-hr-chatbot",
    title: "RAG Chatbot",
    summary:
      "A Retrieval-Augmented Generation chatbot that answers Nestle HR policy questions with concise, policy-grounded responses while minimizing hallucinations.",
    status: "live",
    tags: ["RAG", "LangChain", "OpenAI", "FAISS", "Gradio"],
    atGlance: {
      skills: [
        { label: "RAG", lane: "ai" },
        { label: "LangChain", lane: "ai" },
        { label: "OpenAI", lane: "ai" },
        { label: "FAISS", lane: "ai" },
        { label: "Gradio", lane: "frontend" },
        { label: "GPT-4.1-nano", lane: "ai" },
      ],
      metrics: [
        { label: "Quality", value: "Policy-grounded answers", tone: "success" },
        { label: "Retrieval", value: "FAISS semantic retrieval", tone: "info" },
        { label: "Observability", value: "Latency/token/cost stats", tone: "neutral" },
      ],
    },
    template: "case-study",
    meta: {
      role: "LLM + Retrieval Engineer",
      stack:
        "Python, LangChain, OpenAI text-embedding-3-small, FAISS, GPT-4.1-nano, Gradio",
    },
    sections: [
      {
        heading: "Goal and Scope",
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
          "Response generation uses GPT-4.1-nano (efficient token usage) with a prompt that frames the assistant as Nestle's Human Resources Policy Assistant.",
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
  const tags = Array.isArray(project.tags) ? project.tags : [];
  const atGlance = project.atGlance || {};

  return {
    ...project,
    status: project.status || "planned",
    template: project.template || "case-study",
    tags,
    atGlance: {
      skills: normalizeAtGlanceSkills(atGlance.skills, tags),
      metrics: normalizeAtGlanceMetrics(atGlance.metrics),
    },
    sections: Array.isArray(project.sections) ? project.sections : [],
    highlights: Array.isArray(project.highlights) ? project.highlights : [],
    cta: Array.isArray(project.cta) ? project.cta : [],
  };
}

export const projects = baseProjects.map(normalizeProject);

export const projectCardList = projects.map(
  ({ slug, title, summary, status, tags, template, atGlance }) => ({
    slug,
    title,
    summary,
    status,
    tags,
    template,
    atGlance,
  })
);

export function getProjectBySlug(slug) {
  if (!slug) {
    return undefined;
  }

  return projects.find((project) => project.slug === slug);
}
