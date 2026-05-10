import assert from "node:assert/strict";
import test from "node:test";

import { buildProjectSearchIndex, searchProjects } from "./projectSearch.js";

const fixtureProjects = [
  {
    slug: "rag-hr-chatbot",
    title: "RAG Chatbot",
    summary:
      "Reusable retrieval-augmented generation architecture for an HR policy assistant.",
    tags: ["RAG", "OpenAI", "API Gateway", "Python Lambda"],
    atGlance: {
      skills: [
        { label: "RAG", lane: "ai" },
        { label: "DynamoDB Feedback", lane: "cloud" },
      ],
      metrics: [{ label: "Demo", value: "Live browser demo", tone: "success" }],
    },
    meta: {
      stack: "OpenAI embeddings, Python Lambda, API Gateway, DynamoDB",
    },
    sections: [
      {
        heading: "Build",
        body:
          "The chatbot retrieves policy chunks, grounds answers in approved context, and stores feedback.",
      },
      {
        heading: "Quality",
        body:
          "The RAG pipeline uses chunking, embeddings, FAISS vector search, guardrails, and evaluation checks for safe clinical decision support.",
      },
    ],
    highlights: ["Built a document-agnostic RAG architecture."],
  },
  {
    slug: "amc-imax-scraper-n8n-automation",
    title: "AMC IMAX Scraper to n8n Email Automation",
    summary: "Scrapes AMC showtimes and sends a rolling IMAX watch email.",
    tags: ["n8n", "Email Automation", "SES"],
    atGlance: {
      skills: [
        { label: "n8n", lane: "automation" },
        { label: "Email Automation", lane: "automation" },
      ],
    },
    sections: [
      {
        heading: "Automation",
        body:
          "The workflow sends scheduled email updates through n8n and SES, moving a prototype into a repeatable business system.",
      },
    ],
  },
  {
    slug: "clinical-ner-finetune",
    title: "Clinical NER Fine-Tuning",
    summary:
      "Clinical entity extraction with biomedical NER data and a fine-tuned model.",
    tags: ["Clinical Dataset Curation", "PyTorch", "QLoRA"],
    atGlance: {
      skills: [{ label: "Clinical Entity Extraction", lane: "ai" }],
    },
    sections: [
      {
        heading: "Results",
        body:
          "The model extracts problems, treatments, and tests from medical notes for healthcare data processing.",
      },
    ],
  },
  {
    slug: "semantic-paper-search-bedrock",
    title: "Context-Based Research Paper Search",
    summary:
      "Semantic paper search using Amazon Bedrock Titan embeddings and reranking.",
    tags: ["Semantic Scholar", "Amazon Bedrock", "Paper Search"],
    atGlance: {
      skills: [{ label: "Bedrock Embeddings", lane: "ai" }],
    },
    sections: [
      {
        heading: "Retrieval",
        body:
          "Searches papers and ranks candidates against the user's context with cosine similarity, evaluation, and embedding cache behavior.",
      },
    ],
  },
  {
    slug: "coding-challenge-chatbot",
    title: "Coding Challenge Chatbot",
    summary: "An AWS-hosted chatbot for practicing coding interview prompts.",
    tags: ["Chatbot", "AWS Lambda", "API Gateway"],
    atGlance: {
      skills: [{ label: "AWS Lambda", lane: "cloud" }],
    },
    sections: [
      {
        heading: "Chat",
        body: "The app uses a Lambda API to support an interview practice chatbot.",
      },
    ],
  },
  {
    slug: "lead-generation",
    title: "Lead Generation Pipeline",
    summary: "Automated outreach list generation with scraping and data quality checks.",
    tags: ["Automation", "Lead Generation", "Scraping"],
    atGlance: {
      skills: [{ label: "Automation", lane: "automation" }],
    },
    sections: [
      {
        heading: "Pipeline",
        body:
          "The workflow turns raw search results into qualified sales leads, supports analytics, and produces product metrics.",
      },
    ],
  },
];

const index = buildProjectSearchIndex(fixtureProjects);

function assertIncludesAll(results, expectedSlugs) {
  expectedSlugs.forEach((slug) => {
    assert.ok(results.includes(slug), `Expected ${slug} in ${JSON.stringify(results)}`);
  });
}

function assertSameSlugs(results, expectedSlugs, message) {
  assert.deepEqual([...results].sort(), [...expectedSlugs].sort(), message);
}

test("matches the RAG project from direct RAG terms", () => {
  const results = searchProjects("rag aws chatbot", index);

  assert.equal(results[0], "rag-hr-chatbot");
  assert.ok(results.includes("coding-challenge-chatbot"));
  assert.ok(!results.includes("lead-generation"));
});

test("matches the RAG project from natural retrieval language", () => {
  const results = searchProjects("Which project uses retrieval augmented generation?", index);

  assert.ok(results.includes("rag-hr-chatbot"));
});

