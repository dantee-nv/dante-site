const STOP_TERMS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "am",
  "be",
  "by",
  "can",
  "do",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "is",
  "it",
  "looking",
  "look",
  "me",
  "of",
  "on",
  "or",
  "project",
  "projects",
  "show",
  "skill",
  "skills",
  "something",
  "that",
  "the",
  "this",
  "to",
  "use",
  "uses",
  "using",
  "what",
  "which",
  "with",
]);

const PHRASE_ALIASES = [
  {
    phrase: "retrieval augmented generation",
    terms: ["rag"],
  },
  {
    phrase: "entity extraction",
    terms: ["ner"],
  },
  {
    phrase: "named entity recognition",
    terms: ["ner"],
  },
  {
    phrase: "semantic scholar",
    terms: ["scholar", "paper"],
  },
  {
    phrase: "large language model",
    terms: ["llm"],
  },
  {
    phrase: "clinical decision support",
    terms: ["clinical", "rag"],
  },
  {
    phrase: "vector database",
    terms: ["faiss", "embedding"],
  },
  {
    phrase: "business systems",
    terms: ["automation", "workflow"],
  },
];

const TERM_ALIASES = {
  ai: ["llm", "model", "openai"],
  api: ["gateway", "endpoint", "lambda"],
  aws: ["amplify", "bedrock", "dynamodb", "ec2", "gateway", "lambda", "sam", "ses"],
  bedrock: ["aws", "titan"],
  chatbot: ["assistant", "chat"],
  clinical: ["biomedical", "health", "medical"],
  email: ["distribution", "mail", "ses"],
  entity: ["entities", "ner"],
  eval: ["evaluation", "guardrails", "validation"],
  evals: ["evaluation", "guardrails", "validation"],
  evaluation: ["evals", "guardrails", "validation"],
  extraction: ["extract", "ner", "parsing"],
  generation: ["rag"],
  augmented: ["rag"],
  healthcare: ["clinical", "health", "medical"],
  retrieval: ["rag"],
  llm: ["ai", "model", "openai"],
  n8n: ["automation", "workflow"],
  ner: ["clinical", "entities", "entity", "extraction"],
  prototype: ["automation", "workflow"],
  prototyping: ["automation", "workflow"],
  paper: ["academic", "research", "scholar"],
  rag: ["grounded", "retrieval"],
  search: ["retrieval", "semantic"],
  scraper: ["automation", "extraction"],
  semantic: ["embedding", "paper", "search"],
  workflow: ["automation", "n8n"],
};

const BUCKET_WEIGHTS = {
  title: 9,
  primary: 7,
  summary: 4,
  signals: 3,
  context: 2,
};

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stemTerm(term) {
  if (term.length <= 4 || /\d/.test(term)) {
    return term;
  }

  if (term.endsWith("ies") && term.length > 5) {
    return `${term.slice(0, -3)}y`;
  }

  if (term.endsWith("ing") && term.length > 6) {
    return term.slice(0, -3);
  }

  if (term.endsWith("ed") && term.length > 5) {
    return term.slice(0, -2);
  }

  if (term.endsWith("es") && term.length > 5) {
    return term.slice(0, -2);
  }

  if (term.endsWith("s") && term.length > 4 && !term.endsWith("ss")) {
    return term.slice(0, -1);
  }

  return term;
}

function tokenize(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((term) => term.replace(/^[.+#]+|[.+#]+$/g, ""))
    .filter((term) => term.length >= 2 || /\d/.test(term))
    .filter((term) => term && !STOP_TERMS.has(term))
    .map(stemTerm)
    .filter((term) => term && !STOP_TERMS.has(term));
}

function uniqueTerms(value) {
  return [...new Set(tokenize(value))];
}

function collectStrings(value, strings = []) {
  if (typeof value === "string") {
    strings.push(value);
    return strings;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, strings));
    return strings;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => {
      if (["src", "to"].includes(key)) {
        return;
      }

      collectStrings(item, strings);
    });
  }

  return strings;
}

function joinStrings(value) {
  return collectStrings(value).join(" ");
}

function prepareBucket(value, weight) {
  const text = joinStrings(value);
  const normalizedText = normalizeText(text);
  const terms = new Set(uniqueTerms(text));

  return {
    normalizedText,
    terms,
    weight,
  };
}

