#!/usr/bin/env python3
"""Capture and verify the uncommitted primary-main launch source without building."""

import argparse
import gzip
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parents[1]


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def paths_from_git(*args: str) -> list[str]:
    return sorted(item.decode("utf-8", "surrogateescape") for item in git(*args).split(b"\0") if item)


def validate_path(relative: str) -> Path:
    candidate = Path(relative)
    if candidate.is_absolute() or ".." in candidate.parts or not candidate.parts:
        raise ValueError(f"Unsafe source path: {relative!r}")
    return ROOT / candidate


def brain_files() -> list[str]:
    return sorted(
        str(file.relative_to(ROOT))
        for file in (ROOT / ".brain").rglob("*")
        if file.is_file()
    )


def release_untracked(paths: list[str]) -> tuple[list[str], list[str]]:
    excluded_roots = (
        "apps/mobile/android/",
        "apps/mobile/ios/",
        "artifacts/",
        ".codex/",
        ".agents/",
        ".scratch/",
        ".local/",
        ".gstack/",
        ".claude/",
    )
    included, excluded = [], []
    for relative in paths:
        name = Path(relative).name.lower()
        omit = (
            relative.startswith(excluded_roots)
            or relative in {"CONTEXT.md", "tickets.md", ".npmrc"}
            or relative.startswith("Screenshot_")
            or name == ".env"
            or name.startswith(".env.")
            or name == ".xcode.env"
            or name.startswith(".xcode.env.")
            or name.endswith((".pem", ".p12", ".p8", ".mobileprovision", ".keystore", ".jks", ".key", ".log"))
        )
        (excluded if omit else included).append(relative)
    return included, excluded


def source_digest(paths: list[str]) -> str:
    digest = hashlib.sha256()
    for relative in paths:
        file = validate_path(relative)
        digest.update(relative.encode("utf-8", "surrogateescape") + b"\0")
        if not file.exists():
            digest.update(b"deleted\0")
            continue
        if file.is_symlink() or not file.is_file():
            raise ValueError(f"Expected a regular source file: {relative}")
        digest.update(str(file.stat().st_mode & 0o777).encode() + b"\0")
        digest.update(hashlib.sha256(file.read_bytes()).digest())
    return digest.hexdigest()


def write_tar(output: Path, files: list[str]) -> None:
    with output.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode="w", format=tarfile.PAX_FORMAT) as archive:
                for relative in files:
                    file = validate_path(relative)
                    if file.is_symlink() or not file.is_file():
                        raise ValueError(f"Expected a regular source file: {relative}")
                    info = archive.gettarinfo(str(file), arcname=relative)
                    info.uid = info.gid = 0
                    info.uname = info.gname = ""
                    info.mtime = 0
                    with file.open("rb") as data:
                        archive.addfile(info, data)


def sha256(file: Path) -> str:
    return hashlib.sha256(file.read_bytes()).hexdigest()


def verify(snapshot: Path, head: str, all_paths: list[str], expected_digest: str) -> None:
    with tempfile.TemporaryDirectory(prefix="halaalvest-source-verify-") as scratch:
        restored = Path(scratch)
        archive_bytes = git("archive", "--format=tar", head)
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:") as archive:
            archive.extractall(restored, filter="data")
        subprocess.run(
            ["git", "apply", str(snapshot / "tracked.patch")],
            cwd=restored,
            check=True,
            stdout=subprocess.DEVNULL,
        )
        for name in ("untracked.tar.gz", "brain.tar.gz"):
            with tarfile.open(snapshot / name, mode="r:gz") as archive:
                archive.extractall(restored, filter="data")
        digest = hashlib.sha256()
        for relative in all_paths:
            file = restored / relative
            digest.update(relative.encode("utf-8", "surrogateescape") + b"\0")
            if not file.exists():
                digest.update(b"deleted\0")
                continue
            digest.update(str(file.stat().st_mode & 0o777).encode() + b"\0")
            digest.update(hashlib.sha256(file.read_bytes()).digest())
        if digest.hexdigest() != expected_digest:
            raise RuntimeError("Reconstructed source does not match the captured main source.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.expanduser().resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error("Output must be outside the repository.")
    if output.exists():
        parser.error("Output already exists; choose a new snapshot directory.")
    output.parent.mkdir(parents=True, exist_ok=True)
    if Path(git("rev-parse", "--show-toplevel").decode().strip()).resolve() != ROOT:
        raise RuntimeError("Run from the primary repository source.")
    if git("branch", "--show-current").decode().strip() != "main":
        raise RuntimeError("Release source snapshot requires the primary main branch.")
    head = git("rev-parse", "HEAD").decode().strip()
    tracked = paths_from_git("ls-files", "-z")
    git_visible_untracked = paths_from_git("ls-files", "--others", "--exclude-standard", "-z")
    untracked, excluded_untracked = release_untracked(git_visible_untracked)
    changed = paths_from_git("diff", "--name-only", "-z", "HEAD")
    brain = brain_files()
    all_paths = sorted(set(tracked + untracked + brain))
    before = source_digest(all_paths)
    patch = git("diff", "--binary", "HEAD")
    with tempfile.TemporaryDirectory(prefix="halaalvest-source-stage-", dir=output.parent) as stage:
        staged = Path(stage)
        (staged / "tracked.patch").write_bytes(patch)
        write_tar(staged / "untracked.tar.gz", untracked)
        write_tar(staged / "brain.tar.gz", brain)
        if (
            git("rev-parse", "HEAD").decode().strip() != head
            or paths_from_git("ls-files", "--others", "--exclude-standard", "-z") != git_visible_untracked
            or paths_from_git("diff", "--name-only", "-z", "HEAD") != changed
            or brain_files() != brain
            or source_digest(all_paths) != before
        ):
            raise RuntimeError("Source changed during capture; retry a fresh snapshot.")
        manifest = {
            "createdAtUtc": datetime.now(timezone.utc).isoformat(),
            "baseCommit": head,
            "branch": "main",
            "trackedPaths": len(tracked),
            "changedTrackedPaths": len(changed),
            "untrackedPaths": len(untracked),
            "excludedUntrackedPaths": len(excluded_untracked),
            "brainFiles": len(brain),
            "sourceSha256": before,
            "trackedPatchSha256": sha256(staged / "tracked.patch"),
            "untrackedArchiveSha256": sha256(staged / "untracked.tar.gz"),
            "brainArchiveSha256": sha256(staged / "brain.tar.gz"),
            "scope": "Git tracked changes plus selected Git-visible untracked release source and ignored .brain files. Generated native trees, local artifacts, tool files, env/credential-like files, other Git-ignored files, and external state are omitted. This is not the EAS/Vercel upload archive.",
        }
        (staged / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        verify(staged, head, all_paths, before)
        os.rename(staged, output)
    print(json.dumps({"output": str(output), **manifest}, indent=2))


if __name__ == "__main__":
    main()
