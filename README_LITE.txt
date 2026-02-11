================================================================================
STAKE PARCEIROS - DEPLOYMENT PACKAGE (LITE)
================================================================================

This package contains source code, frontend build, and your live database.
It is optimized for size (<100MB) and requires installing dependencies.

--- CONTENTS ---
1. /src           - Backend and Frontend Source
2. /dist          - Compiled Frontend (Ready to serve)
3. local.sqlite   - Your Live Database (Users, Bets, Config)
4. Config files   - package.json, tsconfig.json, .env

--- HOW TO DEPLOY ---

1. Unzip:
   unzip final_project_lite.zip
   cd webapp

2. Install Dependencies (Required):
   npm install

3. Start Server:
   npm start

   OR for logs:
   npx tsx src/run-server.ts

--- NOTES ---
- The frontend is already built in /dist. You do NOT need to run 'npm run build' unless you modify the UI.
- Your database is included. Do not overwrite 'local.sqlite' if you are updating an existing server.

Good luck!
