# dsh-hann-usage-dashboard

DeepSeek usage and billing panel for DeepSeek Harness Desktop and Web.

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

For the desktop app, restart the app after installation. Use this GitHub repository as the install source. To pin this version with the CLI, append `#v0.0.6` to the GitHub spec.

## Upgrade from the old name

Version 0.0.3 renames the repository, package, client module, and Usage tab registration from `dsh-usage-dashboard` to `dsh-hann-usage-dashboard`. Uninstall the old plugin in the same Harness profile before installing this version, then restart Harness. Keeping both versions enabled creates duplicate Usage tabs and balance tools.

On the same browser origin, saved warning thresholds are copied from the old storage key when the new key is absent. Moving from the Web app to the desktop app may use a different origin, so enter those settings again if needed. API keys remain in Harness credentials and are not copied by this migration.

Requirements:

- DeepSeek Harness Desktop or Web with plugin support and the conversation view slot.
- A configured `DEEPSEEK_API_KEY` credential in Harness Settings -> Models.
- Network access to `https://api.deepseek.com` and DeepSeek's official pricing docs.

中文简述：这是一个 DeepSeek Harness 用量面板插件，会在会话页添加“用量”标签页，展示账户余额、官方峰谷价格、切换倒计时、平台用量页入口，并提供可本地保存的余额告警灯设置。

## Features

- Account balance from DeepSeek's official `GET /user/balance` endpoint.
- Official RMB prices for `deepseek-flash` and `deepseek-v4-pro` from the [DeepSeek price table](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/).
- Peak pricing on non-holiday weekdays from 09:00–12:00 and 14:00–18:00 Beijing time. Weekends and Chinese statutory holidays are off-peak.
- The label, price and countdown switch together while the panel is open.
- Compact balance indicator in the conversation header on supported Harness versions. Green indicates an available balance, orange indicates the balance is below an enabled threshold, and a dim indicator means both warning checks are disabled or the balance is unavailable.
- Inline warning threshold switches and inputs for amount and percentage. Values are saved in browser localStorage and update the indicator immediately.
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

`alertBalance` and `alertBalancePercent` are optional default warning thresholds. The Usage panel also exposes inline amount and percentage fields. Those browser-local values override the displayed indicator immediately. Set either threshold to `0` or leave the panel field blank to disable that check. `balancePercentBase` is the user-defined amount treated as 100% for percentage checks.

## Notes

- Version 0.0.5 follows Harness light/dark theme colors and adds an actionable authentication error, including the credential source without exposing its value.
- `HTTP_401` means DeepSeek rejected the key used for the balance request. Update `DEEPSEEK_API_KEY` in Harness Settings -> Models, then refresh Usage. An inherited environment key takes priority over the saved key; update that environment value and restart Harness if the source is `env`. Keys for third-party gateways do not authenticate against DeepSeek's official balance endpoint.
- DeepSeek's platform page login is separate from Harness. The "open usage page" link may require a browser login.
- Both tiers are fetched from DeepSeek's official docs when you open or refresh the Usage panel.
- The bundled holiday calendar covers [2026 statutory dates](https://www.jinan.gov.cn/col/col118356/art/2026/art_5c0f206d9dc945faa30f68f8e811be7e.html) and [2027 holiday dates](https://chinajob.mohrss.gov.cn/h5/c/2026-11-09/635850.shtml), using the [national holiday rules](https://www.gov.cn/gongbao/2024/issue_11726/material/gwygb202433.pdf). During weekday peak hours on additional days off, or in a year without a bundled calendar, the panel shows both rates and marks the period as unconfirmed.
- DeepSeek's 2026-09-10 pricing docs list `deepseek-flash` as the recommended Flash model name. The old `deepseek-v4-flash` and `deepseek-v4-flash-vision-exp` names are routed to DeepSeek-V4.1-Flash during the documented transition window.
- If the docs page cannot be reached or parsed, the balance still renders and the price row reports the pricing error.

## Development

```bash
pnpm install
pnpm run typecheck
pnpm run build:client
node scripts/check-rename.mjs
node scripts/check-authentication.mjs
node scripts/check-pricing.mjs
```

Check host imports against an installed desktop profile, without legacy dependency aliases:

```powershell
node scripts/check-installed-import.mjs "$env:USERPROFILE\.dsh\profiles\desktop"
```

The built `lib/` files are committed so GitHub-source installs can run without a local build step.
