## Summary

`Request.base_url` and `Request.url_for()` ignore the RFC 7239 `Forwarded`
header. Behind a reverse proxy that preserves `Forwarded` but does not rewrite
the ASGI `scope['server']` / `scope['scheme']`, generated absolute URLs leak the
internal host/scheme (e.g. `http://127.0.0.1:8000/...`) instead of the
client-facing authority.

This adds a small, dependency-free parser for the `Forwarded` header and
consults it, in RFC-precedence order, when computing `base_url`:
`Forwarded` → `X-Forwarded-*` (existing) → `scope`.

## Changes
- `starlette/_forwarded.py` — parse `Forwarded` (proto/host), first entry wins,
  handles quoted values, multiple params, and malformed input safely.
- `starlette/requests.py` — `base_url` prefers `Forwarded` host/scheme when present.
- `tests/test_forwarded.py` — 16 tests covering single/multi entry, quoted
  values, precedence, and malformed headers. All pass.

## Behavior notes
- No change when the header is absent (fully backward compatible).
- Malformed `Forwarded` falls back to existing behavior; never raises.
- Honors the left-most (client-facing) entry per RFC 7239 §4.

## Testing
```
pytest tests/test_forwarded.py -q   # 16 passed
```
