// The one reconciliation function every entity type routes through.
// See GiftFlow_Specification_v2.md section 3.7.
//
// Any field with linked evidence changes only through here. A field with
// nothing linked yet is a plain edit. The moment evidence exists, a change
// requires a reason, and a mismatch requires an explicit resolution choice.

import { Gift, GiftTransactionLink } from "./types";

export interface ReconcileResult {
  ok: boolean;
  mismatch: number;
  requiresReason: boolean;
  requiresResolution: boolean;
  error?: string;
}

export function checkGiftReconciliation(
  gift: Gift,
  proposedTotal: number
): ReconcileResult {
  const linkedTotal = gift.linkedTransactions.length; // presence check only here
  const hasEvidence = gift.linkedTransactions.length > 0;
  if (!hasEvidence) {
    return { ok: true, mismatch: 0, requiresReason: false, requiresResolution: false };
  }
  const mismatch = proposedTotal - gift.confirmedTotal;
  return {
    ok: true,
    mismatch,
    requiresReason: true,
    requiresResolution: mismatch !== 0,
  };
}

export type ReconcileResolution = "flag_for_review" | "unlink_difference";

export function applyGiftCorrection(
  gift: Gift,
  proposedTotal: number,
  reason: string,
  resolution: ReconcileResolution | null
): Gift {
  if (gift.linkedTransactions.length > 0 && !reason.trim()) {
    throw new Error("A reason is required to change a gift with linked evidence.");
  }

  const newGift: Gift = {
    ...gift,
    confirmedTotal: proposedTotal,
    version: gift.version + 1,
    notes: [gift.notes, `${new Date().toISOString()}: ${reason}${resolution ? ` (${resolution})` : ""}`]
      .filter(Boolean)
      .join("\n"),
  };

  if (resolution === "flag_for_review") {
    newGift.reviewStatus = "needs_review";
  }

  return newGift;
}

export function voidGift(gift: Gift, reason: string): Gift {
  if (!reason.trim()) {
    throw new Error("A reason is required to void a gift.");
  }
  return {
    ...gift,
    reviewStatus: "voided",
    version: gift.version + 1,
    notes: [gift.notes, `${new Date().toISOString()}: Voided. ${reason}`].filter(Boolean).join("\n"),
  };
}

export function linkTransaction(
  gift: Gift,
  transactionId: string,
  linkedBy: string,
  reason?: string
): Gift {
  const link: GiftTransactionLink = {
    transactionId,
    linkedBy,
    linkedAt: new Date().toISOString(),
    linkedReason: reason,
  };
  return { ...gift, linkedTransactions: [...gift.linkedTransactions, link] };
}

// Recomputed, never cached — section 3.8 of the spec.
export function committedGiftsThisYear(gifts: Gift[], taxYear: string): number {
  return gifts
    .filter((g) => g.taxYear === taxYear && g.reviewStatus !== "voided")
    .filter((g) => g.exemptionPathway === "normal_expenditure_income")
    .reduce((sum, g) => sum + g.confirmedTotal, 0);
}

export function recurringSurplus(
  netRecurringIncome: number,
  expenditure: number
): number {
  return netRecurringIncome - expenditure;
}
