# dsh-hann-usage-dashboard

DeepSeek usage and billing panel for DeepSeek Harness Web.

It adds a compact **Usage** tab to the conversation view. The tab shows the DeepSeek account balance, current official peak/off-peak pricing, the next price-window countdown, and a direct link to the DeepSeek platform usage page.

## Quick install from GitHub

In the desktop app's **Add plugin** dialog, enter the full repository URL:

```text
https://github.com/Hann428/dsh-hann-usage-dashboard
```

The following command installs into the Web profile:

```bash
dsh plugin --profile web add github:Hann428/dsh-hann-usage-dashboard
```

Restart `dsh web`, then open any conversation and select the **Usage** tab.

For the desktop app, restart the app after installation. This repository is distributed through GitHub; do not use a bare npm package name as the install source.

## Upgrade from the old name

Version 0.0.3 renames the repository, package, client module, and Usage tab registration from `dsh-usage-dashboard` to `dsh-hann-usage-dashboard`. Uninstall the old plugin in the same Harness profile before installing this version, then restart Harness. Keeping both versions enabled creates duplicate Usage tabs and balance tools.

On the same browser origin, saved warning thresholds are copied from the old storage key when the new key is absent. Moving from the Web app to the desktop app may use a different origin, so enter those settings again if needed. API keys remain in Harness credentials and are not copied by this migration.

Requirements:

- DeepSeek Harness Web with plugin support.
- A configured `DEEPSEEK_API_KEY` credential in Harness Settings -> Models.
- Network access to `https://api.deepseek.com` and DeepSeek's official pricing docs.

中文简述：这是一个 DeepSeek Harness 用量面板插件，会在会话页添加“用量”标签页，展示账户余额、官方峰谷价格、切换倒计时、平台用量页入口，并提供可本地保存的余额告警灯设置。

## Features

- Account balance from DeepSeek's official `GET /user/balance` endpoint.
- Current official prices for `deepseek-flash` (DeepSeek-V4.1-Flash) and `deepseek-v4-pro`.
- Peak/off-peak status based on DeepSeek's current Beijing-time rule: peak is Monday-Friday 09:00-12:00 and 14:00-18:00; weekends and all other hours are off-peak.
- Live countdown to the next peak/off-peak switch.
- Compact balance health light on the Usage tab label: green when usable, orange when balance is below an enabled amount or percentage warning threshold, dim neutral when both switches are off.
- Inline warning threshold switches and inputs for amount and percentage. Values are saved in browser localStorage and update the tab light immediately.
- Host-side API-key handling: the browser receives only the query result, never the key.
- Optional `dev_usage_balance` tool for agents to inspect balance and pricing data.

## Configuration

The plugin uses the standard `DEEPSEEK_API_KEY` credential reference by default.

```yaml
- id: dsh-hann-usage-dashboard
  name: dsh-hann-usage-dashboard
  config:
    keyRef: DEEPSEEK_API_KEY
    baseURL: https://api.deepseek.com
    platformUsageURL: https://platform.deepseek.com/usage
    timeoutMs: 10000
    healthCurrency: CNY
    alertBalance: 50
    alertBalancePercent: 20
    balancePercentBase: 100
```

Configure the key in Harness Settings -> Models. The plugin reads the credential through the Harness credentials service.

`alertBalance` and `alertBalancePercent` are optional default warning thresholds. The Usage panel also exposes inline amount and percentage fields; those browser-local values override the displayed tab light immediately. Set either threshold to `0` or leave the panel field blank to disable that check. `balancePercentBase` is the user-defined amount treated as 100% for percentage checks.

## Notes

- DeepSeek's platform page login is separate from Harness. The "open usage page" link may require a browser login.
- The pricing table is fetched from DeepSeek's official docs at runtime so price changes are reflected after refresh.
- DeepSeek's 2026-09-10 pricing docs list `deepseek-flash` as the recommended Flash model name. The old `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` names are routed to DeepSeek-V4.1-Flash during the documented transition window.
- If the docs page cannot be reached or parsed, the balance still renders and the price row reports the pricing error.

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run build:client
node scripts/check-rename.mjs
```

Check host imports against an installed desktop profile, without legacy dependency aliases:

```powershell
node scripts/check-installed-import.mjs "$env:USERPROFILE\.dsh\profiles\desktop"
```

The built `lib/` files are committed so GitHub-source installs can run without a local build step.
