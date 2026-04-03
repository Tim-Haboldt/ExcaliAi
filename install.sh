#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[ OK ]${NC}  $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

generate_secret() {
    openssl rand -base64 48 | tr -d '/+=' | head -c "$1"
}

prompt() {
    local prompt_text=$1
    local default=${2:-}

    if [ -n "$default" ]; then
        read -rp "$(echo -e "  ${BLUE}?${NC} ${prompt_text} [${default}]: ")" value
        echo "${value:-$default}"
    else
        read -rp "$(echo -e "  ${BLUE}?${NC} ${prompt_text}: ")" value
        while [ -z "$value" ]; do
            read -rp "$(echo -e "  ${RED}!${NC} Required. ${prompt_text}: ")" value
        done
        echo "$value"
    fi
}

prompt_password() {
    local prompt_text=$1
    local min_length=${2:-8}

    while true; do
        read -rsp "$(echo -e "  ${BLUE}?${NC} ${prompt_text} (min ${min_length} chars): ")" password
        echo
        if [ ${#password} -lt "$min_length" ]; then
            echo -e "  ${RED}!${NC} Too short. Minimum ${min_length} characters."
            continue
        fi
        read -rsp "$(echo -e "  ${BLUE}?${NC} Confirm password: ")" confirm
        echo
        if [ "$password" != "$confirm" ]; then
            echo -e "  ${RED}!${NC} Passwords don't match. Try again."
            continue
        fi
        echo "$password"
        return
    done
}

prompt_choice() {
    local prompt_text=$1
    shift
    local options=("$@")

    echo -e "  ${BLUE}?${NC} ${prompt_text}"
    for i in "${!options[@]}"; do
        echo -e "    $((i + 1))) ${options[$i]}"
    done

    while true; do
        read -rp "$(echo -e "  ${BLUE}>${NC} Choice [1-${#options[@]}]: ")" choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
            echo "${options[$((choice - 1))]}"
            return
        fi
        echo -e "  ${RED}!${NC} Invalid choice."
    done
}

api_call() {
    local method=$1
    local endpoint=$2
    local data=${3:-}
    local url="http://localhost/api/v3${endpoint}"

    if [ -n "$data" ]; then
        curl -sf -X "$method" \
            -H "Authorization: Bearer ${AUTHENTIK_BOOTSTRAP_TOKEN}" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url" 2>/dev/null
    else
        curl -sf -X "$method" \
            -H "Authorization: Bearer ${AUTHENTIK_BOOTSTRAP_TOKEN}" \
            "$url" 2>/dev/null
    fi
}

# =========================================================================
echo -e "\n${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   Excalidraw AI — Production Installer       ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}\n"

# =========================================================================
# Phase 0: Prerequisites
# =========================================================================
info "Checking prerequisites..."

for cmd in docker jq openssl envsubst curl; do
    if ! command -v "$cmd" &>/dev/null; then
        fail "'${cmd}' is required but not installed."
    fi
done

if ! docker compose version &>/dev/null; then
    fail "Docker Compose v2 is required (docker compose, not docker-compose)."
fi

success "All prerequisites met."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env.production ]; then
    echo ""
    warn "An existing .env.production was found."
    read -rp "$(echo -e "  ${YELLOW}?${NC} Overwrite and reconfigure? [y/N]: ")" overwrite
    if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
        info "Keeping existing configuration. Restarting services..."
        docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
        success "Services restarted. Done."
        exit 0
    fi
    echo ""
fi

# =========================================================================
# Phase 1: Collect configuration
# =========================================================================
echo -e "${BOLD}--- Domain ---${NC}"
DOMAIN=$(prompt "Domain name (e.g. excalidraw.example.com)")

echo -e "\n${BOLD}--- AI Provider ---${NC}"
AI_PROVIDER=$(prompt_choice "Select AI provider" "anthropic" "openai" "google")

case "$AI_PROVIDER" in
    anthropic)
        AI_MODEL=$(prompt "AI model" "claude-haiku-4-5")
        ANTHROPIC_API_KEY=$(prompt "Anthropic API key")
        OPENAI_API_KEY=""
        GOOGLE_GENERATIVE_AI_API_KEY=""
        ;;
    openai)
        AI_MODEL=$(prompt "AI model" "gpt-4o-mini")
        OPENAI_API_KEY=$(prompt "OpenAI API key")
        ANTHROPIC_API_KEY=""
        GOOGLE_GENERATIVE_AI_API_KEY=""
        ;;
    google)
        AI_MODEL=$(prompt "AI model" "gemini-2.0-flash")
        GOOGLE_GENERATIVE_AI_API_KEY=$(prompt "Google AI API key")
        OPENAI_API_KEY=""
        ANTHROPIC_API_KEY=""
        ;;
esac

