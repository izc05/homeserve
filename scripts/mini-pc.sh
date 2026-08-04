#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="isivoltpro-ot"
BRANCH="${ISIVOLTPRO_BRANCH:-feat/isivoltpro-ot-ecosystem}"
INSTALL_DIR="${ISIVOLTPRO_INSTALL_DIR:-$HOME/isivoltpro-ot}"
REPOSITORY_URL="${ISIVOLTPRO_REPOSITORY_URL:-https://github.com/izc05/homeserve.git}"
HEALTH_URL="${ISIVOLTPRO_HEALTH_URL:-http://127.0.0.1:8088/healthz}"
STATE_DIR="$INSTALL_DIR/.deploy"
PREVIOUS_FILE="$STATE_DIR/previous_commit"
LAST_GOOD_FILE="$STATE_DIR/last_successful_commit"

log() { printf '\n\033[1;36m[IsiVoltPro OT]\033[0m %s\n' "$*"; }
warn() { printf '\n\033[1;33m[AVISO]\033[0m %s\n' "$*" >&2; }
die() { printf '\n\033[1;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "Falta el comando '$1'."
}

compose() {
  docker compose "$@"
}

ensure_docker() {
  require_command docker
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 no está disponible."
  docker info >/dev/null 2>&1 || die "Docker no está iniciado o tu usuario no tiene permiso para usarlo."
}

ensure_repository() {
  require_command git
  if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    log "Clonando el repositorio en $INSTALL_DIR"
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --branch "$BRANCH" --single-branch "$REPOSITORY_URL" "$INSTALL_DIR"
  fi

  cd "$INSTALL_DIR"
  git remote get-url origin >/dev/null 2>&1 || die "$INSTALL_DIR no es un repositorio válido."
  mkdir -p "$STATE_DIR"
}

ensure_clean_tree() {
  if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    die "Hay cambios locales en $INSTALL_DIR. Guárdalos antes de actualizar o volver atrás."
  fi
}

write_env() {
  local env_file="$INSTALL_DIR/.env"
  local url="${VITE_SUPABASE_URL:-}"
  local key="${VITE_SUPABASE_PUBLISHABLE_KEY:-}"

  if [[ -f "$env_file" ]] && ! grep -qE 'YOUR_PROJECT_REF|YOUR_PUBLISHABLE_KEY|TU_PROYECTO|TU_CLAVE' "$env_file"; then
    chmod 600 "$env_file"
    return
  fi

  if [[ -z "$url" && -t 0 ]]; then
    read -r -p "URL de Supabase: " url
  fi
  if [[ -z "$key" && -t 0 ]]; then
    read -r -s -p "Clave publicable de Supabase: " key
    printf '\n'
  fi

  [[ "$url" =~ ^https://[A-Za-z0-9.-]+\.supabase\.co/?$ ]] || die "La URL de Supabase no tiene un formato válido."
  [[ -n "$key" && ${#key} -ge 20 ]] || die "La clave publicable de Supabase no es válida."

  umask 077
  cat > "$env_file" <<EOF
VITE_SUPABASE_URL=${url%/}
VITE_SUPABASE_PUBLISHABLE_KEY=$key
VITE_BASE_PATH=/
EOF
  chmod 600 "$env_file"
  log "Configuración local guardada con permisos 600."
}

wait_for_health() {
  require_command curl
  local attempt
  for attempt in $(seq 1 30); do
    if [[ "$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null || true)" == "ok" ]]; then
      log "Servicio saludable en $HEALTH_URL"
      return 0
    fi
    sleep 2
  done
  return 1
}

build_and_start() {
  log "Construyendo y arrancando el contenedor"
  compose build --pull
  compose up -d --remove-orphans
  wait_for_health
}

record_success() {
  git rev-parse HEAD > "$LAST_GOOD_FILE"
  log "Versión estable: $(git rev-parse --short HEAD)"
}

restore_commit() {
  local target="$1"
  warn "Restaurando automáticamente el commit ${target:0:12}"
  git checkout --detach "$target"
  compose build
  compose up -d --remove-orphans
  wait_for_health || die "El rollback tampoco ha recuperado el servicio. Revisa: docker compose logs --tail=200"
  git rev-parse HEAD > "$LAST_GOOD_FILE"
}

install_app() {
  ensure_docker
  ensure_repository
  write_env
  ensure_clean_tree
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  build_and_start || die "La instalación no superó el healthcheck. Revisa los logs con: bash scripts/mini-pc.sh logs"
  record_success
  status_app
}

update_app() {
  ensure_docker
  ensure_repository
  write_env
  ensure_clean_tree

  local previous
  previous="$(git rev-parse HEAD)"
  printf '%s\n' "$previous" > "$PREVIOUS_FILE"

  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"

  if build_and_start; then
    record_success
    status_app
  else
    restore_commit "$previous"
    die "La actualización falló y se restauró automáticamente la versión anterior."
  fi
}

rollback_app() {
  ensure_docker
  ensure_repository
  write_env
  ensure_clean_tree

  local target="${2:-}"
  if [[ -z "$target" && -f "$PREVIOUS_FILE" ]]; then
    target="$(cat "$PREVIOUS_FILE")"
  fi
  [[ "$target" =~ ^[0-9a-fA-F]{7,40}$ ]] || die "No hay un commit anterior registrado. Puedes indicar uno: bash scripts/mini-pc.sh rollback COMMIT"
  git cat-file -e "$target^{commit}" 2>/dev/null || die "El commit indicado no existe en el repositorio local."

  printf '%s\n' "$(git rev-parse HEAD)" > "$PREVIOUS_FILE"
  restore_commit "$target"
  status_app
}

status_app() {
  ensure_docker
  ensure_repository
  printf '\n'
  compose ps
  printf '\nCommit: %s\n' "$(git rev-parse --short HEAD)"
  if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1; then
    printf 'Salud: OK (%s)\n' "$HEALTH_URL"
  else
    printf 'Salud: NO DISPONIBLE (%s)\n' "$HEALTH_URL"
  fi
}

logs_app() {
  ensure_docker
  ensure_repository
  compose logs --tail="${ISIVOLTPRO_LOG_LINES:-200}" "$APP_NAME"
}

stop_app() {
  ensure_docker
  ensure_repository
  compose down
}

usage() {
  cat <<'EOF'
Uso:
  bash scripts/mini-pc.sh install
  bash scripts/mini-pc.sh update
  bash scripts/mini-pc.sh rollback [COMMIT]
  bash scripts/mini-pc.sh status
  bash scripts/mini-pc.sh logs
  bash scripts/mini-pc.sh stop

Variables opcionales:
  ISIVOLTPRO_INSTALL_DIR
  ISIVOLTPRO_BRANCH
  VITE_SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY
EOF
}

command_name="${1:-}"
case "$command_name" in
  install) install_app ;;
  update) update_app ;;
  rollback) rollback_app "$@" ;;
  status) status_app ;;
  logs) logs_app ;;
  stop) stop_app ;;
  *) usage; exit 1 ;;
esac
