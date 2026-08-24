#!/usr/bin/env python3
"""Sincroniza o exercises-dataset de um drive/suporte externo para o diretorio local.

Regras:
- Se EXERCISES_DATASET_DIR ja existir com dados validos, fase OK sem tocar em nada.
- Se EXERCISES_DATASET_ARCHIVE_URL estiver definida, baixa o arquivo (.tar.gz/.tar/.zip) e extrai.
- Senao, se EXERCISES_DATASET_COPY_DIR existir, copia recursivamente.

Uso:
    python scripts/sync_exercises_dataset.py
"""

import json
import logging
import os
import re
import shutil
import sys
import tarfile
import urllib.request
import zipfile

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("sync_exercises_dataset")

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_DEST = os.environ.get(
    "EXERCISES_DATASET_DIR",
    os.path.join(BACKEND_DIR, "exercises-dataset"),
)
ARCHIVE_URL = os.environ.get("EXERCISES_DATASET_ARCHIVE_URL", "").strip()
COPY_DIR = os.environ.get("EXERCISES_DATASET_COPY_DIR", "").strip()


def is_valid_dataset(dataset_dir):
    json_path = os.path.join(dataset_dir, "data", "exercises.json")
    if not os.path.isfile(json_path):
        return False
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return isinstance(data, list) and len(data) > 0
    except Exception:
        return False


def copy_tree(src, dst):
    os.makedirs(dst, exist_ok=True)
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        target = dst if rel == "." else os.path.join(dst, rel)
        os.makedirs(target, exist_ok=True)
        for name in files:
            shutil.copy2(os.path.join(root, name), os.path.join(target, name))
            logger.info("  + %s", os.path.join(rel, name) if rel != "." else name)


def extract(archive_path, dest):
    os.makedirs(dest, exist_ok=True)
    with open(archive_path, "rb") as fh:
        magic = fh.read(4)
    if magic[:2] == b"PK":
        with zipfile.ZipFile(archive_path) as zf:
            zf.extractall(dest)
    else:
        with tarfile.open(archive_path, "r:*") as tf:
            tf.extractall(dest)
    base_name = os.path.basename(archive_path)
    if os.path.exists(os.path.join(dest, base_name)):
        os.remove(os.path.join(dest, base_name))
    entries = [e for e in os.listdir(dest) if os.path.isdir(os.path.join(dest, e))]
    if len(entries) == 1 and is_valid_dataset(os.path.join(dest, entries[0])):
        inner_name = entries[0]
        tmp = dest + ".tmp"
        os.rename(dest, tmp)
        os.rename(os.path.join(tmp, inner_name), dest)
        shutil.rmtree(tmp, ignore_errors=True)


def _store_text(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "ignore")


def _drive_direct_url(public_url):
    """Converte um link publico/shared do Google Drive em URL de baixa direta."""
    match = re.search(r"[-\w]{25,}", public_url)
    if not match:
        return public_url
    file_id = match.group(0)
    uc = "https://drive.google.com/uc?export=download&id=" + file_id
    try:
        txt = _store_text(uc)
    except Exception as e:
        logger.debug("Falha ao abrir pagina do Drive: %s" % e)
        return "https://drive.usercontent.google.com/download?id=%s&export=download" % file_id
    inputs = dict(re.findall(r'<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"', txt))
    if inputs.get("confirm"):
        return (
            "https://drive.usercontent.google.com/download?id=%s&export=download"
            "&confirm=%s&uuid=%s" % (file_id, inputs["confirm"], inputs.get("uuid", ""))
        )
    return uc


def _stream_download(download_url, dest_path):
    req = urllib.request.Request(download_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=180) as resp:
        with open(dest_path, "wb") as fh:
            shutil.copyfileobj(resp, fh)


def from_archive(dataset_dir):
    if not ARCHIVE_URL:
        return False
    effective_url = _drive_direct_url(ARCHIVE_URL)
    logger.info("Baixando dataset de: %s" % effective_url)
    os.makedirs(dataset_dir, exist_ok=True)
    tmp_path = os.path.join(dataset_dir, "_download.part")
    try:
        _stream_download(effective_url, tmp_path)
        extract(tmp_path, dataset_dir)
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return is_valid_dataset(dataset_dir)
    except Exception as e:
        logger.error("Falha ao baixar/extrair dataset: %s" % e)
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return False


def from_copy_dir(dataset_dir):
    if not COPY_DIR or not os.path.isdir(COPY_DIR):
        return False
    logger.info("Copiando de: %s" % COPY_DIR)
    copy_tree(COPY_DIR, dataset_dir)
    return is_valid_dataset(dataset_dir)


def main():
    if is_valid_dataset(DEFAULT_DEST):
        logger.info("Dataset ja presente em: %s" % DEFAULT_DEST)
        return 0

    logger.info("Diretorio destino: %s" % DEFAULT_DEST)
    if from_copy_dir(DEFAULT_DEST) or from_archive(DEFAULT_DEST):
        logger.info("Dataset sincronizado com sucesso.")
        return 0

    logger.error(
        "Nao foi possivel obter o dataset. Defina EXERCISES_DATASET_ARCHIVE_URL "
        "ou EXERCISES_DATASET_COPY_DIR."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())