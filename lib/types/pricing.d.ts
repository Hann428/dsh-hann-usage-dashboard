export type BillingPeriod = 'peak' | 'off_peak';
interface PricePair {
    flash: string;
    pro: string;
}
export interface PriceRows {
    cacheHitInput: PricePair;
    cacheMissInput: PricePair;
    output: PricePair;
}
type PriceTable = Record<BillingPeriod, PriceRows>;
export interface PricingInfo {
    period: BillingPeriod | 'unknown';
    periodLabel: string;
    rateLabel: string;
    beijingTime: string;
    docsURL: string;
    updatedAt: number;
    rows?: PriceRows;
    rowsByPeriod?: PriceTable;
    error?: {
        code: string;
        message: string;
    };
}
interface BillingStatus {
    period: PricingInfo['period'];
    periodLabel: string;
    rateLabel: string;
    beijingTime: string;
    next?: {
        period: BillingPeriod;
        seconds: number;
    };
}
export declare function billingStatusAt(now?: Date): BillingStatus;
export declare function parsePricingTable(html: string): PriceTable;
export {};
