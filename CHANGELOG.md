# Changelog

## 0.0.3

- Rename the repository and plugin package to `dsh-hann-usage-dashboard` to distinguish it from unrelated npm packages.
- Update the host/client plugin names, client-loader registration, bundle patch, API route, repository links, and install instructions together.
- Preserve existing warning thresholds on the same browser origin by copying the legacy settings to the new storage key.
- Document uninstalling the old plugin before installation to avoid duplicate tabs and tools.

## 0.0.2

- Update Flash naming for DeepSeek-V4.1-Flash and document DeepSeek's recommended `deepseek-flash` model id.
- Keep pricing live from DeepSeek's official docs so the September 2026 Flash price reduction appears after refresh.

## Unreleased

- Avoid a stale client type export path and return a normal balance error if credential resolution fails.
- Match only the price-window countdown number color to the current peak/off-peak state.
- Move the percent suffix inside the input box and increase orange-light blink cadence for a 42-second warning window.
- Show a dim neutral tab light when both warning threshold switches are off.
- Add independent switches for amount and percentage warning thresholds.
- Start the orange-light blink window when the displayed balance state enters warning.
- Show a fixed percent suffix next to the percentage warning threshold input.
- Move the balance health light onto the Usage tab label and add inline warning threshold inputs.
- Add a compact balance health light with configurable amount and percentage warning thresholds.
- Remove the misleading default-model highlight from price rows. The Harness conversation model selector owns the current session model display.

## 0.0.1

- Add a DeepSeek Usage tab for Harness Web.
- Show account balance from the official balance endpoint.
- Show official peak/off-peak pricing and the next price-window countdown.
- Keep API-key access on the host side.
