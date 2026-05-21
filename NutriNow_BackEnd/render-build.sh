#!/usr/bin/env bash
set -o errexit

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

pip install -r requirements.txt
npm --prefix ../Nutrinow_Frontend install
npm --prefix ../Nutrinow_Frontend run build
