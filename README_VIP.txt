================================================================================
STAKE PARCEIROS - FULL DEPLOYMENT PACKAGE
================================================================================

This package contains the COMPLETE source code, database, and dependencies.
It is designed to be "Directly Deployable".

--- CONTENTS ---
1. /src           - Backend and Frontend Source Code
2. /dist          - Compiled Frontend (Ready to serve)
3. /node_modules  - Installed Dependencies (Pre-installed for Linux)
4. local.sqlite   - Your Database (Contains all your users and matches)
5. .env           - Configuration

--- HOW TO RUN (LINUX/VPS) ---
1. Unzip this file:
   unzip full_project.zip
   cd webapp

2. Start the Server:
   npm start

   OR (if you want to see logs):
   npx tsx src/run-server.ts

--- HOW TO RUN (WINDOWS) ---
WARNING: The 'node_modules' folder included here is built for Linux.
If you run on Windows and get errors:
1. Delete the 'node_modules' folder.
2. Open terminal in this folder.
3. Run: npm install
4. Run: npm start

--- TROUBLESHOOTING ---
- If matches are empty: Ensure your 'bets_api_key' is set in Admin > Settings, or rely on the included Dummy data fallback.
- If database is locked: Ensure no other node processes are running.

Good luck!
