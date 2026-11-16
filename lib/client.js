window.__ModuleLoader__.load({
	id: "dsh-hann-usage-dashboard",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		// src/pricing.ts
		const HOURS = 3600;
		const DAY = 24 * HOURS;
		const PEAK_WINDOWS = [[9 * HOURS, 12 * HOURS], [14 * HOURS, 18 * HOURS]];
		const holidays = {
			2026: {
				statutory: [
					"01-01",
					"02-16",
					"02-17",
					"02-18",
					"02-19",
					"04-05",
					"05-01",
					"05-02",
					"06-19",
					"09-25",
					"10-01",
					"10-02",
					"10-03"
				],
				additionalDaysOff: [
					"01-02",
					"02-20",
					"02-23",
					"04-06",
					"05-04",
					"05-05",
					"10-05",
					"10-06",
					"10-07"
				]
			},
			2027: {
				statutory: [
					"01-01",
					"02-05",
					"02-06",
					"02-07",
					"02-08",
					"04-05",
					"05-01",
					"05-02",
					"06-09",
					"09-15",
					"10-01",
					"10-02",
					"10-03"
				],
				additionalDaysOff: [
					"02-09",
					"02-10",
					"02-11",
					"02-12",
					"05-03",
					"05-04",
					"05-05",
					"10-04",
					"10-05",
					"10-06",
					"10-07"
				]
			}
		};
		function daytimePeriod(day) {
			const weekday = day.getUTCDay();
			if (weekday === 0 || weekday === 6) return "off_peak";
			const schedule = holidays[day.getUTCFullYear()];
			const monthDay = day.toISOString().slice(5, 10);
			if (schedule === void 0 || schedule.additionalDaysOff.includes(monthDay)) return "unknown";
			return schedule.statutory.includes(monthDay) ? "off_peak" : "peak";
		}
		const billingLabels = {
			peak: {
				periodLabel: "高峰时段",
				rateLabel: "全价"
			},
			off_peak: {
				periodLabel: "空闲时段",
				rateLabel: "半价"
			},
			unknown: {
				periodLabel: "计费时段待确认",
				rateLabel: ""
			}
		};
		function billingStatusAt(now = /* @__PURE__ */ new Date()) {
			const beijing = new Date(now.getTime() + 8 * HOURS * 1e3);
			const beijingTime = beijing.toISOString().slice(11, 16);
			const seconds = beijing.getUTCHours() * HOURS + beijing.getUTCMinutes() * 60 + beijing.getUTCSeconds();
			const currentWindow = PEAK_WINDOWS.find(([start, end]) => seconds >= start && seconds < end);
			const period = currentWindow === void 0 ? "off_peak" : daytimePeriod(beijing);
			const status = {
				period,
				...billingLabels[period],
				beijingTime
			};
			if (period === "unknown") return status;
			if (period === "peak" && currentWindow !== void 0) return {
				...status,
				next: {
					period: "off_peak",
					seconds: currentWindow[1] - seconds
				}
			};
			for (let daysAhead = 0; daysAhead < 14; daysAhead += 1) {
				const date = new Date(beijing.getTime() + daysAhead * DAY * 1e3);
				const nextWindow = PEAK_WINDOWS.find(([start]) => daysAhead * DAY + start > seconds);
				if (nextWindow === void 0) continue;
				const nextDayPeriod = daytimePeriod(date);
				if (nextDayPeriod === "unknown") break;
				if (nextDayPeriod === "peak") return {
					...status,
					next: {
						period: "peak",
						seconds: daysAhead * DAY + nextWindow[0] - seconds
					}
				};
			}
			return status;
		}
		// src/client/index.ts
		/**
		* dsh-hann-usage-dashboard client half: the 用量 (Usage) tab in the conversation
		* view. Renders the DeepSeek account balance served by the host route
		* `/dsh-hann-usage/api/balance` and links out to the platform usage page. Plain
		* React via createElement (no JSX), structured typing of the touched host
		* surface like dsh-market, so this external package stays free of
		* monorepo-internal type dependencies.
		*/
		const name = "dsh-hann-usage-dashboard";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.effect(() => ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "dsh-hann-usage-dashboard",
				order: 20,
				label: () => "用量"
			}, () => (0, react.createElement)(UsagePanel, {}))), "dsh-hann-usage-dashboard: panel");
			ctx.effect(() => ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "dsh-hann-usage-health",
				order: 20
			}, () => (0, react.createElement)(UsageStatusLight, {}))), "dsh-hann-usage-dashboard: balance indicator");
		}
		const HEALTH_LEVEL_STORAGE_KEY = "dsh-hann-usage-dashboard:health-thresholds";
		const LEGACY_HEALTH_LEVEL_STORAGE_KEY = "dsh-usage-dashboard:health-thresholds";
		const DEFAULT_PERCENT_BASE = 100;
		const DEFAULT_THRESHOLDS = {
			alertBalance: "",
			alertBalancePercent: "",
			alertBalanceEnabled: false,
			alertBalancePercentEnabled: false
		};
		const healthStore = (() => {
			let snapshot = {
				level: "unknown",
				currency: "CNY",
				triggeredBy: [],
				updatedAt: Date.now()
			};
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				publish: (next) => {
					const now = Date.now();
					const updatedAt = next.level === "warning" && snapshot.level === "warning" ? snapshot.updatedAt ?? now : now;
					snapshot = {
						...next,
						updatedAt
					};
					for (const listener of listeners) listener();
				}
			};
		})();
		const row = (label, value) => (0, react.createElement)("div", { style: {
			display: "flex",
			justifyContent: "space-between",
			gap: "12px",
			padding: "4px 0"
		} }, (0, react.createElement)("span", { style: labelStyle }, label), (0, react.createElement)("span", { style: { fontFamily: "monospace" } }, value));
		const labelStyle = {
			color: "var(--dsw-alias-label-secondary, #8b93a7)",
			flex: "0 0 112px",
			whiteSpace: "nowrap"
		};
		const box = {
			display: "flex",
			flexDirection: "column",
			gap: "10px",
			padding: "16px",
			fontFamily: "system-ui, sans-serif",
			fontSize: "13px",
			color: "var(--dsw-alias-label-primary, inherit)",
			maxWidth: "640px"
		};
		function UsagePanel() {
			const [tick, setTick] = (0, react.useState)(0);
			const [now, setNow] = (0, react.useState)(() => /* @__PURE__ */ new Date());
			const [thresholds, setThresholds] = (0, react.useState)(loadThresholds);
			const [state, setState] = (0, react.useState)({ phase: "loading" });
			(0, react.useEffect)(() => {
				let cancelled = false;
				setState({ phase: "loading" });
				fetch("/dsh-hann-usage/api/balance", { cache: "no-store" }).then(async (res) => {
					if (!res.ok) throw new Error(`用量服务返回 ${res.status}`);
					return await res.json();
				}).then((data) => {
					if (!cancelled) setState({
						phase: "ready",
						data
					});
				}).catch((error) => {
					if (!cancelled) setState({
						phase: "error",
						message: error instanceof Error ? error.message : String(error)
					});
				});
				return () => {
					cancelled = true;
				};
			}, [tick]);
			(0, react.useEffect)(() => {
				const id = window.setInterval(() => setNow(/* @__PURE__ */ new Date()), 1e3);
				return () => window.clearInterval(id);
			}, []);
			const refresh = () => setTick((t) => t + 1);
			const editThreshold = (field, value) => {
				setThresholds((current) => {
					const next = {
						...current,
						[field]: value
					};
					saveThresholds(next);
					return next;
				});
			};
			const toggleThreshold = (field, value) => {
				setThresholds((current) => {
					const next = {
						...current,
						[field]: value
					};
					saveThresholds(next);
					return next;
				});
			};
			const readyData = state.phase === "ready" ? state.data : void 0;
			const health = (0, react.useMemo)(() => readyData === void 0 ? {
				level: "unknown",
				currency: "CNY",
				triggeredBy: [],
				updatedAt: Date.now()
			} : computeHealth(readyData, thresholds), [readyData, thresholds]);
			(0, react.useEffect)(() => {
				healthStore.publish(health);
			}, [health]);
			if (state.phase === "loading") return (0, react.createElement)("div", { style: box }, "加载中…");
			if (state.phase === "error") return (0, react.createElement)("div", { style: box }, (0, react.createElement)("div", { style: { fontWeight: 600 } }, "无法连接用量服务"), (0, react.createElement)("div", { style: { color: "var(--dsw-alias-state-error-primary, #e06c75)" } }, state.message), buttonBar(refresh));
			const data = state.data;
			const updated = new Date(data.ts).toLocaleTimeString();
			return (0, react.createElement)("div", { style: box }, (0, react.createElement)("div", { style: {
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center"
			} }, (0, react.createElement)("span", { style: {
				fontWeight: 600,
				fontSize: "14px"
			} }, "DeepSeek 用量"), (0, react.createElement)("a", {
				href: data.platformUsageURL,
				target: "_blank",
				rel: "noopener noreferrer",
				style: linkStyle
			}, "打开平台用量页 →")), data.configured && data.balance !== void 0 ? (0, react.createElement)("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: "4px"
			} }, row("账户可用", data.balance.is_available ? "是" : "否"), thresholdRow("告警金额", thresholds.alertBalance, "alertBalance", thresholds.alertBalanceEnabled, (value) => {
				editThreshold("alertBalance", value);
			}, (value) => {
				toggleThreshold("alertBalanceEnabled", value);
			}), thresholdRow("告警金额（按百分比）", thresholds.alertBalancePercent, "alertBalancePercent", thresholds.alertBalancePercentEnabled, (value) => {
				editThreshold("alertBalancePercent", value);
			}, (value) => {
				toggleThreshold("alertBalancePercentEnabled", value);
			}, "%"), pricingRows(data.pricing, now), ...data.balance.balance_infos.map((info) => (0, react.createElement)("div", {
				key: info.currency,
				style: {
					borderTop: "1px solid var(--dsw-alias-border-l2, #2a3040)",
					marginTop: "4px",
					paddingTop: "4px"
				}
			}, row(`${info.currency} 总额`, info.total_balance), row("　赠送额度", info.granted_balance), row("　充值额度", info.topped_up_balance)))) : (0, react.createElement)("div", { style: { color: "var(--dsw-alias-state-error-primary, #e06c75)" } }, `查询失败 [${data.error?.code ?? "UNKNOWN"}]: ${data.error?.message ?? "未知错误"}`), (0, react.createElement)("div", { style: {
				color: "var(--dsw-alias-label-secondary, #8b93a7)",
				fontSize: "12px"
			} }, `${data.keyRef} · ${data.baseURL}${data.source !== void 0 ? ` · 来源 ${data.source}` : ""} · 更新于 ${updated}`), buttonBar(refresh));
		}
		const linkStyle = {
			color: "var(--dsw-alias-state-business-primary, #7aa2f7)",
			textDecoration: "none",
			fontWeight: 600
		};
		const healthDotBaseStyle = {
			width: "8px",
			height: "8px",
			borderRadius: "50%",
			display: "inline-block",
			flex: "0 0 auto"
		};
		const buttonStyle = {
			background: "transparent",
			border: "1px solid var(--dsw-alias-border-l3, #3b4252)",
			borderRadius: "6px",
			color: "var(--dsw-alias-label-primary, inherit)",
			padding: "6px 14px",
			cursor: "pointer",
			fontFamily: "system-ui, sans-serif",
			fontSize: "13px"
		};
		const thresholdInputStyle = {
			width: "100%",
			boxSizing: "border-box",
			minWidth: 0,
			border: 0,
			background: "transparent",
			color: "var(--dsw-alias-label-primary, inherit)",
			padding: 0,
			fontFamily: "monospace",
			fontSize: "12px"
		};
		const thresholdInputBoxStyle = {
			width: "96px",
			boxSizing: "border-box",
			border: "1px solid var(--dsw-alias-border-l3, #343b4d)",
			borderRadius: "4px",
			background: "var(--dsw-specific-input-major, #111318)",
			color: "var(--dsw-alias-label-primary, inherit)",
			padding: "2px 6px",
			display: "inline-flex",
			alignItems: "center",
			gap: "3px"
		};
		const thresholdInputWrapStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: "6px",
			fontFamily: "monospace"
		};
		const thresholdSuffixStyle = {
			color: "var(--dsw-alias-label-secondary, #8b93a7)",
			minWidth: "10px"
		};
		const switchKnobStyle = {
			width: "10px",
			height: "10px",
			borderRadius: "50%",
			background: "#d6dae2",
			transition: "transform 140ms ease"
		};
		function UsageStatusLight() {
			const health = (0, react.useSyncExternalStore)(healthStore.subscribe, healthStore.getSnapshot);
			const [now, setNow] = (0, react.useState)(() => /* @__PURE__ */ new Date());
			(0, react.useEffect)(() => {
				const id = window.setInterval(() => setNow(/* @__PURE__ */ new Date()), 500);
				return () => window.clearInterval(id);
			}, []);
			return (0, react.createElement)("span", { style: {
				display: "inline-flex",
				alignItems: "center",
				padding: "0 5px"
			} }, healthDot(health, now));
		}
		function healthDot(health, now) {
			const level = health?.level ?? "unknown";
			const color = level === "warning" ? "#ffb454" : level === "ok" ? "#58c777" : "#596070";
			const elapsed = now.getTime() - (health?.updatedAt ?? 0);
			const visible = !(level === "warning" && elapsed >= 0 && elapsed < 42e3) || Math.floor(elapsed / 750) % 2 === 0;
			return (0, react.createElement)("span", {
				"aria-hidden": true,
				title: level === "warning" ? "余额低于告警值" : level === "ok" ? "余额正常" : "余额状态未知",
				style: {
					...healthDotBaseStyle,
					background: color,
					opacity: visible ? 1 : .38,
					boxShadow: level === "unknown" ? "none" : `0 0 ${level === "warning" ? 11 : 7}px ${level === "warning" ? 3 : 0}px ${color}`,
					transition: "opacity 180ms ease"
				}
			});
		}
		function thresholdRow(label, value, id, enabled, onEdit, onToggle, suffix) {
			return (0, react.createElement)("div", { style: {
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "12px",
				padding: "3px 0"
			} }, (0, react.createElement)("label", {
				htmlFor: id,
				style: thresholdLabelStyle
			}, label), (0, react.createElement)("span", { style: thresholdInputWrapStyle }, (0, react.createElement)("button", {
				type: "button",
				role: "switch",
				"aria-checked": enabled,
				title: `${label}${enabled ? "已启用" : "已关闭"}`,
				onClick: () => {
					onToggle(!enabled);
				},
				style: thresholdSwitchStyle(enabled)
			}, (0, react.createElement)("span", { style: {
				...switchKnobStyle,
				transform: enabled ? "translateX(12px)" : "translateX(0)"
			} })), (0, react.createElement)("span", { style: thresholdInputBoxStyle }, (0, react.createElement)("input", {
				id,
				type: "text",
				inputMode: "decimal",
				value,
				placeholder: "0",
				style: thresholdInputStyle,
				onChange: (event) => {
					onEdit(event.target.value);
				}
			}), suffix === void 0 ? null : (0, react.createElement)("span", { style: thresholdSuffixStyle }, suffix))));
		}
		function computeHealth(data, thresholds) {
			const base = data.health ?? {
				level: "unknown",
				currency: "CNY",
				triggeredBy: []
			};
			if (!data.configured || data.balance === void 0 || base.amount === void 0) return {
				...base,
				level: "unknown",
				triggeredBy: [],
				updatedAt: data.ts
			};
			const alertBalance = parseOptionalNumber(thresholds.alertBalance);
			const alertBalancePercent = parseOptionalNumber(thresholds.alertBalancePercent);
			const percentBase = base.percentBase ?? DEFAULT_PERCENT_BASE;
			const percent = percentBase > 0 ? base.amount / percentBase * 100 : void 0;
			if (!thresholds.alertBalanceEnabled && !thresholds.alertBalancePercentEnabled) return {
				...base,
				level: "unknown",
				percent,
				percentBase,
				triggeredBy: [],
				updatedAt: data.ts
			};
			const triggeredBy = [];
			if (thresholds.alertBalanceEnabled && alertBalance !== void 0 && base.amount < alertBalance) triggeredBy.push("amount");
			if (thresholds.alertBalancePercentEnabled && percent !== void 0 && alertBalancePercent !== void 0 && percent < alertBalancePercent) triggeredBy.push("percent");
			return {
				...base,
				percent,
				percentBase,
				level: triggeredBy.length > 0 ? "warning" : "ok",
				triggeredBy,
				updatedAt: data.ts
			};
		}
		function parseOptionalNumber(value) {
			const trimmed = value.trim();
			if (trimmed === "") return void 0;
			const number = Number(trimmed.endsWith("%") ? trimmed.slice(0, -1).trim() : trimmed);
			return Number.isFinite(number) && number > 0 ? number : void 0;
		}
		function loadThresholds() {
			try {
				const current = window.localStorage.getItem(HEALTH_LEVEL_STORAGE_KEY);
				const raw = current ?? window.localStorage.getItem(LEGACY_HEALTH_LEVEL_STORAGE_KEY);
				if (raw === null) return DEFAULT_THRESHOLDS;
				const parsed = JSON.parse(raw);
				const thresholds = {
					alertBalance: typeof parsed.alertBalance === "string" ? parsed.alertBalance : "",
					alertBalancePercent: typeof parsed.alertBalancePercent === "string" ? parsed.alertBalancePercent : "",
					alertBalanceEnabled: typeof parsed.alertBalanceEnabled === "boolean" ? parsed.alertBalanceEnabled : typeof parsed.alertBalance === "string" && parsed.alertBalance.trim() !== "",
					alertBalancePercentEnabled: typeof parsed.alertBalancePercentEnabled === "boolean" ? parsed.alertBalancePercentEnabled : typeof parsed.alertBalancePercent === "string" && parsed.alertBalancePercent.trim() !== ""
				};
				if (current === null) saveThresholds(thresholds);
				return thresholds;
			} catch {
				return DEFAULT_THRESHOLDS;
			}
		}
		function saveThresholds(thresholds) {
			try {
				window.localStorage.setItem(HEALTH_LEVEL_STORAGE_KEY, JSON.stringify(thresholds));
			} catch {}
		}
		function pricingRows(pricing, now) {
			if (pricing === void 0) return null;
			const { period, periodLabel, rateLabel, next } = billingStatusAt(now);
			const periodColor = period === "peak" ? "var(--dsw-alias-state-warn-label, #f6a04d)" : period === "off_peak" ? "var(--dsw-alias-state-success-primary, #58c777)" : "var(--dsw-alias-label-secondary, #8b93a7)";
			const heading = rateLabel ? `${periodLabel}（${rateLabel}）` : periodLabel;
			const hint = period === "peak" ? "长任务建议等空闲时段" : period === "off_peak" ? "适合运行长上下文任务" : "请对照两档官方价格";
			const currentRows = period === "unknown" ? void 0 : pricing.rowsByPeriod?.[period] ?? (period === pricing.period ? pricing.rows : void 0);
			let prices;
			if (currentRows !== void 0) prices = priceRows("官方当前价格", currentRows);
			else if (period === "unknown" && pricing.rowsByPeriod !== void 0) prices = [priceRows("官方高峰价格", pricing.rowsByPeriod.peak), priceRows("官方空闲价格", pricing.rowsByPeriod.off_peak)];
			else prices = row("官方当前价格", `暂不可用${pricing.error !== void 0 ? `（${pricing.error.code}）` : ""}`);
			return (0, react.createElement)("div", { style: {
				borderTop: "1px solid var(--dsw-alias-border-l2, #2a3040)",
				marginTop: "4px",
				paddingTop: "4px"
			} }, (0, react.createElement)("div", { style: statusBarStyle }, (0, react.createElement)("span", { style: {
				color: periodColor,
				fontWeight: 700
			} }, heading), next === void 0 ? null : (0, react.createElement)("span", {}, next.period === "peak" ? "距高峰 " : "距空闲 ", (0, react.createElement)("span", { style: { color: periodColor } }, formatDuration(next.seconds))), (0, react.createElement)("span", {}, hint)), prices, row("价格同步", "官方文档"));
		}
		function priceRows(label, rows) {
			return (0, react.createElement)("div", {
				key: label,
				style: priceGridStyle
			}, (0, react.createElement)("span", { style: priceLabelStyle }, (0, react.createElement)("span", {}, label), (0, react.createElement)("span", { style: { fontSize: "12px" } }, "（元/百万tokens）")), (0, react.createElement)("span", { style: priceValueStyle }, modelPriceLine("Flash V4.1", rows.cacheHitInput.flash, rows.cacheMissInput.flash, rows.output.flash), modelPriceLine("Pro", rows.cacheHitInput.pro, rows.cacheMissInput.pro, rows.output.pro)));
		}
		function modelPriceLine(label, cacheHit, cacheMiss, output) {
			return (0, react.createElement)("span", { style: highlightedPriceLineStyle }, `${label} ${formatPrices(cacheHit, cacheMiss, output)}`);
		}
		const statusBarStyle = {
			display: "flex",
			gap: "14px",
			alignItems: "center",
			flexWrap: "wrap",
			padding: "6px 0 8px",
			color: "var(--dsw-alias-label-secondary, #8b93a7)"
		};
		const thresholdLabelStyle = {
			...labelStyle,
			flex: "0 0 150px"
		};
		function thresholdSwitchStyle(enabled) {
			return {
				width: "28px",
				height: "16px",
				borderRadius: "999px",
				border: `1px solid ${enabled ? "#58c777" : "var(--dsw-alias-border-l3, #343b4d)"}`,
				background: enabled ? "rgba(88, 199, 119, 0.28)" : "var(--dsw-alias-button-ghost-active-fill, rgba(52, 59, 77, 0.42))",
				padding: "2px",
				display: "inline-flex",
				alignItems: "center",
				cursor: "pointer",
				boxSizing: "border-box"
			};
		}
		const priceGridStyle = {
			display: "grid",
			gridTemplateColumns: "184px minmax(0, 1fr)",
			gap: "12px",
			padding: "6px 0",
			alignItems: "start"
		};
		const priceLabelStyle = {
			color: "var(--dsw-alias-label-secondary, #8b93a7)",
			display: "flex",
			flexDirection: "column",
			whiteSpace: "nowrap"
		};
		const priceValueStyle = {
			display: "flex",
			flexDirection: "column",
			gap: "5px",
			alignItems: "flex-start",
			fontFamily: "monospace",
			whiteSpace: "nowrap"
		};
		const highlightedPriceLineStyle = {
			color: "var(--dsw-alias-label-primary, inherit)",
			fontWeight: 700
		};
		function formatPrices(cacheHit, cacheMiss, output) {
			return `命中 ${cacheHit} / 未命中 ${cacheMiss} / 输出 ${output}`;
		}
		function formatDuration(totalSeconds) {
			const seconds = Math.max(0, totalSeconds);
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor(seconds % 3600 / 60);
			const rest = seconds % 60;
			return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
		}
		function buttonBar(onRefresh) {
			return (0, react.createElement)("div", { style: {
				display: "flex",
				gap: "8px"
			} }, (0, react.createElement)("button", {
				onClick: onRefresh,
				style: buttonStyle
			}, "刷新"));
		}
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map