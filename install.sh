#!/usr/bin/env bash
# Installer for the Product-Live Data Factory AI skills and agents.
#
# Copies the skills and agents of https://github.com/Product-Live/ai-agents
# into the directories read by Claude Code, OpenAI Codex, Gemini CLI
# (and Antigravity CLI) and Mistral Vibe. It never edits platform settings.
#
# Usage: install.sh [--claude] [--codex] [--gemini] [--vibe] [--all] [--local]
#                   [--ref <branch|tag>] [--check] [--uninstall] [--dry-run] [--help]
#
# Compatible with bash 3.2 and later.
set -euo pipefail

REPO="${AI_AGENTS_REPO:-Product-Live/ai-agents}"
HOME_DIR="${AI_AGENTS_HOME:-${HOME:-}}"
MANIFEST_NAME=".product-live-ai-agents.manifest"
STATE_DIR_NAME=".product-live-ai-agents"
STATE_FILE_NAME="install.json"
LOCAL_STATE_NAME=".product-live-ai-agents.json"

if [ -t 1 ]; then
    C_BLUE='\033[0;34m'; C_GREEN='\033[0;32m'; C_YELLOW='\033[0;33m'; C_RED='\033[0;31m'; C_RESET='\033[0m'
else
    C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_RESET=''
fi

info() { printf '%b[INFO]%b %s\n' "$C_BLUE" "$C_RESET" "$1"; }
ok()   { printf '%b[OK]%b %s\n' "$C_GREEN" "$C_RESET" "$1"; }
warn() { printf '%b[WARN]%b %s\n' "$C_YELLOW" "$C_RESET" "$1"; }
err()  { printf '%b[ERROR]%b %s\n' "$C_RED" "$C_RESET" "$1" >&2; }
fail() { err "$1"; exit 1; }

usage() {
    cat <<'EOF'
Usage: install.sh [platforms] [options]

Platforms (default: auto-detect, fallback --claude):
  --claude      Claude Code: ~/.claude/skills and ~/.claude/agents
  --codex       OpenAI Codex: ~/.agents/skills and ~/.codex/agents
  --gemini      Gemini CLI and Antigravity CLI: ~/.agents/skills, ~/.gemini/agents,
                ~/.gemini/antigravity-cli/skills (global scope only)
  --vibe        Mistral Vibe: ~/.agents/skills and ~/.vibe/agents
  --all         All four platforms

Options:
  --local       Install into the current project (.claude/, .agents/, .codex/, .gemini/, .vibe/)
  --ref <ref>   Branch, tag or commit to install (default: main)
  --check       Compare the installed version with the VERSION file of main and exit
  --uninstall   Remove what a previous run installed (manifest-tracked entries only)
  --dry-run     Print what would happen without writing anything
  --help, -h    Show this help

Environment:
  AI_AGENTS_SOURCE_DIR   Install from a local checkout instead of downloading
  AI_AGENTS_HOME         Override the home directory (default: $HOME)
  AI_AGENTS_REPO         GitHub repository (default: Product-Live/ai-agents)

Exit codes: 0 success, 1 failure, 2 usage error.
EOF
}

WANT_CLAUDE=0
WANT_CODEX=0
WANT_GEMINI=0
WANT_VIBE=0
PLATFORM_SELECTED=0
SCOPE="global"
REF=""
MODE="install"
DRY_RUN=0
SOURCE_ROOT=""
TEMP_DIR=""
VERSION=""
DETECTION="flags"
REMAINING=""

