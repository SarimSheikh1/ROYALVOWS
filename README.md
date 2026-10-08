# RoyalVows

Every Love Story Deserves a Palace.

The React/TypeScript frontend, Express API and MongoDB business platform are in [royalvows](royalvows/README.md). Work is committed and pushed to this repository in logical phases.

## Run a local demo

Install Node.js 24, then open PowerShell in this repository:

```powershell
cd royalvows
npm ci
npm run demo
```

Open http://localhost:5173. This uses a **real temporary MongoDB replica set**, not browser storage. Randomized administrator credentials are written privately to `.runtime/demo-access.txt` (ignored by Git). Demo data disappears when the launcher stops. For persistent storage use the Docker or Atlas setup in the detailed README.

See [feature status](royalvows/FEATURE_STATUS.md) for implemented features, executed checks and remaining limitations. Live merchant gateways, messaging providers and production deployment are not configured.
