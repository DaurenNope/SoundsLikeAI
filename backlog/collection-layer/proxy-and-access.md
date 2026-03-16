# Proxy + Regional Access

## Goal
Ensure public and authenticated collection works in blocked regions (e.g., Reddit).

## Current state
- Global proxy support via `HTTP_PROXY/HTTPS_PROXY`
- Reddit public fallback via PullPush

## Gaps
- Official Reddit API credentials not wired in current env
- Proxy availability/quality not monitored

## To do
- Provide stable proxy/VPN path for Reddit
- Add proxy health check + fallback
- Document proxy usage for local + server

## Acceptance
- Reddit public + authenticated collection succeeds from blocked region
