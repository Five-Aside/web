export const PAYMENT_TYPES = ["MONTHLY", "INSTALMENT", "VISITOR"] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];

export function isPaymentType(value: unknown): value is PaymentType {
  return typeof value === "string" && (PAYMENT_TYPES as readonly string[]).includes(value);
}

export function paymentTypeLabel(type: string) {
  if (type === "MONTHLY") return "Monthly";
  if (type === "INSTALMENT") return "Instalment";
  if (type === "VISITOR") return "Visitor";
  return type;
}

/** Default amount for a payment type in a cycle (instalments are entered by hand). */
export function defaultPaymentAmount(
  type: PaymentType,
  fees: { monthlyFee: number; visitorFee: number },
) {
  if (type === "MONTHLY") return fees.monthlyFee;
  if (type === "VISITOR") return fees.visitorFee;
  return 0;
}

export function seatForPaymentType(
  type: PaymentType,
  amount: number,
  monthlyFee: number,
): "permanent" | "sub" {
  if (type === "VISITOR") return "sub";
  if (type === "MONTHLY") return "permanent";
  // Instalment: permanent only once they've paid the full monthly fee.
  return amount >= monthlyFee ? "permanent" : "sub";
}

export type PlayerStatRow = {
  playerId: string;
  name: string;
  teamName: string | null;
  seat: string;
  goals: number;
  assists: number;
  yc: number;
  rc: number;
  overall: number;
};

export function overallScore(
  goals: number,
  _assists: number,
  yc: number,
  rc: number,
) {
  // Assists are no longer counted in the form / overall score.
  return goals - yc * 0.5 - rc;
}

export function clampOverall(n: unknown) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.min(99, Math.max(0, v));
}
