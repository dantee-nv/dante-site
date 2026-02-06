const baseProjects = [
  {
    slug: "dante-site",
    title: "This Site",
    summary:
      "A personal site built to ship quickly, look polished, and support real outreach through a production contact pipeline.",
    status: "live",
    tags: ["React", "Vite", "React Router", "Framer Motion", "AWS"],
    template: "case-study",
    meta: {
      timeline: "January 2026 - Ongoing",
      role: "Design + Frontend + Backend Integration",
      stack:
        "React, Vite, React Router, Framer Motion, AWS API Gateway, Lambda, SES, SAM",
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
          "Infrastructure is defined under the SAM template and deployed with AWS tooling. Frontend deployment is configured to consume the API output URL without hardcoding runtime secrets.",
        bullets: [
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
          "Expand project metadata and comparison-friendly structure.",
          "Continue improving content depth while keeping performance tight.",
        ],
      },
    ],
    highlights: [
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
    title: "Project 2",
    summary:
      "Planned build focused on automation and workflow leverage. This page is a live placeholder while scope is finalized.",
    status: "in-progress",
    tags: ["Automation", "Planning"],
    template: "stub",
    sections: [
      {
        heading: "Planned Scope",
        body:
          "This project will focus on reducing repetitive work with a practical operator-first workflow.",
        bullets: [
          "Define end-to-end user flow and constraints.",
          "Ship an initial version with measurable time savings.",
          "Document rollout and improvement checkpoints.",
        ],
      },
    ],
  },
  {
    slug: "project-3",
    title: "Project 3",
    summary:
      "Planned experiment in progress. The detail page is live now and will be expanded as implementation begins.",
    status: "planned",
    tags: ["Experiment", "Product Development"],
    template: "stub",
    sections: [
      {
        heading: "Expected Direction",
        body:
          "This project is reserved for the next product experiment and will include a full case study once development starts.",
        bullets: [
          "Capture the problem statement and success metrics.",
          "Prototype quickly and validate with small iterations.",
          "Promote to a full case-study format after first release.",
        ],
      },
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
