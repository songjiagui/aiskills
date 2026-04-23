# Project Structure

## Overview

This project has been refactored so `app.js` is only the server entry point. The main business logic now lives under `server/`.

## Directory Layout

```text
app.js
server/
  banner.js
  constants.js
  state.js
  middleware/
    auth.js
  routes/
    auth-routes.js
    api-routes.js
    page-routes.js
  services/
    auth-service.js
    chat-service.js
    config-service.js
  utils/
    json-store.js
```

## Module Responsibilities

### `app.js`

- Creates the Express app
- Registers middleware and static assets
- Mounts routes
- Starts the HTTP server

### `server/constants.js`

- Centralizes shared paths and default configuration
- Exports the system prompt and runtime constants

### `server/state.js`

- Stores in-memory runtime state
- Includes chat sessions and active streaming requests

### `server/utils/json-store.js`

- Provides JSON file read/write helpers
- Uses `mtime`-based cache invalidation
- Allows external JSON edits to be picked up without restart

### `server/services/auth-service.js`

- Handles user persistence and password verification
- Initializes the default admin account when needed

### `server/services/config-service.js`

- Reads and writes assistant config and model config
- Builds tool schema from `skills.json`
- Caches tool definitions until the file changes

### `server/services/chat-service.js`

- Handles chat session creation
- Calls the model API
- Parses streaming SSE chunks
- Executes tool calls and streams progress updates

### `server/middleware/auth.js`

- Provides authentication checks for routes

### `server/routes/auth-routes.js`

- Login page
- Login, logout, and auth status APIs

### `server/routes/api-routes.js`

- Protected API routes for health, config, model management, server control, and chat

### `server/routes/page-routes.js`

- Protected page routes and final fallback rendering

## Notes

- Editing `assistant.config.json`, `models.json`, `skills.json`, or `users.json` does not normally require restart.
- Editing `skills/*.js` still requires restart because Node module loading is cached.
