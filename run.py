#!/usr/bin/env python3
"""
Unified run script for TechDebt Management Platform.
- Ensures .env exists
- Pulls the latest tagged images (as defined in docker-compose.yml)
- Starts the containers via 'docker compose up -d'
Works on Linux/macOS and Windows (via python).
"""

import os
import sys
import subprocess
import shutil

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
ROOT = REPO_ROOT
os.chdir(ROOT)

# Ensure .env exists
if not os.path.exists(".env") and os.path.exists(".env.example"):
    print("Creating .env from .env.example...")
    shutil.copy(".env.example", ".env")

# ----- Docker check -----
if not shutil.which("docker"):
    die("Docker is not installed or not in PATH.")


def die(msg):
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(1)


def run_docker(args):
    """Run 'docker compose <args>' inheriting the script's environment."""
    return subprocess.run(["docker", "compose"] + args, capture_output=True, text=True)


def main():
    # ----- Pull images -----
    print("Pulling Docker images...")
    pull_r = run_docker(["pull"])
    # Non-fatal if pull has warnings/output; continue anyway

    # ----- Up containers (detached) -----
    print("Starting containers...")
    up_r = run_docker(["up", "-d"] + sys.argv[1:])
    if up_r.returncode != 0:
        print("Container startup failed.", file=sys.stderr)
        print("stdout:", up_r.stdout)
        print("stderr:", up_r.stderr)
        sys.exit(up_r.returncode)

    # Wait a moment for containers to become ready, then print hints
    import time
    time.sleep(3)

    print("Done. TechDebt Platform is running.")
    print("Frontend: http://localhost:5173")
    print("Backend:  http://localhost:8000 (health: /health, docs: /docs)")


if __name__ == "__main__":
    main()