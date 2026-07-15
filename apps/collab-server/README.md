# @gridstage/collab-server

Runs the official Yjs websocket relay (`@y/websocket-server`) — one CRDT room
per shared session, awareness carries cursors/selection/presence.

```bash
HOST=0.0.0.0 PORT=1234 pnpm --filter @gridstage/collab-server start
```

Verified 2026-07-06: two `yjs@13` / `y-websocket@3` clients sync data and
awareness through this server (which uses the yjs v14 RC internally — wire
protocol is compatible; re-check when upgrading either side).

Rooms are in-memory: state lives as long as the server process (plus at least
one connected client). Persistent rooms (Redis/Postgres backing, auth on
connect, snapshot hooks into `version_snapshot`) come with the backend work.
