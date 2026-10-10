# Release Process

This repository is designed for GitHub-source installation by DeepSeek Harness.

## Checklist

1. Update source files under `src/`.
2. Run `pnpm run typecheck`.
3. Run `pnpm run build:client`.
4. Confirm `lib/` changed when runtime output changed.
5. Run `node scripts/check-rename.mjs` to check the published loader, route, and warning-setting migration.
6. Update `CHANGELOG.md`.
7. Push the release commit.

## Marketplace Notes

The awesome-dsh-plugin submission gate checks public availability, the bundle declaration, and a repository age of at least one day. The contribution guide also requires the `dsh-plugin` topic; there is no commit-count requirement.

Use the `dsh-plugin` GitHub topic and keep the README install command current:

```bash
dsh plugin --profile web add github:Hann428/dsh-hann-usage-dashboard
```

If the repository is too new, wait until it satisfies the age gate and rerun the marketplace submission.
