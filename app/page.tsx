"use client";

import { useStore } from "@/lib/store";
import { currentUKTaxYear, taxYearStartDate } from "@/lib/types";
import { committedGiftsThisYear } from "@/lib/reconcile";
import { Badge } from "@/components/Badge";
import { useView } from "@/lib/view";

export default function DashboardPage() {
  const { record } = useStore();
  const { viewMode } = useView();
  const taxYear = currentUKTaxYear();
  const personFilter = viewMode === "household" ? null : viewMode;

  const incomeThisYear = record.income
    .filter((i) => i.taxYear === taxYear && (!personFilter || i.personId === personFilter))
    .reduce((s, i) => s + i.grossAmount, 0);

  const expenditureThisYear = record.expenditure
    .filter((e) => e.taxYear === taxYear && (!personFilter || e.personIds.includes(personFilter)))
    .reduce((s, e) => s + e.amount, 0);

  const giftsThisYear = record.gifts.filter(
    (g) => g.taxYear === taxYear && g.reviewStatus !== "voided" && (!personFilter || g.donorSplits.some((s) => s.personId === personFilter))
  );
  const giftsTotal = giftsThisYear.reduce((s, g) => {
    if (!personFilter) return s + g.confirmedTotal;
    const split = g.donorSplits.find((sp) => sp.personId === personFilter);
    return s + g.confirmedTotal * ((split?.sharePercent ?? 0) / 100);
  }, 0);

  const openItems: string[] = [];
  record.income
    .filter((i) => i.taxYear === taxYear && i.confirmedStatus === "estimated" && (!personFilter || i.personId === personFilter))
    .forEach((i) => openItems.push(`${i.source} income still estimated`));
  giftsThisYear
    .filter((g) => g.reviewStatus === "needs_review" || g.reviewStatus === "planned")
    .forEach((g) => openItems.push(`Gift to ${g.recipientName}: ${g.reviewStatus === "planned" ? "no instalments linked" : "needs review"}`));
  if (record.expenditure.filter((e) => e.taxYear === taxYear && (!personFilter || e.personIds.includes(personFilter))).length === 0) {
    openItems.push("Household expenditure not started");
  }
  if (record.screening.q5_trustBenefitEnded === "not_sure") {
    openItems.push("Estate screening question 5 not yet answered");
  }

  const committed = committedGiftsThisYear(record.gifts, taxYear);
  const viewLabel = personFilter ? record.household.people.find((p) => p.id === personFilter)?.fullName ?? "" : "household";

  const shareOf = (g: (typeof record.gifts)[number]) => {
    if (!personFilter) return g.confirmedTotal;
    const split = g.donorSplits.find((sp) => sp.personId === personFilter);
    return g.confirmedTotal * ((split?.sharePercent ?? 0) / 100);
  };

  const visibleGifts = record.gifts.filter(
    (g) => g.reviewStatus !== "voided" && (!personFilter || g.donorSplits.some((s) => s.personId === personFilter))
  );

  // Tax-year by tax-year gift totals, across the whole record.
  const totalsByYear = Array.from(new Set(visibleGifts.map((g) => g.taxYear)))
    .sort()
    .map((y) => ({ year: y, total: visibleGifts.filter((g) => g.taxYear === y).reduce((s, g) => s + shareOf(g), 0) }));

  // PETs only. Years elapsed uses the gift's own date if recorded, or the
  // start of its tax year as a reasonable stand-in when it isn't. No taper
  // relief or £ liability is calculated — HMRC does that centrally once a
  // death actually occurs, using figures GiftFlow doesn't have.
  const now = new Date();
  const petRows = visibleGifts
    .filter((g) => g.exemptionPathway === "PET")
    .map((g) => {
      const refDate = g.giftDate ? new Date(g.giftDate) : taxYearStartDate(g.taxYear);
      const yearsElapsed = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const status = yearsElapsed >= 7 ? "Clear of estate" : yearsElapsed >= 3 ? "Past 3 years" : "Within 3 years";
      return { gift: g, yearsElapsed, status, share: shareOf(g) };
    })
    .sort((a, b) => a.yearsElapsed - b.yearsElapsed);

  const petWithinSeven = petRows.filter((r) => r.yearsElapsed < 7).reduce((s, r) => s + r.share, 0);
  const petClear = petRows.filter((r) => r.yearsElapsed >= 7).reduce((s, r) => s + r.share, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-navy">Your {taxYear} gift record</h1>
        <p className="text-xs text-[#5f5e5a] mb-1">Viewing: {viewLabel}</p>
        <p className="text-sm text-[#5f5e5a] mt-1">
          Your records currently show £{incomeThisYear.toLocaleString()} of income, £
          {expenditureThisYear.toLocaleString()} of expenditure, and £{giftsTotal.toLocaleString()} of recorded
          gifts. {openItems.length} item{openItems.length === 1 ? "" : "s"} need review.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-xs text-[#5f5e5a] mb-1">What came in</div>
          <div className="text-xl font-medium">£{incomeThisYear.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#5f5e5a] mb-1">What I normally spend</div>
          <div className="text-xl font-medium">
            {expenditureThisYear === 0 ? <span className="text-amber-700 text-base">Not started</span> : `£${expenditureThisYear.toLocaleString()}`}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-[#5f5e5a] mb-1">What I gave</div>
          <div className="text-xl font-medium text-brandOrange">£{giftsTotal.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#5f5e5a] mb-1">Committed from income</div>
          <div className="text-xl font-medium">£{committed.toLocaleString()}</div>
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-medium mb-2">Open items</div>
        {openItems.length === 0 ? (
          <div className="text-xs text-[#5f5e5a]">Nothing outstanding for this tax year.</div>
        ) : (
          <ul className="space-y-1">
            {openItems.map((item, i) => (
              <li key={i} className="text-xs flex items-center gap-2">
                <Badge tone="warn">Review</Badge>
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="text-sm font-medium mb-2">Gifts by tax year</div>
        {totalsByYear.length === 0 ? (
          <div className="text-xs text-[#5f5e5a]">No gifts recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {totalsByYear.map((row) => (
                <tr key={row.year} className="border-t border-[#e5e0d3]">
                  <td className="py-1.5">{row.year}</td>
                  <td className="py-1.5 text-right">£{row.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="text-sm font-medium mb-1">Potentially exempt transfers</div>
        <div className="text-xs text-[#5f5e5a] mb-3">
          Years elapsed since each gift, not a tax calculation. Taper relief and any tax due are worked out by
          HMRC after death, using figures this record doesn&apos;t hold — this only tracks the clock.
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="card" style={{ background: "#fcebeb" }}>
            <div className="text-xs" style={{ color: "#791f1f" }}>Within 7 years, still part of the estate if death occurred today</div>
            <div className="text-lg font-medium" style={{ color: "#791f1f" }}>£{petWithinSeven.toLocaleString()}</div>
          </div>
          <div className="card" style={{ background: "#eaf3de" }}>
            <div className="text-xs" style={{ color: "#27500a" }}>Clear of the estate, past 7 years</div>
            <div className="text-lg font-medium" style={{ color: "#27500a" }}>£{petClear.toLocaleString()}</div>
          </div>
        </div>

        {petRows.length === 0 ? (
          <div className="text-xs text-[#5f5e5a]">No potentially exempt transfers recorded.</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              <tr className="text-xs text-[#5f5e5a]">
                <td className="py-1">Recipient</td>
                <td className="py-1">Tax year</td>
                <td className="py-1 text-right">Value</td>
                <td className="py-1 text-right">Years</td>
                <td className="py-1 text-right">Status</td>
              </tr>
              {petRows.map((r) => (
                <tr key={r.gift.id} className="border-t border-[#e5e0d3]">
                  <td className="py-1.5">{r.gift.recipientName}</td>
                  <td className="py-1.5">{r.gift.taxYear}</td>
                  <td className="py-1.5 text-right">£{r.share.toLocaleString()}</td>
                  <td className="py-1.5 text-right">{r.yearsElapsed.toFixed(1)}</td>
                  <td className="py-1.5 text-right">
                    {r.status === "Clear of estate" ? (
                      <Badge tone="ok">Clear of estate</Badge>
                    ) : r.status === "Past 3 years" ? (
                      <Badge tone="warn">Past 3 years</Badge>
                    ) : (
                      <Badge tone="bad">Within 3 years</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}