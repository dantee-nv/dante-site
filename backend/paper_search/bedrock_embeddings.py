import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import boto3
except ImportError:  # pragma: no cover
    boto3 = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class BedrockEmbeddingClient:
    def __init__(self, region_name: str, model_id: str):
        if boto3 is None:
            raise RuntimeError("boto3 is required for Bedrock invocation.")

        self._client = boto3.client("bedrock-runtime", region_name=region_name)
        self._model_id = model_id

    def embed_text(self, text: str, normalize: bool = True) -> list[float]:
        body = {
            "inputText": text,
            "normalize": bool(normalize),
        }

        response = self._client.invoke_model(
            modelId=self._model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )

        payload = json.loads(response["body"].read())
        embedding = payload.get("embedding")

        if embedding is None and isinstance(payload.get("embeddings"), list):
            embeddings = payload.get("embeddings")
            if embeddings:
                embedding = embeddings[0]

        if not isinstance(embedding, list) or not embedding:
            raise RuntimeError("Bedrock embedding response did not include a valid vector.")

        return [float(value) for value in embedding]

    def embed_texts_indexed(
        self,
        indexed_texts: list[tuple[int, str]],
        max_workers: int,
        normalize: bool = True,
    ) -> dict[int, list[float]]:
        if not indexed_texts:
            return {}

        safe_workers = max(1, min(max_workers, len(indexed_texts)))
        results: dict[int, list[float]] = {}

        with ThreadPoolExecutor(max_workers=safe_workers) as executor:
            futures = {
                executor.submit(self.embed_text, text, normalize): index
                for index, text in indexed_texts
            }

            for future in as_completed(futures):
                index = futures[future]
                try:
                    results[index] = future.result()
                except Exception as error:  # noqa: BLE001
                    logger.warning(
                        "paper_embedding_failed candidate_index=%s error_type=%s",
                        index,
                        type(error).__name__,
                    )

        return results
