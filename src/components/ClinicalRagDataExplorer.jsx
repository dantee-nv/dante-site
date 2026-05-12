import React, { useMemo, useState } from "react";

import curatedMedquadJsonl from "../../backend/clinical_rag/data/medquad_weight_inclusive_subset.jsonl?raw";

const PREVIEW_LIMIT = 12;
const ANSWER_PREVIEW_LENGTH = 260;

function parseJsonl(rawJsonl) {
  return rawJsonl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function getUniqueSortedValues(records, key) {
  return Array.from(new Set(records.map((record) => record[key]).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

function getRecordSearchText(record) {
  return [
    record.question,
    record.answer,
    record.questionFocus,
    record.questionType,
    record.source,
    record.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) {
    return text || "";
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

export default function ClinicalRagDataExplorer() {
  const records = useMemo(() => parseJsonl(curatedMedquadJsonl), []);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeQuestionId, setActiveQuestionId] = useState(records[0]?.questionId || "");

  const sourceOptions = useMemo(() => getUniqueSortedValues(records, "source"), [records]);
  const typeOptions = useMemo(() => getUniqueSortedValues(records, "questionType"), [records]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return records.filter((record) => {
      const sourceMatches = sourceFilter === "all" || record.source === sourceFilter;
      const typeMatches = typeFilter === "all" || record.questionType === typeFilter;
      const queryMatches =
        !normalizedQuery || getRecordSearchText(record).includes(normalizedQuery);

      return sourceMatches && typeMatches && queryMatches;
    });
  }, [query, records, sourceFilter, typeFilter]);

  const selectedRecord = useMemo(() => {
    return (
      filteredRecords.find((record) => record.questionId === activeQuestionId) ||
      filteredRecords[0] ||
      records[0]
    );
  }, [activeQuestionId, filteredRecords, records]);

  const previewRecords = filteredRecords.slice(0, PREVIEW_LIMIT);

  return (
    <section className="clinical-rag-data-explorer">
      <div className="clinical-rag-data-header">
        <div>
          <h4>Curated Data Explorer</h4>
          <p>
            Browse the JSONL corpus used by retrieval. The records come from public
            MedQuAD QA data and contain no PHI.
          </p>
        </div>
        <div className="clinical-rag-data-counts" aria-label="Clinical RAG data counts">
          <span>{records.length} records</span>
          <span>{filteredRecords.length} matching</span>
        </div>
      </div>

      <div className="clinical-rag-data-controls">
        <label htmlFor="clinical-rag-data-search">
          Search
          <input
            id="clinical-rag-data-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="diabetes, nutrition, hypertension"
          />
        </label>
        <label htmlFor="clinical-rag-data-source">
          Source
          <select
            id="clinical-rag-data-source"
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value)}
          >
            <option value="all">All sources</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="clinical-rag-data-type">
          Question Type
          <select
            id="clinical-rag-data-type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="clinical-rag-data-layout">
        <div className="clinical-rag-data-list" aria-label="Curated MedQuAD records">
          {previewRecords.length > 0 ? (
            previewRecords.map((record) => (
              <button
                key={record.questionId}
                type="button"
                className={`clinical-rag-data-row ${
                  selectedRecord?.questionId === record.questionId ? "selected" : ""
                }`}
                onClick={() => setActiveQuestionId(record.questionId)}
              >
                <span>{record.question}</span>
                <small>
                  {record.source} | {record.questionType || "unknown"} |{" "}
                  {record.questionFocus || "general"}
                </small>
              </button>
            ))
          ) : (
            <p className="clinical-rag-data-empty">No records match the current filters.</p>
          )}
        </div>

        {selectedRecord ? (
          <article className="clinical-rag-data-detail">
            <div className="clinical-rag-data-detail-meta">
              <span>{selectedRecord.source || "MedQuAD"}</span>
              <span>{selectedRecord.questionType || "unknown"}</span>
              <span>{selectedRecord.documentId || "no document id"}</span>
            </div>
            <h5>{selectedRecord.question}</h5>
            <p>{truncateText(selectedRecord.answer, ANSWER_PREVIEW_LENGTH)}</p>
            <dl>
              <div>
                <dt>Focus</dt>
                <dd>{selectedRecord.questionFocus || "N/A"}</dd>
              </div>
              <div>
                <dt>Question ID</dt>
                <dd>{selectedRecord.questionId || "N/A"}</dd>
              </div>
              <div>
                <dt>Source URL</dt>
                <dd>
                  {selectedRecord.sourceUrl ? (
                    <a href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">
                      Open public source
                    </a>
                  ) : (
                    "N/A"
                  )}
                </dd>
              </div>
            </dl>
          </article>
        ) : null}
      </div>
    </section>
  );
}