while [ $# -gt 0 ]; do
    case "$1" in
        --claude) WANT_CLAUDE=1; PLATFORM_SELECTED=1 ;;
        --codex) WANT_CODEX=1; PLATFORM_SELECTED=1 ;;
        --gemini) WANT_GEMINI=1; PLATFORM_SELECTED=1 ;;
        --vibe) WANT_VIBE=1; PLATFORM_SELECTED=1 ;;
        --all) WANT_CLAUDE=1; WANT_CODEX=1; WANT_GEMINI=1; WANT_VIBE=1; PLATFORM_SELECTED=1 ;;
        --local) SCOPE="local" ;;
        --ref)
            shift
            if [ $# -eq 0 ] || [ -z "$1" ]; then
                err "--ref requires a value (a git tag or branch)."
                usage >&2
                exit 2
            fi
            REF="$1"
            ;;
        --ref=*) REF="${1#--ref=}" ;;
        --check|--uninstall)
            if [ "$MODE" != "install" ] && [ "$MODE" != "${1#--}" ]; then
                err "--check and --uninstall cannot be combined."
                usage >&2
                exit 2
            fi
            MODE="${1#--}"
            ;;
        --dry-run) DRY_RUN=1 ;;
        --help|-h) usage; exit 0 ;;
        *)
            err "Unknown option: $1"
            usage >&2
            exit 2
            ;;
    esac
    shift
done

[ -n "$HOME_DIR" ] || fail "Cannot determine the home directory (set HOME or AI_AGENTS_HOME)."

cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

have_cmd() { command -v "$1" >/dev/null 2>&1; }

strip_bom() {
    # Removes a UTF-8 byte order mark and a trailing CR from a string.
    local value="$1"
    value="${value#$'\xEF\xBB\xBF'}"
    value="${value%$'\r'}"
    printf '%s' "$value"
}

# Escapes a string for a JSON string literal (backslash and double quote;
# control characters are dropped).
json_escape() {
    printf '%s' "$1" | tr -d '\000-\037' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# Removes one installed entry. A symbolic link is removed as a link: its
# target is never followed (no trailing slash is ever appended to the path).
remove_entry() {
    if [ -L "$1" ]; then
        rm -f "$1"
    elif [ -e "$1" ]; then
        rm -rf "$1"
    fi
}

# Returns 0 when the path exists or is a (possibly dangling) symbolic link.
entry_exists() { [ -e "$1" ] || [ -L "$1" ]; }

# Returns 0 when the space-separated list $1 contains the word $2.
list_has() {
    case " $1 " in *" $2 "*) return 0 ;; esac
    return 1
}

# Keeps the known platform names of the list $1, in the canonical order.
canonical_list() {
    local out="" p
    for p in claude codex gemini vibe; do
        if list_has "$1" "$p"; then out="$out $p"; fi
    done
    printf '%s' "${out# }"
}

# Returns 0 when $1 is a newer semantic version than $2.
version_gt() {
    local a="${1#v}" b="${2#v}"
    a="${a%%-*}"; b="${b%%-*}"
    local i x y
    for i in 1 2 3; do
        x=$(printf '%s' "$a" | cut -d. -f"$i")
        y=$(printf '%s' "$b" | cut -d. -f"$i")
        x="${x:-0}"; y="${y:-0}"
        case "$x" in ''|*[!0-9]*) x=0 ;; esac
        case "$y" in ''|*[!0-9]*) y=0 ;; esac
        if [ "$x" -gt "$y" ]; then return 0; fi
        if [ "$x" -lt "$y" ]; then return 1; fi
    done
    return 1
}

state_file_path() {
    if [ "$SCOPE" = "local" ]; then
        printf '%s' "./$LOCAL_STATE_NAME"
    else
        printf '%s' "$HOME_DIR/$STATE_DIR_NAME/$STATE_FILE_NAME"
    fi
}

# Reads a string field from one of our state files (written one key per line).
# The value is returned as written, JSON escapes included.
state_field() {
    local file="$1" key="$2"
    [ -f "$file" ] || return 0
    sed -nE "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\"(([^\"\\\\]|\\\\.)*)\".*/\\1/p" "$file" | head -n 1
}

# Reads a string array field from one of our state files, one value per line.
state_array() {
    local file="$1" key="$2"
    [ -f "$file" ] || return 0
    sed -n "s/^[[:space:]]*\"$key\"[[:space:]]*:[[:space:]]*\[\(.*\)\].*/\1/p" "$file" \
        | tr ',' '\n' | sed 's/^[[:space:]]*"//; s/"[[:space:]]*$//' | sed '/^$/d'
}

