#!/usr/bin/env bash
set -o errexit

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

pip install -r requirements.txt

# Traz o exercises-dataset do drive (archive/cópia) se EXERCISES_DATASET_* estiver definido.
if [ -n "$EXERCISES_DATASET_ARCHIVE_URL" ] || [ -n "$EXERCISES_DATASET_COPY_DIR" ] || [ -n "$EXERCISES_DATASET_DIR" ]; then
  python scripts/sync_exercises_dataset.py || echo "Aviso: dataset de exercicios indisponivel neste build."
fi

npm --prefix ../Nutrinow-Frontend install
npm --prefix ../Nutrinow-Frontend run build
