#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

ACTION="${1:-}"
SCHEMA_ARG="${2:-}"
DATABASE="${DATABASE:-smbcnikko-db}"
TARGET="${TARGET:-remote}"
DRY_RUN=false

# --dry-run は任意の位置に指定可能
for arg in "$@"; do
  if [[ "${arg}" == "--dry-run" ]]; then
    DRY_RUN=true
  fi
done

usage() {
  cat <<'EOF'
Usage:
  ./tools/d1_schema.sh create   <schema-name>
  ./tools/d1_schema.sh drop     <schema-name>
  ./tools/d1_schema.sh recreate <schema-name>
  ./tools/d1_schema.sh drop     --all
  ./tools/d1_schema.sh recreate --all [--dry-run]

Options (environment variables):
  DATABASE=smbcnikko-db   (default)
  TARGET=remote|local     (default: remote)

Flags:
  --dry-run   Print SQL to stdout without executing wrangler
EOF
}

if [[ -z "${ACTION}" ]] || [[ -z "${SCHEMA_ARG}" ]]; then
  usage
  exit 1
fi

case "${TARGET}" in
  remote) TARGET_FLAG="--remote" ;;
  local)  TARGET_FLAG="--local"  ;;
  *)
    echo "Unsupported TARGET: ${TARGET}" >&2
    exit 1
    ;;
esac

run_d1_file() {
  local file_path="$1"
  local relative_path

  if [[ "${file_path}" == "${REPO_ROOT}/"* ]]; then
    relative_path="${file_path#"${REPO_ROOT}/"}"
  else
    relative_path="${file_path}"
  fi

  if [[ "${DRY_RUN}" == true ]]; then
    echo "--- [dry-run] ${relative_path} ---"
    cat "${file_path}"
    return
  fi

  (
    cd "${REPO_ROOT}"
    npx wrangler d1 execute "${DATABASE}" "${TARGET_FLAG}" "--file=${relative_path}"
  )
}

do_create() {
  local name="$1"
  local sql_file="${REPO_ROOT}/schemas/${name}.sql"

  if [[ ! -f "${sql_file}" ]]; then
    echo "Error: schema file not found: ${sql_file}" >&2
    exit 1
  fi

  run_d1_file "${sql_file}"
}

do_drop() {
  local name="$1"
  local drop_file="${REPO_ROOT}/schemas/${name}_drop.sql"

  if [[ ! -f "${drop_file}" ]]; then
    echo "Error: drop SQL file not found: ${drop_file}" >&2
    exit 1
  fi

  run_d1_file "${drop_file}"
}

do_recreate() {
  local name="$1"
  do_drop "${name}"
  do_create "${name}"
}

collect_schema_names() {
  local schemas_dir="${REPO_ROOT}/schemas"
  local names=()

  for f in "${schemas_dir}"/*.sql; do
    [[ -f "${f}" ]] || continue
    local base
    base="$(basename "${f}" .sql)"
    # _drop.sql は除外
    [[ "${base}" == *_drop ]] && continue
    names+=("${base}")
  done

  if [[ ${#names[@]} -eq 0 ]]; then
    echo "Error: no schema files found in ${schemas_dir}" >&2
    exit 1
  fi

  # アルファベット順にソートして出力
  printf '%s\n' "${names[@]}" | sort
}

if [[ "${SCHEMA_ARG}" == "--all" ]]; then
  mapfile -t SCHEMA_NAMES < <(collect_schema_names)

  for name in "${SCHEMA_NAMES[@]}"; do
    echo "==> ${ACTION}: ${name}"
    case "${ACTION}" in
      create)   do_create   "${name}" ;;
      drop)     do_drop     "${name}" ;;
      recreate) do_recreate "${name}" ;;
      *)
        echo "Unsupported action: ${ACTION}" >&2
        usage
        exit 1
        ;;
    esac
  done
else
  # --dry-run を除いた実際のスキーマ名を取得
  name="${SCHEMA_ARG}"
  case "${ACTION}" in
    create)   do_create   "${name}" ;;
    drop)     do_drop     "${name}" ;;
    recreate) do_recreate "${name}" ;;
    *)
      echo "Unsupported action: ${ACTION}" >&2
      usage
      exit 1
      ;;
  esac
fi