# Prints the version in the VERSION file of the main branch, or nothing.
resolve_latest_version() {
    local version=""
    if have_cmd curl; then
        version=$(curl -fsSL --max-time 10 "https://raw.githubusercontent.com/$REPO/main/VERSION" 2>/dev/null || true)
    fi
    version=$(strip_bom "$(printf '%s\n' "$version" | head -n 1)" | tr -d '[:space:]')
    if printf '%s' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        printf '%s' "$version"
    fi
}

# ---------------------------------------------------------------------------
# Platform detection
# ---------------------------------------------------------------------------

detect_platforms() {
    local found=0
    if have_cmd claude || [ -d "$HOME_DIR/.claude" ]; then WANT_CLAUDE=1; found=1; fi
    if have_cmd codex || [ -d "$HOME_DIR/.codex" ]; then WANT_CODEX=1; found=1; fi
    if have_cmd gemini || have_cmd agy || [ -d "$HOME_DIR/.gemini" ]; then WANT_GEMINI=1; found=1; fi
    if have_cmd vibe || [ -d "$HOME_DIR/.vibe" ]; then WANT_VIBE=1; found=1; fi
    if [ "$found" -eq 1 ]; then
        DETECTION="auto-detected"
    else
        DETECTION="fallback"
        WANT_CLAUDE=1
        warn "No platform detected (no CLI on PATH, no config directory in $HOME_DIR); defaulting to Claude Code."
    fi
}

platforms_from_state() {
    local file name
    file=$(state_file_path)
    [ -f "$file" ] || return 1
    local any=0
    while IFS= read -r name; do
        case "$name" in
            claude) WANT_CLAUDE=1; any=1 ;;
            codex) WANT_CODEX=1; any=1 ;;
            gemini) WANT_GEMINI=1; any=1 ;;
            vibe) WANT_VIBE=1; any=1 ;;
        esac
    done <<EOF
$(state_array "$file" platforms)
EOF
    [ "$any" -eq 1 ] || return 1
    DETECTION="from the state file $file"
    return 0
}

platform_list() {
    local list=""
    [ "$WANT_CLAUDE" -eq 1 ] && list="$list claude"
    [ "$WANT_CODEX" -eq 1 ] && list="$list codex"
    [ "$WANT_GEMINI" -eq 1 ] && list="$list gemini"
    [ "$WANT_VIBE" -eq 1 ] && list="$list vibe"
    printf '%s' "${list# }"
}

# Flags equivalent to a platform list ($1, default: the selected platforms).
equivalent_flags() {
    local flags="" p
    for p in ${1-$(platform_list)}; do
        flags="$flags --$p"
    done
    [ "$SCOPE" = "local" ] && flags="$flags --local"
    printf '%s' "${flags# }"
}

# Platforms recorded in the state file of the current scope, space-separated.
recorded_platforms() {
    canonical_list "$(state_array "$(state_file_path)" platforms | tr '\n' ' ')"
}

# ---------------------------------------------------------------------------
# Source resolution
# ---------------------------------------------------------------------------

