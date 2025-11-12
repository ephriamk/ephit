#!/bin/bash
# Optional worker startup script
# Only starts if ENABLE_WORKER is not explicitly set to "false"

# Ensure UTF-8 encoding for Python
export PYTHONIOENCODING=utf-8
export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8

ENABLE_WORKER=${ENABLE_WORKER:-true}

if [ "$ENABLE_WORKER" = "false" ]; then
    echo "Worker disabled (ENABLE_WORKER=false). Sleeping indefinitely..."
    echo "To enable worker: set ENABLE_WORKER=true and redeploy"
    # Keep process running so supervisor doesn't restart
    sleep infinity
else
    echo "Worker enabled. Starting after 15s delay..."
    sleep 15
    echo "Starting surreal-commands-worker..."
    exec uv run surreal-commands-worker --import-modules commands
fi