test("matches expected projects for skill and stack queries", () => {
  assert.equal(searchProjects("n8n email automation", index)[0], "amc-imax-scraper-n8n-automation");
  assert.equal(searchProjects("clinical entity extraction", index)[0], "clinical-ner-finetune");
  assert.equal(searchProjects("bedrock paper search", index)[0], "semantic-paper-search-bedrock");
});

test("matches AWS-related projects from natural skills phrasing", () => {
  const naturalResults = searchProjects("I am looking for something to do with AWS skills", index);
  const directResults = searchProjects("AWS skills", index);

  assert.ok(naturalResults.includes("rag-hr-chatbot"));
  assert.ok(naturalResults.includes("semantic-paper-search-bedrock"));
  assert.ok(naturalResults.includes("amc-imax-scraper-n8n-automation"));
  assert.ok(directResults.includes("rag-hr-chatbot"));
  assert.ok(directResults.includes("semantic-paper-search-bedrock"));
});

test("ignores empty and stop-word-only searches", () => {
  assert.deepEqual(searchProjects("", index), []);
  assert.deepEqual(searchProjects("which project is the", index), []);
});

test("matches Knownwell AI Product Engineer interviewer search prompts", () => {
  const knownwellCases = [
    {
      query: "clinical decision support RAG pipeline chunking embeddings vector database reranking evals",
      expected: ["rag-hr-chatbot", "semantic-paper-search-bedrock"],
    },
    {
      query: "clinical healthcare data extraction safe medical AI workflow",
      expected: ["clinical-ner-finetune"],
    },
    {
      query: "AWS AI infrastructure Lambda API Gateway DynamoDB Bedrock",
      expected: [
        "rag-hr-chatbot",
        "semantic-paper-search-bedrock",
        "coding-challenge-chatbot",
      ],
    },
    {
      query: "prompt guardrails model behavior evaluation safe failure modes",
      expected: ["rag-hr-chatbot"],
    },
  ];

  knownwellCases.forEach(({ query, expected }) => {
    assertIncludesAll(searchProjects(query, index), expected);
  });
});

test("matches Prompt Senior AI Engineer interviewer search prompts", () => {
  const promptCases = [
    {
      query: "rapid prototyping workflow automation business systems",
      expected: ["amc-imax-scraper-n8n-automation", "lead-generation"],
    },
    {
      query: "end to end AI systems Python AWS production ownership",
      expected: ["rag-hr-chatbot", "semantic-paper-search-bedrock", "coding-challenge-chatbot"],
    },
    {
      query: "LLM workflow evaluation measurement analytics",
      expected: ["semantic-paper-search-bedrock", "lead-generation"],
    },
    {
      query: "healthcare software data processing pipeline",
      expected: ["clinical-ner-finetune", "lead-generation"],
    },
  ];

  promptCases.forEach(({ query, expected }) => {
    assertIncludesAll(searchProjects(query, index), expected);
  });
});

test("matches suggested quick-search chips to the intended project strengths", () => {
  const quickSearchCases = [
    {
      label: "RAG",
      query: "rag langchain faiss approved source",
      expected: ["rag-hr-chatbot"],
    },
    {
      label: "AWS",
      query: "aws lambda api gateway dynamodb bedrock ses",
      expected: [
        "rag-hr-chatbot",
        "semantic-paper-search-bedrock",
        "coding-challenge-chatbot",
        "amc-imax-scraper-n8n-automation",
      ],
    },
    {
      label: "Healthcare",
      query: "problems treatments tests",
      expected: ["clinical-ner-finetune"],
    },
    {
      label: "AI",
      query: "llm openai embeddings model",
      expected: ["rag-hr-chatbot", "semantic-paper-search-bedrock", "clinical-ner-finetune"],
    },
    {
      label: "Full Stack",
      query: "react api lambda frontend backend",
      expected: ["rag-hr-chatbot", "coding-challenge-chatbot"],
    },
    {
      label: "Frontend",
      query: "react ux browser frontend",
      expected: ["rag-hr-chatbot"],
    },
    {
      label: "Backend",
      query: "python lambda api gateway dynamodb",
      expected: ["rag-hr-chatbot", "coding-challenge-chatbot"],
    },
    {
      label: "Evals + Guardrails",
      query: "guardrails grounded approved answers",
      expected: ["rag-hr-chatbot"],
    },
    {
      label: "Automation",
      query: "n8n email automation workflow",
      expected: ["amc-imax-scraper-n8n-automation", "lead-generation"],
    },
    {
      label: "Semantic Search",
      query: "titan reranking scholar",
      expected: ["semantic-paper-search-bedrock"],
    },
    {
      label: "Clinical NLP",
      query: "clinical entity extraction qlora biomedical ner",
      expected: ["clinical-ner-finetune"],
    },
    {
      label: "Data Pipelines",
      query: "scraping data pipeline playwright",
      expected: ["lead-generation", "amc-imax-scraper-n8n-automation", "clinical-ner-finetune"],
    },
  ];

  quickSearchCases.forEach(({ label, query, expected }) => {
    assertSameSlugs(searchProjects(query, index), expected, label);
  });
});
