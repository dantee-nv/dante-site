import idahoResultsFlow from "../content/lead-generation/idaho-results-impact.mmd?raw";
import paperSearchArchitectureFlow from "../content/research-paper-search/architecture.mmd?raw";

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
    cardSummary:
      "AWS Amplify-hosted portfolio with polished React UX and a production contact pipeline.",
    status: "live",
    tags: [],
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
          "Route-based pages for Home, Projects, Background and Contact.",
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
          "Backend validates input, rate-limits and returns user-safe responses.",
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
          "City selection chooses a location context for the round.",
          "Question retrieval and formatting decodes prompts, answers and decoys into UI-ready options.",
          "User picks one option with submit gating to prevent invalid state.",
          "Score and question index is tracked across the session.",
          "Final results are highlighted and replay option is available.",
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
          "UI state control for option selection, submit gating and progress tracking.",
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
          "Activate other city quiz pipelines.",
          "Add real tests across unit and UI layers.",
          "Add content validation and fallback rules for malformed LLM output.",
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
      "Automated sales territory workflows by scraping qualified non-paid user lists from an initial unfiltered searches.",
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
        { label: "Coverage", value: "197 / 200 enriched (98.5%); 3 true N/A rows", tone: "success" },
      ],
    },
    template: "case-study",
    meta: {
      timeline: "2026",
      role: "Data + Automation Engineer",
      stack: "Python, JSON, CSV, Playwright, Asyncio, Regex, Apify Actor output",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "This workflow improves how a Sales Development Representative (SDR) works a defined territory by converting manual profile-by-profile qualification into a repeatable pipeline from one search URL.",
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
          "Parsed 1,243 assets and filtered records to enforce non-PRO targeting rules.",
          "Handled both single-user and multi-user assets while excluding rows that violate targeting criteria.",
          "Deduplicated user profiles into one outreach-ready target set and enriched with Active Listings totals.",
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
          "Running this on the Idaho territory moved through five stages from raw assets to outreach-ready user records.",
        bullets: [
          "Start with one unfiltered Idaho territory export (1,243 assets).",
          "Apply non-PRO rules across single-user and multi-user assets.",
          "Normalize user profile links and deduplicate to unique user targets.",
          "Enrich user records with contact fields and Active Listings totals.",
          "Run reliability checks and output 200 rows: 197 enriched and 3 true N/A rows.",
        ],
      },
      {
        heading: "Results and Impact (One Territory Snapshot)",
        body:
          "Running this on the Idaho territory shows how the automated qualification funnel compresses manual SDR research into a repeatable territory snapshot.",
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
      "Produced 200 deduped user targets from 1,243 Idaho assets with 98.5% enrichment coverage.",
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
      "A document-agnostic Retrieval-Augmented Generation system that grounds answers in approved source material; the live demo showcases a Nestle HR policy PDF.",
    status: "live",
    tags: [
      "RAG",
      "Python",
      "LangChain",
      "OpenAI",
      "FAISS",
      "React",
      "AWS Lambda",
      "API Gateway",
      "DynamoDB",
    ],
    atGlance: {
      skills: [
        { label: "RAG", lane: "ai" },
        { label: "Python", lane: "backend" },
        { label: "LangChain", lane: "ai" },
        { label: "OpenAI", lane: "ai" },
        { label: "FAISS", lane: "ai" },
        { label: "React", lane: "frontend" },
        { label: "AWS Lambda", lane: "cloud" },
        { label: "API Gateway", lane: "cloud" },
        { label: "DynamoDB", lane: "cloud" },
        { label: "Prompt Guardrails", lane: "ai" },
        { label: "GPT-4.1-nano", lane: "ai" },
      ],
      metrics: [
        { label: "Demo Corpus", value: "Nestle HR policy PDF (live demo)", tone: "info" },
        { label: "Deployment", value: "API Gateway + Python Lambda", tone: "success" },
        {
          label: "Feedback Loop",
          value: "Helpful/not helpful feedback stored in DynamoDB",
          tone: "neutral",
        },
      ],
    },
    template: "case-study",
    meta: {
      role: "AI Engineer",
      stack:
        "Python, LangChain text splitters, OpenAI text-embedding-3-small, FAISS, GPT-4.1-nano, React, AWS Lambda, API Gateway, DynamoDB, SAM",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "This project implements a reusable RAG architecture that can be applied to any approved document set. The live demo showcases the same system against a Nestle HR policy PDF.",
        bullets: [
          "Design a document-agnostic retrieval + generation workflow that can be reused across domains.",
          "Keep answers concise, grounded in retrieved context, and explicit when information is not found.",
          "Demonstrate the implementation with Nestle HR policy questions in a public live demo.",
        ],
      },
      {
        heading: "Technical Overview",
        body:
          "The ingestion and retrieval pipeline is built so source documents can be swapped without changing the frontend flow. PDFs and text inputs are chunked, embedded, indexed and retrieved through a hybrid search strategy before answer generation.",
        bullets: [
          "Policy content is split into retrieval-ready chunks using tighter chunking tuned for a lightweight model (smaller chunks + overlap).",
          "Chunks are embedded with OpenAI `text-embedding-3-small` and indexed in FAISS.",
          "Questions retrieve context through hybrid ranking: semantic vector similarity plus lexical matching fused with reciprocal rank fusion.",
          "Top retrieved chunks are page-aware, so answer context includes source page markers for better grounding and citations.",
        ],
      },
      {
        heading: "Model and Prompting Strategy",
        body:
          "Generation uses GPT-4.1-nano with explicit guardrails designed for lightweight-model reliability, keeping outputs grounded, concise and constrained to approved policy context.",
        bullets: [
          "Prompt instructions explicitly call out lightweight-model limitations and prohibit speculative multi-step inference.",
          "Responses are constrained to one or two short sentences and must stay within retrieved policy context.",
          "When context is available, responses are expected to include page citations to improve traceability.",
          "If relevant context is missing, the assistant returns a fixed not-found policy message rather than guessing.",
          "Policy assistant constraints explicitly disallow legal-advice style outputs.",
        ],
      },
      {
        heading: "Cloud API and Feedback Loop",
        body:
          "The solution is deployed as serverless APIs so it is production-ready and observable. Answer generation and user feedback are separated for clear responsibilities.",
        bullets: [
          "Question requests flow through API Gateway to a Python Lambda RAG handler.",
          "Responses return answer content plus latency, token usage and estimated cost.",
          "Feedback submissions flow to a dedicated Lambda and persist into DynamoDB.",
          "Structured feedback records include helpful flag, optional note and request context metadata.",
        ],
      },
      {
        heading: "Live Demo Experience (Nestle HR)",
        body:
          "The project detail page includes a live, in-browser demo that uses the Nestle HR policy document as its showcase corpus.",
        bullets: [
          "Users can download the exact Nestle HR policy PDF used for the showcase demo.",
          "Users can ask policy questions and receive concise policy-grounded answers.",
          "Users can submit helpful/not helpful feedback with optional notes after each answer.",
          "The same UX pattern can point to different document collections without redesigning the interface.",
        ],
      },
      {
        heading: "Outcome and Reuse Potential",
        body:
          "This implementation now acts as a reusable RAG foundation that can be adapted to policy, handbook, operations or compliance documents while keeping retrieval and feedback loops intact.",
        bullets: [
          "Delivered a practical blueprint for deploying document-grounded assistants on AWS serverless infrastructure.",
          "Combined retrieval accuracy controls with user feedback capture for ongoing quality improvement.",
          "Preserved fast UX with cost and token visibility for transparent operation.",
        ],
      },
    ],
    highlights: [
      "Built a document-agnostic RAG architecture with Nestle HR as the live-demo corpus.",
      "Implemented a serverless answer API and separate feedback API on AWS Lambda + API Gateway.",
      "Added DynamoDB-backed feedback storage for helpful/not helpful signals and notes.",
      "Improved retrieval quality with tighter chunking and hybrid vector + lexical ranking.",
      "Delivered a React live demo with downloadable source document and answer observability stats.",
      "Designed the system to be portable across new document sets with minimal integration changes.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
    ],
  },
  {
    slug: "semantic-paper-search-bedrock",
    title: "Context-Based Research Paper Search",
    summary:
      "A semantic paper search demo that fetches keyword candidates from Semantic Scholar, reranks with Bedrock Titan embeddings, and returns the top 10 papers with relevance scores.",
    cardSummary:
      "Semantic Scholar candidate fetch + Bedrock embedding rerank + DynamoDB embedding cache in a live web demo.",
    status: "live",
    tags: [
      "React",
      "Python",
      "AWS Lambda",
      "API Gateway",
      "Amazon Bedrock",
      "Semantic Scholar API",
      "DynamoDB",
      "SAM",
    ],
    atGlance: {
      skills: [
        { label: "Context Retrieval UX", lane: "frontend" },
        { label: "Python Lambda API", lane: "backend" },
        { label: "Bedrock Embeddings", lane: "ai" },
        { label: "Semantic Reranking", lane: "ai" },
        { label: "DynamoDB Cache", lane: "cloud" },
        { label: "AWS SAM IaC", lane: "cloud" },
      ],
      metrics: [
        { label: "Candidate Pool", value: "Up to 100 papers/query", tone: "info" },
        { label: "Returned Results", value: "Top 10 semantic matches", tone: "success" },
        { label: "Cache Strategy", value: "Paper embeddings cached with TTL", tone: "neutral" },
      ],
    },
    template: "case-study",
    meta: {
      timeline: "2026",
      role: "AI + Cloud Engineer",
      stack:
        "React, Python, AWS Lambda, API Gateway (HTTP API), Amazon Bedrock Titan Text Embeddings v2, Semantic Scholar API, DynamoDB, SAM",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "This demo is built for context-first literature discovery. Users can paste notes, an abstract, or a research question and receive the top semantically relevant papers in one response.",
        bullets: [
          "Use Semantic Scholar as a candidate source only, because candidate retrieval is mostly keyword-oriented.",
          "Apply Bedrock Titan embeddings to rerank candidates against full user context for semantic relevance.",
          "Return practical metadata for each result: title, authors, year, venue, link, abstract snippet, and relevance score.",
        ],
      },
      {
        heading: "Architecture",
        body:
          "The stack keeps the frontend static while centralizing data fetch, reranking, caching, and safeguards in one serverless backend.",
        visual: {
          kind: "mermaid",
          markdown: paperSearchArchitectureFlow,
          caption:
            "High-level vertical flow with parallel candidate fetch, embedding, and cache steps converging into reranking and top-10 response.",
        },
        bullets: [
          "Frontend is hosted in the existing Amplify site and calls one POST /search endpoint.",
          "Lambda fetches up to 100 candidate papers from Semantic Scholar.",
          "The same Bedrock embedding model is used for query context and candidate paper vectors.",
          "DynamoDB caches paper embeddings so reranking can reuse vectors instead of recomputing them on every request.",
        ],
      },
      {
        heading: "Search and Rerank Flow",
        body:
          "Each request validates input, enforces rate limits, and runs semantic ranking over cached or newly generated embeddings.",
        bullets: [
          "Input validation requires context and enforces an 8000-character cap.",
          "Per-IP per-minute request limits are enforced with atomic DynamoDB counters.",
          "Candidate paper embedding cache keys are tied to paperId and content hash to prevent stale vectors.",
          "When cache hits exist, Lambda reuses stored vectors; when cache misses occur, only missing vectors are embedded and written back.",
          "Cosine similarity drives ranking and top 10 result selection.",
          "The API returns request metadata including candidates fetched, cache hits, request ID, and latency.",
        ],
      },
      {
        heading: "Caching Strategy and Lifecycle",
        body:
          "Caching focuses on the expensive step: embedding candidate papers. This keeps semantic quality stable while reducing repeat-query cost and latency.",
        bullets: [
          "Cache table: `PaperEmbeddings` with `paperId` as primary key plus stored vector, contentHash, updatedAt, and TTL.",
          "Cache validity: if `paperId` exists and `contentHash(title + abstract)` matches, the vector is reused immediately.",
          "Cache refresh: if title or abstract changes, contentHash mismatch triggers re-embedding and an in-place cache overwrite.",
          "TTL policy: embeddings expire automatically (30-day default), so old vectors are cleaned up without manual jobs.",
          "Observed behavior: first run is cache-cold and slower; follow-up queries show high `cachedEmbeddingsUsed` and faster response times.",
        ],
      },
      {
        heading: "Operational Guardrails",
        body:
          "The backend includes practical controls for external API pressure and predictable behavior under load.",
        bullets: [
          "Circuit breaker opens on repeated Semantic Scholar throttling or server errors and fails fast until recovery.",
          "Lambda timeout and bounded embedding concurrency keep requests within expected runtime windows.",
          "CloudWatch logs capture request IDs, latencies, candidate counts, and cache-hit behavior.",
          "Semantic Scholar API key support is optional; unauthenticated mode remains the default fallback.",
        ],
      },
      {
        heading: "Live Rollout and Debugging Learnings",
        body:
          "Deployment and testing surfaced concrete reliability behavior that now informs optimization priorities.",
        bullets: [
          "Initial unauthenticated runs triggered upstream rate limits and exercised the circuit-breaker fallback path.",
          "Post-deploy verification confirmed the API key was missing, then confirmed fixed once environment value was populated.",
          "Warm-cache behavior was validated in production: first run performed cold embedding writes, repeat run showed high cache reuse and lower latency.",
          "Current next steps are query-quality tuning, adaptive candidate windowing, and UI-side retry guidance for transient upstream throttling.",
        ],
      },
    ],
    highlights: [
      "Implemented context-based ranking on top of keyword candidate retrieval.",
      "Shipped Bedrock embedding rerank and DynamoDB embedding cache in a single API endpoint.",
      "Added request-level controls: payload caps, IP rate limiting, and upstream circuit breaker handling.",
      "Integrated a live frontend demo into the project detail experience.",
    ],
    cta: [
      { label: "Back to Projects", to: "/projects" },
      { label: "Contact Me", to: "/contact" },
    ],
  },
  {
    slug: "amc-imax-scraper-n8n-automation",
    title: "AMC IMAX Scraper to n8n Email Automation",
    summary:
      "An automation pipeline that captures IMAX-only showtimes for one Los Angeles AMC theater and delivers scheduled Pacific-time email summaries via n8n and AWS SES.",
    cardSummary:
      "IMAX-only AMC showtime scraper with n8n scheduling, SES email delivery and EC2-hosted workflow reliability.",
    status: "live",
    tags: [
      "Python",
      "Playwright",
      "Pytest",
      "Web Scraping",
      "n8n",
      "AWS SES",
      "AWS EC2",
      "Automation",
    ],
    atGlance: {
      skills: [
        { label: "Playwright Scraping", lane: "automation" },
        { label: "Data Normalization", lane: "data" },
        { label: "IMAX Filter Logic", lane: "data" },
        { label: "n8n Orchestration", lane: "automation" },
        { label: "AWS SES", lane: "cloud" },
        { label: "AWS EC2", lane: "cloud" },
        { label: "Pytest", lane: "backend" },
      ],
      metrics: [
        { label: "Theater Scope", value: "Single Los Angeles AMC theater", tone: "info" },
        { label: "Scan Modes", value: "Single date and rolling 30-day window", tone: "neutral" },
        { label: "Delivery", value: "Scheduled n8n emails via AWS SES with failure alerts", tone: "success" },
      ],
    },
    template: "case-study",
    meta: {
      timeline: "2026",
      role: "Automation + Data Engineer",
      stack:
        "Python, Playwright, Pytest, JSON-LD parsing, DOM/network extraction, timezone conversion, n8n, AWS SES, AWS EC2",
    },
    sections: [
      {
        heading: "Goal and Scope",
        body:
          "The AMC mobile app and website only expose one day of showtimes at a time, which makes it hard to track IMAX availability across upcoming dates. This project was built to provide a broader IMAX view so I can plan around specific IMAX releases, which do not always align cleanly with standard theatrical listings.",
        bullets: [
          "In scope: one Los Angeles AMC theater, IMAX-only filtering, single-date and 30-day windows, Pacific-time output, n8n scheduling, SES delivery, and failure alerts.",
          "Primary objective: replace repetitive day-by-day manual checks with a reliable IMAX-specific schedule feed for both machine and human use.",
        ],
      },
      {
        heading: "Work Completed",
        body:
          "The scraper and automation path were hardened from extraction through delivery, with reliability and test coverage emphasized.",
        bullets: [
          "Built layered extraction fallback flow using JSON-LD, network-response parsing, and DOM strategies.",
          "Added date controls for one-date execution and rolling-window scans up to 30 days.",
          "Tightened IMAX attribution rules to remove false positives from non-IMAX showtimes.",
          "Implemented chronological normalization, deduplication, and human-readable Pacific-time console summaries.",
          "Validated 30-day scan mode and prepared n8n architecture for biweekly execution with results and admin alert branches.",
        ],
      },
      {
        heading: "Skills Used",
        body:
          "This project combines scraping reliability techniques with workflow automation and cloud email operations.",
        bullets: [
          "Dynamic web scraping using Playwright-based extraction and fallback strategy.",
          "Data parsing and normalization across JSON-LD, DOM, and network payload variants.",
          "Filtering logic engineering for explicit IMAX evidence and safe exclusion rules.",
          "Workflow orchestration in n8n with AWS SES email automation design.",
          "Deployment portability planning through private GitHub and EC2-hosted runtime.",
        ],
      },
      {
        heading: "n8n Automation Network on EC2",
        body:
          "The automation network is designed for EC2 hosting so schedules, credentials and alerting remain under controlled infrastructure.",
        visual: {
          kind: "image",
          src: "/projects/amc-n8n-workflow.png",
          alt:
            "n8n workflow with schedule trigger, scraper execution, success and failure email branches, plus signup webhook subscriber upsert flow.",
          caption:
            "Live n8n workflow: scheduled scraper execution with success/failure email branches and signup webhook subscriber upsert.",
        },
        bullets: [
          "Run n8n on EC2 as the orchestration layer for cadence, execution logging and workflow branching.",
          "Use scheduled trigger nodes for biweekly runs and optional ad-hoc backfill windows.",
          "Execute scraper jobs from n8n, parse JSON output and route success payloads to SES email delivery.",
          "Webhook-driven subscriber onboarding is built and in finalization for broader deployment, but public enrollment is held until SES delivery can move beyond verified-recipient-only mode.",
          "Maintain a separate admin-alert branch for failures, timeout conditions and empty-data anomalies.",
          "Keep secrets and environment configuration isolated on EC2 with predictable deployment and rollback paths.",
          "Support portability by storing code in private GitHub and promoting the same workflow design across environments.",
        ],
      },
      {
        heading: "Outcome and Highlights",
        body:
          "The final state is operations-ready and supports dependable recurring delivery without manual intervention.",
        bullets: [
          "Removed IMAX false positives by tightening format evidence rules.",
          "Output serves both machines (JSON for n8n) and humans (clean PST/PDT summary).",
          "Established a production path: scheduled runs, SES email delivery and failure escalation to admins.",
        ],
      },
    ],
    highlights: [
      "Delivered IMAX-only showtime extraction for a single Los Angeles AMC theater with layered fallback parsing.",
      "Eliminated non-IMAX contamination through stricter format evidence logic.",
      "Added single-date and rolling 30-day scan behavior with timezone-safe ordering and deduplication.",
      "Validated behavior through pytest coverage for filtering, windowing, sorting and summary output.",
      "Designed an EC2-hosted n8n automation network with biweekly scheduling, SES distribution and admin failure alerts.",
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
  ({ slug, title, summary, cardSummary, status, tags, template, atGlance }) => ({
    slug,
    title,
    summary: cardSummary || summary,
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
