# Troubleshooting

## Activation Reports Failed to Import

Version 0.0.4 fixes the missing legacy `schemastery` dependency in desktop installs by using Harness's official `@deepseek-ai/schemastery` package. If version 0.0.3 installs but fails to activate, uninstall it and install the repository again, then restart Harness. The package name and saved warning thresholds are unchanged.

## Installation Reports No Bundle

Use `https://github.com/Hann428/dsh-hann-usage-dashboard` as the installation source. The old bare name `dsh-usage-dashboard` resolves to an unrelated npm package that does not declare a Harness bundle. This project includes `dsh.bundle` and committed runtime files for GitHub installation.

## Duplicate Usage Tabs

Uninstall the old `dsh-usage-dashboard` plugin in the affected profile before installing `dsh-hann-usage-dashboard`, then restart Harness. The renamed plugin has a new registration id, so it does not automatically replace an installed package with the old name.

## Missing API Key

Configure `DEEPSEEK_API_KEY` in DeepSeek Harness Settings -> Models. The plugin uses that credential reference by default.

If you use a different credential name, set `keyRef` in the plugin config.

## Balance Fails

Check these first:

- The key is valid for DeepSeek's API.
- `baseURL` is `https://api.deepseek.com`.
- The host machine can reach DeepSeek's API.
- The API key has remaining account access and has not been rotated.

## Pricing Fails

The balance row can still render when pricing fails. Pricing is fetched from DeepSeek's official documentation at runtime so the panel can reflect price updates without a plugin release.

If pricing fails, check whether the host machine can reach the docs page and whether the docs layout changed.

## Platform Page Requires Login

The platform usage page opens in the browser and uses DeepSeek's own web session. Harness API-key configuration does not sign the browser into DeepSeek's platform.

## Plugin Does Not Appear

Restart `dsh web` after installation. If the tab still does not appear, open Harness plugin settings and confirm that `dsh-hann-usage-dashboard` is installed in the same profile used by the web app.
