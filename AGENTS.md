# ترازینو (Tarazino) - AI Agent Guidelines

Refer to `.agents/rules/project-guidelines.md` for comprehensive guidelines on:
- Android Release builds with `release-key.jks` and `assembleRelease`.
- Multi-platform Capacitor Icon and Branding assets pipeline.
- Nobitex API integration with direct config overrides.
- App store marketing assets lossless compression standards.
- Mobile/RTL/offline/Git standards: `rules.md`.
- Active architecture roadmap (schemas, formulas, loops 1–7): `plan.md`.

## Engineering & Architecture Lessons Learned

### Git Workflow
- Automatically run `git add` and `git commit` after each completed task (after verification passes).
- Never track, modify, or commit `android/release-key.jks` or `android/key.properties`.

### Multi-User Profile & Vault Isolation
- Every persisted key (`storage.ts`, `useCurrencyDisplay`, `useMarketData`, Nobitex buy-price caches) must be scoped by `profileId` via `getProfileScopedKey` / `setActiveStorageProfileId`.
- Sync-back effects in `src/App.tsx` must check `hydratedProfileId === activeProfileId` and `loadedProfileId === activeProfileId` before writing to `deviceVault`, preventing React batch lag from leaking stale state across profile switches.
- Abort in-flight async requests (`AbortController` + generation counter) on profile switch or unmount, use refs for latest state inside async callbacks/intervals, and flush pending vault writes (`flushDeviceVault()`) on profile transitions.
- Auto-restore the saved `activeProfileId` (falling back to `profiles[0]`) on launch without forcing `ProfileSwitcherModal`; show onboarding only when zero profiles exist.

### Security & Backup Integrity
- Keep `secretKey` and `token` encrypted at rest via WebCrypto AES-256-GCM in `src/utils/deviceVault.ts`, redact credentials from exports/logs (`redactSecrets`), and decode untrusted JSON through `safeJsonParse` / `sanitizePlainData` to block prototype pollution.
- Validate backup schemas before mutating storage and preserve atomic rollback on `localStorage` write errors (`importBackupData`).
- Disallow cleartext HTTP (`android:usesCleartextTraffic="false"`, `allowMixedContent: false`), unencrypted ADB backups (`android:allowBackup="false"`), and API caching in service workers (`public/sw.js` and `vite.config.ts`).

### UI, RTL Mobile, Performance & Test Suite Invariants
- Avoid un-prefixed dark tokens (`bg-slate-950`, `text-slate-100`, `border-slate-800`) in `src/**/*.{ts,tsx}` (enforced by verification test `AST-1`); always pair light/dark utility classes.
- Preserve layout/theme test contracts in `Header.tsx`, `App.tsx` (`max-w-4xl mx-auto px-4 py-5 space-y-5`), `DashboardView.tsx`, `useTheme.ts`, `index.css`, and `index.html`.
- Prevent 320px+ RTL clipping using `min-w-0`, `truncate`, `tabular-nums`, and `dir-ltr` on currency values; drive continuous touch physics (`PullToRefreshContainer.tsx`) via refs + `requestAnimationFrame` + GPU `translate3d` and guard against open modals (`data-modal-open`).
- Lazy-load non-initial tabs/modals (`React.lazy` + `Suspense`) and verify every change with `npx tsc --noEmit && npm run test && npm run build`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context (one `CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.
