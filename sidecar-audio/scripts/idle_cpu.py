"""Measures the sidecar's CPU and RAM while it only listens for the wake word (F0.7).

    uv run scripts/idle_cpu.py [--seconds 300] [--warmup 20]

CPU is reported as a share of the whole machine (PRD target: < 2 %), and also
per core, which is what Task Manager's per-process column does not show.
"""

from __future__ import annotations

import argparse
import statistics
import subprocess
import sys
import time

import psutil


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--seconds", type=int, default=300)
    p.add_argument("--warmup", type=int, default=20, help="model loading, not measured")
    p.add_argument("extra", nargs="*", help="extra sidecar arguments")
    args = p.parse_args()

    # Nothing listens on port 1: the sidecar keeps retrying the core, as it would idle.
    cmd = [
        sys.executable,
        "-m",
        "clober_audio",
        "--token",
        "idle",
        "--url",
        "ws://127.0.0.1:1/audio",
    ]
    proc = subprocess.Popen(cmd + args.extra, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(args.warmup)
        if proc.poll() is not None:
            sys.exit(f"sidecar exited with code {proc.returncode} during warmup")
        # On Windows the venv python.exe is a launcher that starts the real
        # interpreter as a child, so measure the whole process tree.
        root = psutil.Process(proc.pid)
        tree = [root, *root.children(recursive=True)]
        for ps in tree:
            ps.cpu_percent()  # prime the counters
        samples: list[float] = []
        end = time.monotonic() + args.seconds
        while time.monotonic() < end:
            time.sleep(1)
            samples.append(sum(ps.cpu_percent() for ps in tree))
        rss_mb = sum(ps.memory_info().rss for ps in tree) / 2**20
    finally:
        for child in psutil.Process(proc.pid).children(recursive=True):
            child.terminate()
        proc.terminate()
        proc.wait(timeout=10)

    cores = psutil.cpu_count() or 1
    mean = statistics.fmean(samples)
    p95 = sorted(samples)[int(len(samples) * 0.95) - 1]
    print(f"samples: {len(samples)} s, logical cores: {cores}")
    print(f"CPU of one core: mean {mean:.1f} %, p95 {p95:.1f} %")
    print(f"CPU of the machine: mean {mean / cores:.2f} %, p95 {p95 / cores:.2f} %  (target < 2 %)")
    print(f"RAM (RSS): {rss_mb:.0f} MB  (target < 1.5 GB with STT loaded)")


if __name__ == "__main__":
    main()
