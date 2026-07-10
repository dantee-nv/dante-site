from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass


@dataclass(frozen=True)
class LakeFSCommit:
    commit_id: str
    branch: str
    tag: str


class LakeFSClient:
    def __init__(self, endpoint: str, access_key: str, secret_key: str, repository: str):
        self.endpoint = endpoint.rstrip("/")
        self.access_key = access_key
        self.secret_key = secret_key
        self.repository = repository

    @classmethod
    def from_env(cls, endpoint: str, repository: str) -> "LakeFSClient":
        access_key = os.getenv("LAKEFS_ACCESS_KEY_ID", "")
        secret_key = os.getenv("LAKEFS_SECRET_ACCESS_KEY", "")
        if not access_key or not secret_key:
            raise RuntimeError("Set LAKEFS_ACCESS_KEY_ID and LAKEFS_SECRET_ACCESS_KEY to commit to lakeFS.")
        return cls(endpoint=endpoint, access_key=access_key, secret_key=secret_key, repository=repository)

    def _request(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        ok_conflicts: bool = False,
    ) -> dict:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        token = base64.b64encode(f"{self.access_key}:{self.secret_key}".encode("utf-8")).decode("ascii")
        request = urllib.request.Request(
            f"{self.endpoint}/api/v1{path}",
            data=body,
            method=method,
            headers={
                "authorization": f"Basic {token}",
                "content-type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                raw = response.read().decode("utf-8")
                if not raw:
                    return {}
                try:
                    return json.loads(raw)
                except json.JSONDecodeError:
                    return {}
        except urllib.error.HTTPError as exc:
            if ok_conflicts and exc.code == 409:
                return {}
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"lakeFS request failed: {exc.code} {detail}") from exc

    @staticmethod
    def _path_segment(value: str) -> str:
        return urllib.parse.quote(value, safe="")

    def ensure_repository(self, storage_namespace: str) -> None:
        self._request(
            "POST",
            "/repositories",
            {
                "name": self.repository,
                "storage_namespace": storage_namespace,
            },
            ok_conflicts=True,
        )

    def ensure_branch(self, branch: str, source_ref: str = "main") -> None:
        self._request(
            "POST",
            f"/repositories/{self._path_segment(self.repository)}/branches",
            {"name": branch, "source": source_ref},
            ok_conflicts=True,
        )

    def import_s3_prefix(
        self,
        branch: str,
        source_path: str,
        destination_prefix: str,
        message: str,
        metadata: dict[str, str] | None = None,
        timeout_seconds: int = 90,
    ) -> str:
        response = self._request(
            "POST",
            f"/repositories/{self._path_segment(self.repository)}/branches/"
            f"{self._path_segment(branch)}/import",
            {
                "paths": [
                    {
                        "type": "common_prefix",
                        "path": source_path,
                        "destination": destination_prefix,
                    }
                ],
                "commit": {"message": message, "metadata": metadata or {}},
            },
        )
        import_id = str(response.get("id") or "")
        if not import_id:
            raise RuntimeError("lakeFS import did not return an import ID")

        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            status = self._request(
                "GET",
                f"/repositories/{self._path_segment(self.repository)}/branches/"
                f"{self._path_segment(branch)}/import?id={urllib.parse.quote(import_id)}",
            )
            if status.get("completed"):
                error = status.get("error") or {}
                if error:
                    raise RuntimeError(f"lakeFS import failed: {error}")
                commit = status.get("commit") or {}
                commit_id = str(commit.get("id") or commit.get("commit_id") or "")
                if not commit_id:
                    raise RuntimeError("lakeFS import completed without a commit ID")
                return commit_id
            time.sleep(1)

        raise TimeoutError(f"lakeFS import did not complete within {timeout_seconds} seconds")

    def commit(self, branch: str, message: str, metadata: dict[str, str] | None = None) -> str:
        response = self._request(
            "POST",
            f"/repositories/{self._path_segment(self.repository)}/branches/"
            f"{self._path_segment(branch)}/commits",
            {"message": message, "metadata": metadata or {}},
        )
        return str(response.get("id") or response.get("commit_id") or "")

    def tag(self, tag_name: str, ref: str) -> None:
        self._request(
            "POST",
            f"/repositories/{self._path_segment(self.repository)}/tags",
            {"id": tag_name, "ref": ref},
            ok_conflicts=True,
        )


def commit_validated_dataset(
    endpoint: str,
    repository: str,
    branch: str,
    tag_name: str,
    source_bucket: str,
    storage_namespace: str,
) -> LakeFSCommit:
    client = LakeFSClient.from_env(endpoint=endpoint, repository=repository)
    client.ensure_repository(storage_namespace)
    client.ensure_branch(branch)
    commit_id = client.import_s3_prefix(
        branch=branch,
        source_path=f"s3://{source_bucket}/validated/",
        destination_prefix="validated/",
        message=f"Import validated ophthalmic image dataset {tag_name}",
        metadata={"dataset_version": tag_name},
    )
    client.tag(tag_name, commit_id)
    return LakeFSCommit(commit_id=commit_id, branch=branch, tag=tag_name)