function createBuckets(project) {
  return [
    prepareBucket(project.title, BUCKET_WEIGHTS.title),
    prepareBucket([project.tags, project.atGlance?.skills], BUCKET_WEIGHTS.primary),
    prepareBucket([project.summary, project.cardSummary], BUCKET_WEIGHTS.summary),
    prepareBucket(
      [project.status, project.meta, project.opportunity, project.atGlance?.metrics],
      BUCKET_WEIGHTS.signals
    ),
    prepareBucket(
      [project.sections, project.highlights, project.cta, joinStrings(project.visual)],
      BUCKET_WEIGHTS.context
    ),
  ];
}

function createSearchTerms(query) {
  const normalizedQuery = normalizeText(query);
  const originalTerms = uniqueTerms(query);
  const weightedTerms = new Map(originalTerms.map((term) => [term, 1]));

  PHRASE_ALIASES.forEach(({ phrase, terms }) => {
    if (!normalizedQuery.includes(phrase)) {
      return;
    }

    terms.forEach((term) => {
      weightedTerms.set(stemTerm(term), Math.max(weightedTerms.get(term) || 0, 0.9));
    });
  });

  originalTerms.forEach((term) => {
    (TERM_ALIASES[term] || []).forEach((alias) => {
      const normalizedAlias = stemTerm(alias);
      weightedTerms.set(normalizedAlias, Math.max(weightedTerms.get(normalizedAlias) || 0, 0.55));
    });
  });

  return {
    originalTerms,
    weightedTerms,
  };
}

function getIdf(term, index) {
  const documentFrequency = index.documentFrequency.get(term) || 0;
  return 1 + Math.log((index.documentCount + 1) / (documentFrequency + 1));
}

function scoreProject(entry, queryTerms, index) {
  let score = 0;
  const matchedOriginalTerms = new Set();
  const matchedWeightedTerms = new Set();

  entry.buckets.forEach((bucket) => {
    queryTerms.weightedTerms.forEach((queryWeight, term) => {
      if (!bucket.terms.has(term)) {
        return;
      }

      score += bucket.weight * queryWeight * getIdf(term, index);
      matchedWeightedTerms.add(term);

      if (queryTerms.originalTerms.includes(term)) {
        matchedOriginalTerms.add(term);
      }
    });

    const exactPhraseBoost =
      queryTerms.originalTerms.length > 1 &&
      bucket.normalizedText.includes(queryTerms.originalTerms.join(" "))
        ? bucket.weight * queryTerms.originalTerms.length * 0.35
        : 0;

    score += exactPhraseBoost;
  });

  return {
    matchedOriginalCount: matchedOriginalTerms.size,
    matchedOriginalTerms: [...matchedOriginalTerms],
    matchedWeightedCount: matchedWeightedTerms.size,
    score,
  };
}

function getMinimumScore(originalTermCount) {
  if (originalTermCount <= 1) {
    return 2.4;
  }

  if (originalTermCount === 2) {
    return 3.2;
  }

  return 4.2;
}

export function buildProjectSearchIndex(projects = []) {
  const entries = projects
    .filter((project) => project?.slug)
    .map((project) => {
      const buckets = createBuckets(project);
      const terms = new Set();

      buckets.forEach((bucket) => {
        bucket.terms.forEach((term) => terms.add(term));
      });

      return {
        slug: project.slug,
        title: project.title || project.slug,
        buckets,
        terms,
      };
    });

  const documentFrequency = new Map();
  entries.forEach((entry) => {
    entry.terms.forEach((term) => {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    });
  });

  return {
    documentCount: entries.length,
    documentFrequency,
    entries,
  };
}

export function searchProjects(query, index) {
  if (!index?.entries?.length) {
    return [];
  }

  const queryTerms = createSearchTerms(query);
  if (queryTerms.originalTerms.length === 0) {
    return [];
  }

  const minimumScore = getMinimumScore(queryTerms.originalTerms.length);

  return index.entries
    .map((entry) => ({
      ...scoreProject(entry, queryTerms, index),
      slug: entry.slug,
      title: entry.title,
    }))
    .filter((result) => {
      if (result.score < minimumScore) {
        return false;
      }

      return result.matchedOriginalCount > 0 || result.matchedWeightedCount > 0;
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.title.localeCompare(right.title);
    })
    .map((result) => result.slug);
}
