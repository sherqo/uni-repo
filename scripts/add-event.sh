#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
add-event.sh - Add calendar events via /api/events

USAGE
  Add event:
    scripts/add-event.sh -u API_URL -k SECRET -t TITLE -s START_ISO -c SLUGS [-e END_ISO] [-d DESCRIPTION]

  List slugs:
    scripts/add-event.sh -u API_URL -k SECRET -l

OPTIONS
  -u  API URL (required)
      Example: https://uni-repo.sherqo.me/api/events

  -k  API secret (required)

  -l  List all available slugs and exit

  -t  Event title (required for add mode)

  -d  Event description (optional)

  -s  Start time in ISO-8601 UTC (required for add mode)
      Example: 2026-04-13T20:00:00Z

  -e  End time in ISO-8601 UTC (optional)
      Example: 2026-04-13T21:00:00Z

  -c  Comma-separated slugs (required for add mode)
      Example: ai,test

  -h  Show this help and exit

NOTES
  - Missing slugs are auto-created by the API.
  - If -e is omitted, event is created with start_time only.

EXAMPLES
  Add start-only event:
  scripts/add-event.sh \
    -u "https://uni-repo.sherqo.me/api/events" \
    -k "your-secret" \
    -t "AI Assignment Deadline" \
    -s "2026-04-13T20:00:00Z" \
    -c "ai,test" \
    -d "Submit via LMS"

  Add timed event:
  scripts/add-event.sh \
    -u "https://uni-repo.sherqo.me/api/events" \
    -k "your-secret" \
    -t "AI Assignment Deadline" \
    -s "2026-04-13T20:00:00Z" \
    -e "2026-04-13T21:00:00Z" \
    -c "ai,test"

  List slugs:
  scripts/add-event.sh -u "https://uni-repo.sherqo.me/api/events" -k "your-secret" -l
EOF
}

API_URL=""
SECRET=""
TITLE=""
DESCRIPTION=""
START_TIME=""
END_TIME=""
SLUGS=""
LIST_ONLY=0

while getopts ":u:k:t:d:s:e:c:lh" opt; do
  case "$opt" in
    u) API_URL="$OPTARG" ;;
    k) SECRET="$OPTARG" ;;
    t) TITLE="$OPTARG" ;;
    d) DESCRIPTION="$OPTARG" ;;
    s) START_TIME="$OPTARG" ;;
    e) END_TIME="$OPTARG" ;;
    c) SLUGS="$OPTARG" ;;
    l) LIST_ONLY=1 ;;
    h)
      usage
      exit 0
      ;;
    \?)
      printf 'Unknown option: -%s\n\n' "$OPTARG" >&2
      usage
      exit 1
      ;;
    :)
      printf 'Missing value for -%s\n\n' "$OPTARG" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$API_URL" || -z "$SECRET" ]]; then
  printf 'Missing required arguments: -u and -k are always required.\n\n' >&2
  usage
  exit 1
fi

if [[ "$LIST_ONLY" -eq 1 ]]; then
  curl --fail-with-body --silent --show-error \
    -G "$API_URL" \
    --data-urlencode "secret=$SECRET"
  printf '\n'
  exit 0
fi

if [[ -z "$TITLE" || -z "$START_TIME" || -z "$SLUGS" ]]; then
  printf 'Add mode requires: -t -s -c\n\n' >&2
  usage
  exit 1
fi

if [[ -n "$END_TIME" ]]; then
  PAYLOAD=$(cat <<EOF
{"secret":"$SECRET","title":"$TITLE","description":"$DESCRIPTION","start_time":"$START_TIME","end_time":"$END_TIME","slugs":"$SLUGS"}
EOF
)
  curl --fail-with-body --silent --show-error \
    -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    --data "$PAYLOAD"
else
  PAYLOAD=$(cat <<EOF
{"secret":"$SECRET","title":"$TITLE","description":"$DESCRIPTION","start_time":"$START_TIME","slugs":"$SLUGS"}
EOF
)
  curl --fail-with-body --silent --show-error \
    -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    --data "$PAYLOAD"
fi

printf '\n'