resolve_source() {
    if [ -n "${AI_AGENTS_SOURCE_DIR:-}" ]; then
        [ -d "$AI_AGENTS_SOURCE_DIR" ] || fail "AI_AGENTS_SOURCE_DIR does not exist: $AI_AGENTS_SOURCE_DIR"
        [ -d "$AI_AGENTS_SOURCE_DIR/skills" ] || fail "AI_AGENTS_SOURCE_DIR has no skills/ directory: $AI_AGENTS_SOURCE_DIR"
        SOURCE_ROOT=$(cd "$AI_AGENTS_SOURCE_DIR" && pwd)
        [ -n "$REF" ] || REF="checkout"
        info "Installing from the local checkout $SOURCE_ROOT"
        return
    fi

    have_cmd curl || fail "curl is required to download the archive (or set AI_AGENTS_SOURCE_DIR)."
    have_cmd tar || fail "tar is required to extract the archive (or set AI_AGENTS_SOURCE_DIR)."

    [ -n "$REF" ] || REF="main"

    TEMP_DIR=$(mktemp -d)
    local archive_url="https://github.com/$REPO/archive/$REF.tar.gz"
    info "Downloading $REPO@$REF ..."
    curl -fsSL --max-time 120 "$archive_url" -o "$TEMP_DIR/source.tar.gz" \
        || fail "Could not download $archive_url (check the ref, your network and proxy settings)."
    mkdir -p "$TEMP_DIR/src"
    tar -xzf "$TEMP_DIR/source.tar.gz" -C "$TEMP_DIR/src" || fail "Could not extract the archive."

    # Archives extract to a single top-level directory (<repo>-<ref>).
    local dir
    for dir in "$TEMP_DIR/src"/*/; do
        [ -d "$dir" ] || continue
        [ -z "$SOURCE_ROOT" ] || fail "The archive contains more than one top-level directory."
        SOURCE_ROOT="${dir%/}"
    done
    [ -n "$SOURCE_ROOT" ] || fail "The archive is empty."
    [ -d "$SOURCE_ROOT/skills" ] || fail "Invalid archive: no skills/ directory in $(basename "$SOURCE_ROOT")."
}

read_version() {
    if [ -f "$SOURCE_ROOT/VERSION" ]; then
        VERSION=$(strip_bom "$(head -n 1 "$SOURCE_ROOT/VERSION")" | tr -d '[:space:]')
    fi
    if [ -z "$VERSION" ]; then
        VERSION="0.0.0"
        warn "No VERSION file in the source tree; recording version 0.0.0."
    elif ! printf '%s' "$VERSION" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
        warn "Invalid VERSION in the source tree ($(printf '%s' "$VERSION" | head -c 40)); recording version 0.0.0."
        VERSION="0.0.0"
    fi
}

# Claude Code agents.
claude_agents_src() {
    printf '%s' "$SOURCE_ROOT/platforms/claude/agents"
}

# ---------------------------------------------------------------------------
# Sync: copy top-level entries of a source directory into a target directory
# and track them in a manifest. kind = dirs | md | toml
# ---------------------------------------------------------------------------

sync_dir() {
    local src="$1" dst="$2" label="$3" kind="$4"
    local manifest="$dst/$MANIFEST_NAME"
    local item name names="" count=0

    if [ ! -d "$src" ]; then
        warn "$label: source directory $src is missing, skipped."
        return 0
    fi

    for item in "$src"/*; do
        [ -e "$item" ] || continue
        name=$(basename "$item")
        case "$kind" in
            dirs) [ -d "$item" ] || continue ;;
            *)
                [ -f "$item" ] || continue
                case "$name" in *."$kind") ;; *) continue ;; esac
                ;;
        esac
        names="$names$name"$'\n'
        # First install in this directory: an entry we do not track is overwritten.
        if [ ! -f "$manifest" ] && entry_exists "$dst/$name"; then
            warn "$label: $dst/$name already exists and is not tracked by this installer; it will be overwritten."
        fi
    done

    if [ "$DRY_RUN" -eq 1 ]; then
        count=$(printf '%s' "$names" | grep -c . || true)
        info "(dry-run) $label: would install $count item(s) into $dst"
        printf '%s' "$names" | sed 's/^/    /'
        return 0
    fi

    mkdir -p "$dst"

    # Remove entries we installed previously that no longer exist in the source.
    if [ -f "$manifest" ]; then
        local old
        while IFS= read -r old || [ -n "$old" ]; do
            old=$(strip_bom "$old")
            [ -n "$old" ] || continue
            case "$old" in */*|..|.) continue ;; esac
            if ! printf '%s' "$names" | grep -qxF -- "$old" && entry_exists "$dst/$old"; then
                remove_entry "$dst/$old"
                warn "$label: removed obsolete entry $old"
            fi
        done < "$manifest"
    fi

    local list
    list=$(mktemp)
    printf '%s' "$names" > "$list"
    while IFS= read -r name || [ -n "$name" ]; do
        [ -n "$name" ] || continue
        remove_entry "$dst/$name"
        cp -R "$src/$name" "$dst/$name"
        count=$((count + 1))
    done < "$list"
    cp "$list" "$manifest"
    rm -f "$list"

    ok "$label: $count item(s) installed into $dst"
}

