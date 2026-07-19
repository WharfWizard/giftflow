"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { uuid, Person } from "@/lib/types";

export default function HouseholdPage() {
  const { record, update } = useStore();
  const donor = record.household.people.find((p) => p.role === "donor");
  const spouse = record.household.people.find((p) => p.role === "spouse");

  const [donorName, setDonorName] = useState(donor?.fullName ?? "");
  const [spouseName, setSpouseName] = useState(spouse?.fullName ?? "");
  const [hasSpouse, setHasSpouse] = useState<boolean>(!!spouse);
  const [split, setSplit] = useState(record.household.jointExpenditureSplitPercent);

  const save = () => {
    update((r) => {
      const people: Person[] = [];
      const donorId = donor?.id ?? uuid();
      people.push({ id: donorId, fullName: donorName || "Donor", role: "donor" });
      if (hasSpouse) {
        const spouseId = spouse?.id ?? uuid();
        people.push({ id: spouseId, fullName: spouseName || "Spouse", role: "spouse" });
      }
      return {
        ...r,
        household: {
          ...r.household,
          people,
          jointExpenditureSplitPercent: split,
        },
        screening: { ...r.screening, householdId: r.household.id },
      };
    });
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-lg font-medium text-navy">Set up your household</h1>
        <p className="text-sm text-[#5f5e5a] mt-1">
          Each person&apos;s income, expenditure, and gifts stay separately attributed, even where you manage
          things jointly. This record is only ever accessible with your password — no one else has access by
          default.
        </p>
      </div>

      <div className="card space-y-2">
        <div className="text-sm font-medium">You</div>
        <input placeholder="Full name" value={donorName} onChange={(e) => setDonorName(e.target.value)} className="w-full" />
      </div>

      <div className="card space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={hasSpouse} onChange={(e) => setHasSpouse(e.target.checked)} className="!w-auto" />
          Add a spouse or partner
        </label>
        {hasSpouse && (
          <input placeholder="Full name" value={spouseName} onChange={(e) => setSpouseName(e.target.value)} className="w-full" />
        )}
      </div>

      {hasSpouse && (
        <div className="card space-y-2">
          <div className="text-sm font-medium">Household expenditure</div>
          <label className="text-xs text-[#5f5e5a]">Default split for joint costs: {split} / {100 - split}</label>
          <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} className="w-full" />
        </div>
      )}

      <button onClick={save} className="btn-primary w-full">
        Save household
      </button>
    </div>
  );
}
