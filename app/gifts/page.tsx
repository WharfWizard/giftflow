"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Gift, ExemptionPathway, currentUKTaxYear, uuid } from "@/lib/types";
import { checkGiftReconciliation, applyGiftCorrection, voidGift, ReconcileResolution } from "@/lib/reconcile";
import { Badge } from "@/components/Badge";
import { useView } from "@/lib/view";

const PATHWAY_LABEL: Record<ExemptionPathway, string> = {
  spouse: "Spouse exemption",
  annual_exemption: "Annual exemption",
  small_gifts: "Small gifts",
  normal_expenditure_income: "Normal expenditure from income",
  PET: "Potentially exempt transfer",
};

const ON_IHT403: Record<ExemptionPathway, boolean> = {
  spouse: false,
  annual_exemption: false,
  small_gifts: false,
  normal_expenditure_income: true,
  PET: true,
};

const REVIEW_STATUS_LABEL: Record<Gift["reviewStatus"], string> = {
  confirmed: "Confirmed",
  planned: "Planned",
  needs_review: "Needs review",
  voided: "Voided",
};

const ANNUAL_EXEMPTION_CAP = 3000;
const SMALL_GIFTS_CAP = 250;

export default function GiftsPage() {
  const { record, update } = useStore();
  const { viewMode } = useView();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pathway, setPathway] = useState<ExemptionPathway>("PET");
  const [taxYear, setTaxYear] = useState(currentUKTaxYear());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<ReconcileResolution>("flag_for_review");
  const [editAmount, setEditAmount] = useState("");

  const donorId = record.household.people.find((p) => p.role === "donor")?.id ?? "";
  const spouseId = record.household.people.find((p) => p.role === "spouse")?.id;
  const activeYear = currentUKTaxYear();

  const addGift = () => {
    if (!recipient || !amount) return;
    const splits = spouseId
      ? [{ personId: donorId, sharePercent: 50 }, { personId: spouseId, sharePercent: 50 }]
      : [{ personId: donorId, sharePercent: 100 }];
    const newGift: Gift = {
      id: uuid(),
      donorSplits: splits,
      recipientName: recipient,
      taxYear,
      intendedTotal: Number(amount),
      confirmedTotal: Number(amount),
      exemptionPathway: pathway,
      linkedTransactions: [],
      reviewStatus: "planned",
      version: 1,
    };
    update((r) => ({ ...r, gifts: [...r.gifts, newGift] }));
    setRecipient("");
    setAmount("");
  };

  const startEdit = (gift: Gift) => {
    setEditingId(gift.id);
    setEditAmount(String(gift.confirmedTotal));
    setReason("");
  };

  const check = editingId ? checkGiftReconciliation(record.gifts.find((g) => g.id === editingId)!, Number(editAmount)) : null;

  const saveEdit = () => {
    if (!editingId) return;
    const gift = record.gifts.find((g) => g.id === editingId)!;
    try {
      const updated = applyGiftCorrection(gift, Number(editAmount), reason, check?.requiresResolution ? resolution : null);
      update((r) => ({ ...r, gifts: r.gifts.map((g) => (g.id === editingId ? updated : g)) }));
      setEditingId(null);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const doVoid = (gift: Gift) => {
    const voidReason = prompt("Reason for voiding this gift?");
    if (voidReason === null) return;
    try {
      const updated = voidGift(gift, voidReason);
      update((r) => ({ ...r, gifts: r.gifts.map((g) => (g.id === gift.id ? updated : g)) }));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const setStatus = (gift: Gift, status: Gift["reviewStatus"]) => {
    update((r) => ({
      ...r,
      gifts: r.gifts.map((g) => (g.id === gift.id ? { ...g, reviewStatus: status, version: g.version + 1 } : g)),
    }));
  };

  const shareFor = (g: Gift) => {
    if (viewMode === "household") return g.confirmedTotal;
    const split = g.donorSplits.find((s) => s.personId === viewMode);
    return split ? g.confirmedTotal * (split.sharePercent / 100) : 0;
  };

  const visibleGifts =
    viewMode === "household" ? record.gifts : record.gifts.filter((g) => g.donorSplits.some((s) => s.personId === viewMode));

  // Exemption cap tracking for the current tax year, per donor.
  const annualExemptionUsed: Record<string, number> = {};
  const smallGiftsUsed: Record<string, number> = {}; // key: donorId|recipient
  record.gifts
    .filter((g) => g.taxYear === activeYear && g.reviewStatus !== "voided")
    .forEach((g) => {
      g.donorSplits.forEach((s) => {
        const share = g.confirmedTotal * (s.sharePercent / 100);
        if (g.exemptionPathway === "annual_exemption") {
          annualExemptionUsed[s.personId] = (annualExemptionUsed[s.personId] ?? 0) + share;
        }
        if (g.exemptionPathway === "small_gifts") {
          const key = `${s.personId}|${g.recipientName}`;
          smallGiftsUsed[key] = (smallGiftsUsed[key] ?? 0) + share;
        }
      });
    });

  const capWarnings: string[] = [];
  record.household.people.forEach((p) => {
    const used = annualExemptionUsed[p.id] ?? 0;
    if (used > ANNUAL_EXEMPTION_CAP) {
      capWarnings.push(`${p.fullName}'s annual exemption gifts total £${used.toLocaleString()}, above the £${ANNUAL_EXEMPTION_CAP.toLocaleString()} cap for ${activeYear}.`);
    }
  });
  Object.entries(smallGiftsUsed).forEach(([key, used]) => {
    if (used > SMALL_GIFTS_CAP) {
      const [personId, recipientName] = key.split("|");
      const person = record.household.people.find((p) => p.id === personId);
      capWarnings.push(`${person?.fullName ?? "A donor"}'s small gifts to ${recipientName} total £${used.toLocaleString()}, above the £${SMALL_GIFTS_CAP} cap for ${activeYear}.`);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-navy">Gift register</h1>
        <p className="text-sm text-[#5f5e5a] mt-1">
          Includes gifts that never need to appear on IHT403 — spouse transfers, the annual exemption, and small
          gifts — alongside PETs and gifts from income, so the whole picture of giving is in one place.
        </p>
      </div>

      {capWarnings.length > 0 && (
        <div className="card" style={{ background: "#fcebeb" }}>
          <div className="text-sm font-medium mb-2" style={{ color: "#791f1f" }}>Exemption limits exceeded</div>
          {capWarnings.map((w, i) => (
            <div key={i} className="text-xs" style={{ color: "#791f1f" }}>{w}</div>
          ))}
        </div>
      )}

      <div className="card space-y-2">
        <div className="text-sm font-medium mb-1">Add a gift</div>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <input placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={pathway} onChange={(e) => setPathway(e.target.value as ExemptionPathway)}>
            {Object.entries(PATHWAY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}{!ON_IHT403[k as ExemptionPathway] ? " (not on IHT403)" : ""}</option>
            ))}
          </select>
          <input placeholder="Tax year, e.g. 2026/27" value={taxYear} onChange={(e) => setTaxYear(e.target.value)} />
        </div>
        <button onClick={addGift} className="btn-primary w-full">Save gift</button>
      </div>

      <div className="space-y-2">
        {visibleGifts.length === 0 && <p className="text-sm text-[#5f5e5a]">No gifts recorded yet.</p>}
        {visibleGifts.map((g) => (
          <div key={g.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium">{g.recipientName}</div>
                <div className="text-xs text-[#5f5e5a]">
                  Tax year {g.taxYear} {viewMode !== "household" && `· this view's share £${shareFor(g).toLocaleString()}`}
                </div>
                {g.linkedTransactions.length > 0 && (
                  <div className="text-xs text-[#5f5e5a] mt-1">
                    {g.linkedTransactions.length} transaction{g.linkedTransactions.length === 1 ? "" : "s"} linked, £
                    {record.transactions
                      .filter((t) => g.linkedTransactions.some((l) => l.transactionId === t.id))
                      .reduce((s, t) => s + t.amount, 0)
                      .toLocaleString()}{" "}
                    evidenced of £{g.confirmedTotal.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">£{shareFor(g).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#5f5e5a]">{PATHWAY_LABEL[g.exemptionPathway]}</span>
                {!ON_IHT403[g.exemptionPathway] && <Badge tone="muted">Not required on IHT403</Badge>}
              </div>
              {g.reviewStatus !== "voided" ? (
                <select
                  value={g.reviewStatus}
                  onChange={(e) => setStatus(g, e.target.value as Gift["reviewStatus"])}
                  className="!text-xs !py-1"
                >
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="needs_review">Needs review</option>
                </select>
              ) : (
                <Badge tone="muted">Voided</Badge>
              )}
            </div>
            {g.notes && <div className="text-[11px] text-[#5f5e5a] mt-2 italic">{g.notes.split("\n")[0]}</div>}
            {g.reviewStatus !== "voided" && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => startEdit(g)} className="!py-1 !px-2 text-xs">Edit amount</button>
                <button onClick={() => doVoid(g)} className="!py-1 !px-2 text-xs">Void</button>
              </div>
            )}

            {editingId === g.id && (
              <div className="mt-3 pt-3 border-t border-[#e5e0d3] space-y-2">
                <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-full" />
                {check?.requiresResolution && (
                  <div className="bg-red-50 rounded p-2 text-xs text-red-800 space-y-1">
                    <div>Mismatch of £{Math.abs(check.mismatch).toLocaleString()} against linked evidence.</div>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={resolution === "flag_for_review"} onChange={() => setResolution("flag_for_review")} className="!w-auto" />
                      Keep evidence linked, flag for review
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={resolution === "unlink_difference"} onChange={() => setResolution("unlink_difference")} className="!w-auto" />
                      Unlink the difference
                    </label>
                  </div>
                )}
                <textarea placeholder="Reason for this change" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full" rows={2} />
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="flex-1">Cancel</button>
                  <button onClick={saveEdit} className="btn-primary flex-1">Save new version</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
