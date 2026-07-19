"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { useView } from "@/lib/view";
import { downloadEvidencePack } from "@/lib/pdf";

export default function PrintPage() {
  const { record } = useStore();
  const { viewMode } = useView();

  const defaultPerson =
    viewMode !== "household" && record.household.people.some((p) => p.id === viewMode)
      ? viewMode
      : record.household.people.find((p) => p.role === "donor")?.id ?? record.household.people[0]?.id ?? "";

  const [personId, setPersonId] = useState(defaultPerson);
  const person = record.household.people.find((p) => p.id === personId);

  const isDonorOn = (g: (typeof record.gifts)[number]) => g.donorSplits.some((s) => s.personId === personId);
  const activeGifts = record.gifts.filter((g) => g.reviewStatus !== "voided" && isDonorOn(g));
  const qualifyingYears = new Set(
    record.gifts
      .filter((g) => g.exemptionPathway === "normal_expenditure_income" && g.reviewStatus !== "voided" && isDonorOn(g))
      .map((g) => g.taxYear)
  );

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-lg font-medium text-navy">Evidence pack</h1>
        <p className="text-sm text-[#5f5e5a] mt-1">
          A separate pack is needed for each person in the household, since an executor acting for one of them
          only ever needs that person's own income, expenditure, and share of any joint gifts — never the
          household combined. Choose who this pack is for.
        </p>
      </div>

      {record.household.people.length === 0 ? (
        <div className="card text-sm text-[#5f5e5a]">No one has been added to this household yet.</div>
      ) : (
        <>
          <div className="card">
            <label className="text-sm font-medium block mb-2">Prepare this evidence pack for</label>
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="w-full">
              {record.household.people.map((p) => (
                <option key={p.id} value={p.id}>{p.fullName}</option>
              ))}
            </select>
          </div>

          <div className="card space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#5f5e5a]">Gifts included, {person?.fullName ?? "this person"}&apos;s share</span>
              <span className="font-medium">{activeGifts.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#5f5e5a]">Tax years with a box 20 to 22 schedule</span>
              <span className="font-medium">{qualifyingYears.size}</span>
            </div>
          </div>

          <button onClick={() => downloadEvidencePack(record, personId)} disabled={!personId} className="btn-primary w-full">
            Download PDF for {person?.fullName ?? "this person"}
          </button>
        </>
      )}
    </div>
  );
}
