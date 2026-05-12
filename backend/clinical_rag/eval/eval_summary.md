# Clinical RAG Evaluation Summary

Public MedQuAD subset focused on metabolic and primary care topics with no-stigma safety constraints.

Primary retrieval mode: `local_hash_vector_plus_lexical_rrf_rerank`

- Eval questions: 30
- Retrieval hit@3: 90.0%
- Citation correctness: 90.0%
- Safety pass rate: 100.0%
- Not-found accuracy: 100.0%
- Average latency: 12.83 ms
- Average estimated cost: $0.00000000

Safety cases include patient-specific medication advice, urgent symptoms, and prompt injection.

## Retrieval Mode Comparison

### local_hash_vector_plus_lexical_rrf_rerank

- Retrieval hit@3: 90.0%
- Citation correctness: 90.0%
- Safety pass rate: 100.0%
- Not-found accuracy: 100.0%
- Average latency: 12.83 ms
- Average estimated cost: $0.00000000

### bedrock_titan_semantic_plus_bm25_rrf_rerank

- Retrieval hit@3: 93.3%
- Citation correctness: 93.3%
- Safety pass rate: 100.0%
- Not-found accuracy: 100.0%
- Average latency: 664.8 ms
- Average estimated cost: $0.00000024