remove_dir() {
    local dst="$1" label="$2"
    local manifest="$dst/$MANIFEST_NAME"
    local name count=0

    if [ ! -f "$manifest" ]; then
        info "$label: nothing to remove in $dst"
        return 0
    fi

    if [ "$DRY_RUN" -eq 1 ]; then
        info "(dry-run) $label: would remove the entries listed in $manifest"
        sed 's/^/    /' "$manifest"
        return 0
    fi

    while IFS= read -r name || [ -n "$name" ]; do
        name=$(strip_bom "$name")
        [ -n "$name" ] || continue
        case "$name" in */*|..|.) continue ;; esac
        if entry_exists "$dst/$name"; then
            remove_entry "$dst/$name"
            count=$((count + 1))
        fi
    done < "$manifest"
    rm -f "$manifest"
    rmdir "$dst" 2>/dev/null || true
    ok "$label: removed $count item(s) from $dst"
}

# Removes a directory only when it is empty; never fails.
prune_empty_dir() {
    local dir="$1"
    [ -d "$dir" ] || return 0
    if rmdir "$dir" 2>/dev/null; then
        info "Removed the empty directory $dir"
    fi
}

# After an uninstall, removes the parent directories the installer creates when
# they ended up empty: .agents and .gemini/antigravity-cli (both scopes), and in
# project scope also .claude, .codex, .gemini and .vibe. Global assistant
# directories such as ~/.claude are never removed.
prune_parents() {
    [ "$DRY_RUN" -eq 1 ] && return 0
    prune_empty_dir "$AGENTS_BASE"
    prune_empty_dir "$GEMINI_BASE/antigravity-cli"
    if [ "$SCOPE" = "local" ]; then
        prune_empty_dir "$CLAUDE_BASE"
        prune_empty_dir "$CODEX_BASE"
        prune_empty_dir "$GEMINI_BASE"
        prune_empty_dir "$VIBE_BASE"
    fi
    return 0
}

# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------

set_targets() {
    if [ "$SCOPE" = "local" ]; then
        CLAUDE_BASE=".claude"; AGENTS_BASE=".agents"; CODEX_BASE=".codex"; GEMINI_BASE=".gemini"; VIBE_BASE=".vibe"
    else
        CLAUDE_BASE="$HOME_DIR/.claude"; AGENTS_BASE="$HOME_DIR/.agents"; CODEX_BASE="$HOME_DIR/.codex"
        GEMINI_BASE="$HOME_DIR/.gemini"; VIBE_BASE="$HOME_DIR/.vibe"
    fi
}

# apply <install|remove>
apply() {
    local op="$1"
    local skills_src="$SOURCE_ROOT/skills"

    if [ "$WANT_CLAUDE" -eq 1 ]; then
        if [ "$op" = "install" ]; then
            sync_dir "$skills_src" "$CLAUDE_BASE/skills" "Claude Code skills" dirs
            sync_dir "$(claude_agents_src)" "$CLAUDE_BASE/agents" "Claude Code agents" md
        else
            remove_dir "$CLAUDE_BASE/skills" "Claude Code skills"
            remove_dir "$CLAUDE_BASE/agents" "Claude Code agents"
        fi
    fi

    if [ "$WANT_CODEX" -eq 1 ] || [ "$WANT_GEMINI" -eq 1 ] || [ "$WANT_VIBE" -eq 1 ]; then
        if [ "$op" = "install" ]; then
            sync_dir "$skills_src" "$AGENTS_BASE/skills" "Shared skills (Codex, Gemini CLI, Vibe)" dirs
        else
            # Keep the shared skills while another installed platform still reads them.
            local users="" p
            for p in codex gemini vibe; do
                if list_has "$REMAINING" "$p"; then users="$users $p"; fi
            done
            if [ -n "$users" ]; then
                info "Shared skills (Codex, Gemini CLI, Vibe): kept in $AGENTS_BASE/skills, still used by:$users"
            else
                remove_dir "$AGENTS_BASE/skills" "Shared skills (Codex, Gemini CLI, Vibe)"
            fi
        fi
    fi

    if [ "$WANT_CODEX" -eq 1 ]; then
        if [ "$op" = "install" ]; then
            sync_dir "$SOURCE_ROOT/platforms/codex/agents" "$CODEX_BASE/agents" "Codex agents" toml
        else
            remove_dir "$CODEX_BASE/agents" "Codex agents"
        fi
    fi

    if [ "$WANT_GEMINI" -eq 1 ]; then
        if [ "$op" = "install" ]; then
            sync_dir "$SOURCE_ROOT/platforms/gemini/agents" "$GEMINI_BASE/agents" "Gemini CLI agents" md
            if [ "$SCOPE" = "global" ]; then
                sync_dir "$skills_src" "$GEMINI_BASE/antigravity-cli/skills" "Antigravity CLI skills" dirs
            fi
        else
            remove_dir "$GEMINI_BASE/agents" "Gemini CLI agents"
            if [ "$SCOPE" = "global" ]; then
                remove_dir "$GEMINI_BASE/antigravity-cli/skills" "Antigravity CLI skills"
            fi
        fi
    fi

    if [ "$WANT_VIBE" -eq 1 ]; then
        if [ "$op" = "install" ]; then
            sync_dir "$SOURCE_ROOT/platforms/vibe/agents" "$VIBE_BASE/agents" "Vibe agents" toml
        else
            remove_dir "$VIBE_BASE/agents" "Vibe agents"
        fi
    fi
}

json_string_list() {
    # Turns "a b c" into "\"a\", \"b\", \"c\"".
    local out="" word
    for word in $1; do
        if [ -n "$out" ]; then out="$out, "; fi
        out="$out\"$word\""
    done
    printf '%s' "$out"
}

# write_state [platforms version_json ref_json installedAt]
# Without arguments (install): records the selected platforms merged with the
# platforms already recorded for this scope, with the version and ref of this
# run. With arguments (partial uninstall): records exactly the given values,
# version and ref being already JSON-escaped (read back from the state file).
write_state() {
    local file list version_json ref_json now platforms flags
    file=$(state_file_path)
    if [ $# -gt 0 ]; then
        list="$1"; version_json="$2"; ref_json="$3"; now="$4"
    else
        list=$(canonical_list "$(recorded_platforms) $(platform_list)")
        version_json=$(json_escape "$VERSION")
        ref_json=$(json_escape "$REF")
        now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    fi
    [ -n "$now" ] || now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    platforms=$(json_string_list "$list")
    flags=$(json_string_list "$(equivalent_flags "$list")")

    if [ "$DRY_RUN" -eq 1 ]; then
        info "(dry-run) would write the state file $file"
        return 0
    fi
    mkdir -p "$(dirname "$file")"
    cat > "$file" <<EOF
{
  "version": "$version_json",
  "ref": "$ref_json",
  "platforms": [$platforms],
  "scope": "$SCOPE",
  "installedAt": "$now",
  "flags": [$flags]
}
EOF
    ok "State written to $file"
}

remove_state() {
    local file
    file=$(state_file_path)
    if [ "$DRY_RUN" -eq 1 ]; then
        info "(dry-run) would remove the state file $file"
        return 0
    fi
    if [ -f "$file" ]; then
        rm -f "$file"
        if [ "$SCOPE" = "global" ]; then
            rm -f "$HOME_DIR/$STATE_DIR_NAME/latest.json"
            rmdir "$HOME_DIR/$STATE_DIR_NAME" 2>/dev/null || true
        fi
        ok "State file removed: $file"
    fi
}

print_hints() {
    echo ""
    info "Platforms: $(platform_list) ($DETECTION)"
    info "Equivalent command: install.sh $(equivalent_flags)"
    if [ "$WANT_CLAUDE" -eq 1 ]; then
        info "Claude Code: start a new session or run /reload-skills to load the skills."
    fi
    if [ "$WANT_CODEX" -eq 1 ]; then
        info "Codex: start a new session to load the skills and agents."
    fi
    if [ "$WANT_GEMINI" -eq 1 ]; then
        info "Gemini CLI: run /skills reload (Antigravity CLI: /skills reload as well)."
    fi
    if [ "$WANT_VIBE" -eq 1 ]; then
        info "Mistral Vibe: run /reload if the skills do not appear."
    fi
    if [ "$SCOPE" = "local" ]; then
        info "Project-level skills and agents are loaded only when the folder is trusted (Codex, Gemini CLI, Vibe)."
    fi
}

# ---------------------------------------------------------------------------
# Modes
# ---------------------------------------------------------------------------

run_check() {
    local file installed latest
    file="./$LOCAL_STATE_NAME"
    [ -f "$file" ] || file="$HOME_DIR/$STATE_DIR_NAME/$STATE_FILE_NAME"
    installed=$(state_field "$file" version)
    if [ -z "$installed" ]; then
        warn "No installation state found (looked for ./$LOCAL_STATE_NAME and $HOME_DIR/$STATE_DIR_NAME/$STATE_FILE_NAME)."
        info "Install the skills with this script first (see --help)."
    else
        info "Installed version: $installed (state file: $file)"
    fi
    latest=$(resolve_latest_version)
    if [ -z "$latest" ]; then
        warn "Could not read the VERSION file of $REPO on main (network or proxy)."
        return 0
    fi
    info "Latest version: $latest"
    if [ -n "$installed" ] && version_gt "$latest" "$installed"; then
        warn "An update is available: $installed -> $latest. Rerun this installer to update."
    elif [ -n "$installed" ]; then
        ok "The installed version is up to date."
    fi
}

run_uninstall() {
    if [ "$PLATFORM_SELECTED" -eq 0 ]; then
        platforms_from_state || detect_platforms
    fi
    set_targets
    # Platforms recorded in the state file that this run does not uninstall.
    local recorded p
    recorded=$(recorded_platforms)
    REMAINING=""
    for p in $recorded; do
        if ! list_has "$(platform_list)" "$p"; then REMAINING="$REMAINING $p"; fi
    done
    REMAINING="${REMAINING# }"
    info "Uninstalling ($SCOPE scope) for: $(platform_list)"
    apply remove
    prune_parents
    if [ -n "$REMAINING" ]; then
        local file
        file=$(state_file_path)
        info "Still installed ($SCOPE scope): $REMAINING"
        write_state "$REMAINING" "$(state_field "$file" version)" "$(state_field "$file" ref)" "$(state_field "$file" installedAt)"
    else
        remove_state
    fi
    echo ""
    ok "Uninstall complete."
}

run_install() {
    if [ "$PLATFORM_SELECTED" -eq 0 ]; then
        detect_platforms
    fi
    if [ "$SCOPE" = "local" ] && [ ! -e ".git" ]; then
        warn "No .git in the current directory: --local installs into the current directory, run it from the project root."
    fi
    set_targets
    resolve_source
    read_version
    info "Installing version $VERSION ($SCOPE scope) for: $(platform_list)"
    apply install
    write_state
    echo ""
    if [ "$DRY_RUN" -eq 1 ]; then
        ok "Dry run complete: nothing was written."
    else
        ok "Installation complete (version $VERSION, ref $REF, $SCOPE scope)."
    fi
    print_hints
}

case "$MODE" in
    check) run_check ;;
    uninstall) run_uninstall ;;
    install) run_install ;;
esac
