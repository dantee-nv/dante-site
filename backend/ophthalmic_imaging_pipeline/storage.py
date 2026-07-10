from __future__ import annotations

import shutil
from pathlib import Path
from typing import Protocol


class ObjectStore(Protocol):
    def put_file(self, key: str, path: Path) -> None:
        ...

    def put_bytes(self, key: str, payload: bytes) -> None:
        ...

    def get_bytes(self, key: str) -> bytes:
        ...

    def copy_object(self, source_key: str, destination_key: str) -> None:
        ...

    def list_keys(self, prefix: str) -> list[str]:
        ...


class LocalObjectStore:
    def __init__(self, root: Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path_for_key(self, key: str) -> Path:
        normalized = key.strip("/")
        if ".." in Path(normalized).parts:
            raise ValueError(f"unsafe object key: {key}")
        return self.root / normalized

    def put_file(self, key: str, path: Path) -> None:
        destination = self._path_for_key(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)

    def put_bytes(self, key: str, payload: bytes) -> None:
        destination = self._path_for_key(key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)

    def get_bytes(self, key: str) -> bytes:
        return self._path_for_key(key).read_bytes()

    def copy_object(self, source_key: str, destination_key: str) -> None:
        destination = self._path_for_key(destination_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(self._path_for_key(source_key), destination)

    def list_keys(self, prefix: str) -> list[str]:
        root = self._path_for_key(prefix)
        if not root.exists():
            return []

        if root.is_file():
            return [prefix.strip("/")]

        return sorted(
            str(path.relative_to(self.root))
            for path in root.rglob("*")
            if path.is_file()
        )


class S3ObjectStore:
    def __init__(self, bucket_name: str, profile_name: str = "dante_nv", region_name: str = "us-east-2"):
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("Install boto3 to use AWS S3 storage.") from exc

        session = boto3.Session(profile_name=profile_name, region_name=region_name)
        self.client = session.client("s3")
        self.bucket_name = bucket_name

    def put_file(self, key: str, path: Path) -> None:
        self.client.upload_file(str(path), self.bucket_name, key)

    def put_bytes(self, key: str, payload: bytes) -> None:
        self.client.put_object(Bucket=self.bucket_name, Key=key, Body=payload)

    def get_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket_name, Key=key)
        return response["Body"].read()

    def copy_object(self, source_key: str, destination_key: str) -> None:
        self.client.copy_object(
            Bucket=self.bucket_name,
            CopySource={"Bucket": self.bucket_name, "Key": source_key},
            Key=destination_key,
        )

    def list_keys(self, prefix: str) -> list[str]:
        keys: list[str] = []
        paginator = self.client.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
            keys.extend(item["Key"] for item in page.get("Contents", []))
        return sorted(keys)
