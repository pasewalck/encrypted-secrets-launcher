#!/usr/bin/env bash
set -euo pipefail

CONF_DIR="${CONF_DIR:-/etc/init-secret-launcher/conf.d}"

log() { echo "$@" >&2; }

check_status() {
	local url="$1" body
	body=$(curl -s -w "%{http_code}" "$url/api/status" 2>/dev/null) || return 1
	local code="${body: -3}"
	body="${body:0: -3}"
	[[ "$code" != "200" ]] && { echo "unexpected"; return 0; }
	case "$body" in
		*'"status":"unlocked"'*) echo "unlocked" ;;
		*'"status":"locked"'*)   echo "locked" ;;
		*)                       echo "unexpected" ;;
	esac
}

unlock() {
	local url="$1" password="$2" body
	body=$(curl -s -w "%{http_code}" -X POST "$url/api/unlock" \
		-H "Content-Type: application/json" \
		-d "{\"password\":\"$password\"}" 2>/dev/null) || return 1
	local code="${body: -3}"
	body="${body:0: -3}"
	[[ "$code" != "200" ]] && { echo "unexpected"; return 0; }
	echo "$body"
}

process_config() {
	local name="$1" url="$2" password="$3" status
	status=$(check_status "$url") || {
		log "($name): Cannot reach $url — will retry on next timer tick"
		return
	}
	case "$status" in
		unexpected)
			log "($name): Launcher is gone — app is likely running" ;;
		unlocked)
			log "($name): Already unlocked" ;;
		locked)
			log "($name): Locked. Attempting unlock..."
			local unlock_body
			unlock_body=$(unlock "$url" "$password") || {
				log "($name): Unlock request failed — will retry on next timer tick"
				return
			}
			case "$unlock_body" in
				unexpected)
					log "($name): Launcher gone before unlock completed — app is running" ;;
				*'"status":"unlocked"'*)
					log "($name): Successfully unlocked!" ;;
				*)
					log "($name): Unexpected response: $unlock_body — will retry on next timer tick" ;;
			esac
			;;
	esac
}

main() {
	shopt -s nullglob
	local files=("$CONF_DIR"/*.conf)
	shopt -u nullglob
	[[ ${#files[@]} -eq 0 ]] && { log "No .conf files found in $CONF_DIR"; exit 0; }
	for f in "${files[@]}"; do
		local name
		name=$(basename "$f" .conf)
		LAUNCHER_URL=""; PASSWORD=""
		source "$f"
		LAUNCHER_URL="${LAUNCHER_URL%$'\r'}"
		PASSWORD="${PASSWORD%$'\r'}"
		[[ -z "$LAUNCHER_URL" || -z "$PASSWORD" ]] && {
			log "WARNING: Skipping $f — LAUNCHER_URL and PASSWORD are required"
			continue
		}
		process_config "$name" "$LAUNCHER_URL" "$PASSWORD"
	done
}

main "$@"
