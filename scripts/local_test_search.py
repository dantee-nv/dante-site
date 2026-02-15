#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request


DEFAULT_CONTEXT = (
    "Looking for recent papers on retrieval-augmented generation with hybrid search, "
    "embedding reranking, and production evaluation methods."
)


def run_request(api_url: str, context: str, k: int, timeout: int) -> dict:
    payload = json.dumps({"context": context, "k": k}).encode("utf-8")
    request = urllib.request.Request(
        api_url,
        method="POST",
        headers={"content-type": "application/json"},
        data=payload,
    )

    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a local/deployed paper search API test.")
    parser.add_argument("--api-url", required=True, help="Search endpoint URL.")
    parser.add_argument("--context", default=DEFAULT_CONTEXT, help="Context query text.")
    parser.add_argument("--k", type=int, default=10, help="Number of results requested.")
    parser.add_argument("--timeout", type=int, default=20, help="Request timeout in seconds.")
    args = parser.parse_args()

    try:
        payload = run_request(args.api_url, args.context, args.k, args.timeout)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore")
        print(f"HTTP {error.code}: {body}")
        return 1
    except urllib.error.URLError as error:
        print(f"Network error: {error}")
        return 1

    results = payload.get("results") if isinstance(payload, dict) else []
    meta = payload.get("meta") if isinstance(payload, dict) else {}

    print("Meta:")
    print(json.dumps(meta, indent=2))
    print()
    print(f"Results ({len(results)}):")

    for index, result in enumerate(results, start=1):
        title = result.get("title", "Untitled")
        score = result.get("score", 0)
        year = result.get("year", "-")
        url = result.get("url", "")
        print(f"{index:02d}. [{score}] ({year}) {title}")
        if url:
            print(f"    {url}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
