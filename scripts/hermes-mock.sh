#!/usr/bin/env python3
"""
Hermes Agent CLI launcher for sandbox environment.
Wraps the locally installed hermes-agent package.
"""
import sys
import os

# Ensure hermes-agent root is discoverable
os.environ.setdefault("HERMES_AGENT_ROOT", "/workspace/projects/hermes-agent")

if __name__ == "__main__":
    from hermes_cli.main import main
    main()