echo -e "\n${BOLD}--- Admin Account ---${NC}"
echo -e "  ${BLUE}i${NC} This replaces the default 'akadmin' account for security."
ADMIN_USERNAME=$(prompt "Admin username")
ADMIN_EMAIL=$(prompt "Admin email")
ADMIN_PASSWORD=$(prompt_password "Admin password")

echo ""
info "Generating secrets and database credentials..."
SESSION_SECRET=$(generate_secret 64)
AUTHENTIK_SECRET_KEY=$(generate_secret 64)
AUTHENTIK_BOOTSTRAP_TOKEN=$(generate_secret 64)
POSTGRES_PASSWORD=$(generate_secret 32)
AUTHENTIK_POSTGRES_PASSWORD=$(generate_secret 32)

POSTGRES_USER="excaliAi"
POSTGRES_DB="excaliAi"
AUTHENTIK_POSTGRES_USER="authentik"
AUTHENTIK_POSTGRES_DB="authentik"
NEXT_PUBLIC_APP_URL="http://${DOMAIN}"
NEXT_PUBLIC_SOCKET_URL="http://${DOMAIN}"

success "Configuration collected."

# =========================================================================
# Phase 2: Generate configuration files
# =========================================================================
echo ""
info "Writing .env.production..."
cat > .env.production <<EOF
DOMAIN=${DOMAIN}
NODE_ENV=production

POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

SESSION_SECRET=${SESSION_SECRET}

AI_PROVIDER=${AI_PROVIDER}
AI_MODEL=${AI_MODEL}
OPENAI_API_KEY=${OPENAI_API_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}

SOCKET_PORT=3001
NEXT_PUBLIC_SOCKET_URL=${NEXT_PUBLIC_SOCKET_URL}
NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

AUTHENTIK_SECRET_KEY=${AUTHENTIK_SECRET_KEY}
AUTHENTIK_BOOTSTRAP_PASSWORD=${ADMIN_PASSWORD}
AUTHENTIK_BOOTSTRAP_TOKEN=${AUTHENTIK_BOOTSTRAP_TOKEN}
AUTHENTIK_BOOTSTRAP_EMAIL=${ADMIN_EMAIL}
AUTHENTIK_POSTGRES_USER=${AUTHENTIK_POSTGRES_USER}
AUTHENTIK_POSTGRES_PASSWORD=${AUTHENTIK_POSTGRES_PASSWORD}
AUTHENTIK_POSTGRES_DB=${AUTHENTIK_POSTGRES_DB}
EOF
success ".env.production written."

info "Generating nginx configuration..."
export DOMAIN
envsubst '${DOMAIN}' < nginx/nginx.conf.template > nginx/nginx.conf
success "nginx/nginx.conf generated for ${DOMAIN}."

# =========================================================================
# Phase 3: Build and start services
# =========================================================================
echo ""
info "Building Docker images (this may take a few minutes)..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --quiet

info "Starting services..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
info "Waiting for Authentik to become healthy (this can take 1-2 minutes)..."
ATTEMPTS=0
MAX_ATTEMPTS=60
while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    if curl -sf "http://localhost/api/v3/root/config/" \
        -H "Authorization: Bearer ${AUTHENTIK_BOOTSTRAP_TOKEN}" \
        >/dev/null 2>&1; then
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    sleep 5
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    fail "Authentik did not become healthy after 5 minutes. Check logs with: docker compose -f docker-compose.prod.yml logs authentik-server"
fi
success "All services are running."

# =========================================================================
# Phase 4: Configure Authentik via API
# =========================================================================
echo ""
info "Configuring Authentik..."

# 4a. Get the default authorization flow
info "  Finding authorization flow..."
FLOW_RESPONSE=$(api_call GET "/flows/instances/?designation=authorization&ordering=slug")
FLOW_PK=$(echo "$FLOW_RESPONSE" | jq -r '.results[0].pk // empty')
if [ -z "$FLOW_PK" ]; then
    fail "Could not find an authorization flow. Authentik may not have finished initializing."
fi
success "  Authorization flow: ${FLOW_PK}"

# 4b. Create the excalidraw-users group
info "  Creating 'excalidraw-users' group..."
GROUP_RESPONSE=$(api_call POST "/core/groups/" "{\"name\":\"excalidraw-users\"}")
GROUP_PK=$(echo "$GROUP_RESPONSE" | jq -r '.pk // empty')
if [ -z "$GROUP_PK" ]; then
    fail "Failed to create group. Response: ${GROUP_RESPONSE}"
fi
success "  Group created: ${GROUP_PK}"

# 4c. Get the default akadmin user and rename it
info "  Renaming default 'akadmin' account to '${ADMIN_USERNAME}'..."
USER_RESPONSE=$(api_call GET "/core/users/?username=akadmin")
USER_PK=$(echo "$USER_RESPONSE" | jq -r '.results[0].pk // empty')
if [ -z "$USER_PK" ]; then
    fail "Could not find the default akadmin user."
fi

