#!/usr/bin/env python3
"""
Unified run script for TechDebt Management Platform.
- Ensures .env exists
- Pulls or builds Docker images (as defined in docker-compose.yml)
- Starts the containers via 'docker compose up -d'
Works on Linux/macOS with Docker installed.
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
elif not os.path.exists(".env"):
    print("WARNING: No .env file found. Copying .env.example...")
    shutil.copy(".env.example", ".env")

# ----- Docker check -----
if not shutil.which("docker"):
    die("Docker is not installed or not in PATH. Install Docker first.")

if not shutil.which("docker") or not subprocess.run(["docker", "ps"], capture_output=True).returncode == 0:
    die("Docker daemon is not running. Start Docker first.")

def die(msg):
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(1)

def run_docker(args):
    """Run 'docker compose <args>' inheriting the script's environment."""
    return subprocess.run(["docker", "compose"] + args, capture_output=True, text=True)

def check_docker_compose():
    """Check if docker compose is available as plugin or v2."""
    # Try docker compose (v1 plugin)
    r = subprocess.run(["docker", "compose", "version"], capture_output=True, text=True)
    if r.returncode == 0:
        return "plugin"
    # Try docker composelegacy (older)
    r = subprocess.run(["docker-compose", "version"], capture_output=True, text=True)
    if r.returncode == 0:
        return "legacy"
    return None

def build_images():
    """Build the custom backend/frontend images from Dockerfiles."""
    print("Building custom images from Dockerfiles...")
    
    # Build backend
    r = subprocess.run(
        ["docker", "build", "-t", "vivek512/techdebt-backend:latest", "./backend"],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"Backend build failed: {r.stderr}")
        return False
    
    # Build frontend
    r = subprocess.run(
        ["docker", "build", "-t", "vivek512/techdebt-frontend:latest", "./frontend"],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        print(f"Frontend build failed: {r.stderr}")
        return False
    
    print("Custom images built successfully.")
    return True

def pull_images():
    """Pull the custom images from Docker Hub, building if not available."""
    print("Attempting to pull images from Docker Hub...")
    
    # Try pulling custom images
    r = subprocess.run(["docker", "pull", "vivek512/techdebt-backend:latest"], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"Backend image not found in Docker Hub: {r.stderr.strip()}")
        print("Attempting to build instead...")
        return build_images()
    
    r = subprocess.run(["docker", "pull", "vivek512/techdebt-frontend:latest"], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"Frontend image not found in Docker Hub: {r.stderr.strip()}")
        print("Attempting to build instead...")
        return build_images()
    
    print("Images pulled successfully from Docker Hub.")
    return True

def main():
    print("=" * 60)
    print("TechDebt Management Platform - Docker Compose Runner")
    print("=" * 60)
    
    # Check docker compose availability
    compose_type = check_docker_compose()
    if compose_type is None:
        die("Docker Compose is not available. Install Docker Compose plugin.")
    
    print(f"Docker Compose detected: {compose_type}")
    
    # Try to pull images, fall back to building
    if not pull_images():
        die("Could not pull or build required images.")
    
    # ----- Pull standard images (postgres, redis) -----
    print("\nPulling standard database images...")
    pull_r = subprocess.run(["docker", "pull", "postgres:16"], capture_output=True, text=True)
    if pull_r.returncode != 0:
        print(f"Warning: postgres pull failed: {pull_r.stderr.strip()}")
    
    pull_r = subprocess.run(["docker", "pull", "redis:7"], capture_output=True, text=True)
    if pull_r.returncode != 0:
        print(f"Warning: redis pull failed: {pull_r.stderr.strip()}")
    
    # ----- Pull images -----
    print("\nPulling Docker images...")
    pull_r = run_docker(["pull"])
    if pull_r.returncode != 0 and "errors" not in pull_r.stdout.lower():
        print(f"Pull had output but continuing anyway: {pull_r.stdout[-200:] if pull_r.stdout else ''}")
    
    # ----- Up containers (detached) -----
    print("\nStarting containers...")
    up_r = run_docker(["up", "-d"])
    if up_r.returncode != 0:
        print("Container startup failed.", file=sys.stderr)
        print("stdout:", up_r.stdout)
        print("stderr:", up_r.stderr)
        sys.exit(up_r.returncode)
    
    # Wait a moment for containers to become ready, then print hints
    import time
    time.sleep(5)
    
    print("\n" + "=" * 60)
    print("Done. TechDebt Platform is running.")
    print("=" * 60)
    print("Access URLs:")
    print("  Frontend: http://localhost:5173")
    print("  Backend:  http://localhost:8000")
    print("  Backend Health: http://localhost:8000/health")
    print("  Backend Docs:   http://localhost:8000/docs")
    print("  Redis Commander: http://localhost:8080 (if enabled)")
    print("\nUseful commands:")
    print("  View logs:   docker compose logs -f")
    print("  Stop:        docker compose down")
    print("  Restart:     docker compose restart")
    print("=" * 60)


if __name__ == "__main__":
    main()