RENAME_RESPONSE=$(api_call PATCH "/core/users/${USER_PK}/" \
    "{\"username\":\"${ADMIN_USERNAME}\",\"email\":\"${ADMIN_EMAIL}\",\"name\":\"${ADMIN_USERNAME}\"}")
RENAMED_USER=$(echo "$RENAME_RESPONSE" | jq -r '.username // empty')
if [ "$RENAMED_USER" != "$ADMIN_USERNAME" ]; then
    fail "Failed to rename admin user. Response: ${RENAME_RESPONSE}"
fi
success "  Admin account renamed to '${ADMIN_USERNAME}'"

# 4d. Add admin user to the group
info "  Adding admin to 'excalidraw-users' group..."
api_call POST "/core/groups/${GROUP_PK}/add_user/" "{\"pk\":${USER_PK}}" >/dev/null 2>&1 || true
success "  Admin added to group."

# 4e. Create the proxy provider (forward auth single application)
info "  Creating forward auth proxy provider..."
PROVIDER_RESPONSE=$(api_call POST "/providers/proxy/" \
    "{\"name\":\"Excalidraw Forward Auth\",\"authorization_flow\":\"${FLOW_PK}\",\"external_host\":\"http://${DOMAIN}\",\"mode\":\"forward_single\"}")
PROVIDER_PK=$(echo "$PROVIDER_RESPONSE" | jq -r '.pk // empty')
if [ -z "$PROVIDER_PK" ]; then
    fail "Failed to create proxy provider. Response: ${PROVIDER_RESPONSE}"
fi
success "  Proxy provider created: ${PROVIDER_PK}"

# 4f. Create the application
info "  Creating Excalidraw application..."
APP_RESPONSE=$(api_call POST "/core/applications/" \
    "{\"name\":\"Excalidraw\",\"slug\":\"excalidraw\",\"provider\":${PROVIDER_PK},\"meta_launch_url\":\"http://${DOMAIN}\"}")
APP_PK=$(echo "$APP_RESPONSE" | jq -r '.pk // empty')
if [ -z "$APP_PK" ]; then
    fail "Failed to create application. Response: ${APP_RESPONSE}"
fi
success "  Application created: ${APP_PK}"

# 4g. Bind the group to the application (restricts access to group members only)
info "  Binding 'excalidraw-users' group to application..."
api_call POST "/policies/bindings/" \
    "{\"target\":\"${APP_PK}\",\"group\":\"${GROUP_PK}\",\"order\":0,\"enabled\":true}" >/dev/null 2>&1
success "  Group binding created. Only group members can access the app."

# 4h. Assign the provider to the embedded outpost
info "  Configuring embedded outpost..."
OUTPOST_RESPONSE=$(api_call GET "/outposts/instances/")
OUTPOST_PK=$(echo "$OUTPOST_RESPONSE" | jq -r '.results[] | select(.managed == "goauthentik.io/outposts/embedded") | .pk')
if [ -z "$OUTPOST_PK" ]; then
    OUTPOST_PK=$(echo "$OUTPOST_RESPONSE" | jq -r '.results[0].pk // empty')
fi

if [ -z "$OUTPOST_PK" ]; then
    fail "Could not find the embedded outpost."
fi

OUTPOST_CURRENT=$(api_call GET "/outposts/instances/${OUTPOST_PK}/")
CURRENT_PROVIDERS=$(echo "$OUTPOST_CURRENT" | jq -c "[.providers[]?] + [${PROVIDER_PK}] | unique")
OUTPOST_NAME=$(echo "$OUTPOST_CURRENT" | jq -r '.name')

api_call PATCH "/outposts/instances/${OUTPOST_PK}/" \
    "{\"providers\":${CURRENT_PROVIDERS},\"config\":{\"authentik_host\":\"http://authentik-server:9000\"}}" >/dev/null 2>&1
success "  Outpost '${OUTPOST_NAME}' configured with Excalidraw provider."

success "Authentik fully configured."

# =========================================================================
# Phase 5: Summary
# =========================================================================
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║          Installation Complete!               ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Application:${NC}       http://${DOMAIN}"
echo -e "  ${BOLD}Authentik Admin:${NC}   http://${DOMAIN}/if/admin/"
echo -e "  ${BOLD}Admin Username:${NC}    ${ADMIN_USERNAME}"
echo -e "  ${BOLD}Admin Password:${NC}    (the password you entered during setup)"
echo ""
echo -e "  ${BOLD}To grant a new user access:${NC}"
echo -e "    1. Log into the Authentik admin panel"
echo -e "    2. Go to ${BLUE}Directory > Users > Create${NC}"
echo -e "    3. Go to ${BLUE}Directory > Groups > excalidraw-users${NC}"
echo -e "    4. Add the new user to the group"
echo -e "    5. Share the app URL — they log in with their Authentik credentials"
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo -e "    View logs:     docker compose -f docker-compose.prod.yml logs -f"
echo -e "    Stop:          docker compose -f docker-compose.prod.yml --env-file .env.production down"
echo -e "    Restart:       docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo ""
