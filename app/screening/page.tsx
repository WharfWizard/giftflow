"use client";

import { useStore } from "@/lib/store";
import { TriageAnswer } from "@/lib/types";

const QUESTIONS: { key: string; text: string; section: string }[] = [
  { key: "q1_giftsOrTransfers", text: "Have you made, or do you plan to make, any gifts or transfers of value to another individual, charity or other organisation?", section: "Gift register" },
  { key: "q2_createdTrust", text: "Have you created a trust or settlement?", section: "Trust contributions" },
  { key: "q3_addedToTrust", text: "Have you transferred additional assets into an existing trust or settlement?", section: "Trust contributions" },
  { key: "q4_lifeAssurancePremium", text: "Have you paid any premium on a life assurance policy for the benefit of anyone, other than your spouse or civil partner?", section: "Life assurance premiums" },
  { key: "q5_trustBenefitEnded", text: "Have you been entitled to benefit from assets held in trust or a settlement that has come to an end, in whole or in part?", section: "Reservation of benefit" },
  { key: "q6_claimingIncomeExemption", text: "Are you intending to rely on gifts being treated as exempt as gifts out of income?", section: "Normal expenditure schedule and earlier transfers" },
];

function badge(answer: TriageAnswer) {
  if (answer === "yes") return { label: "Required", cls: "bg-green-100 text-green-800" };
  if (answer === "no") return { label: "Not applicable", cls: "bg-gray-100 text-gray-600" };
  if (answer === "not_sure") return { label: "Needs review", cls: "bg-amber-100 text-amber-800" };
  return { label: "Awaiting answer", cls: "bg-gray-100 text-gray-600" };
}

export default function ScreeningPage() {
  const { record, update } = useStore();
  const s: any = record.screening;

  const setAnswer = (key: string, value: TriageAnswer) => {
    update((r) => ({ ...r, screening: { ...r.screening, [key]: value } }));
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-lg font-medium text-navy">Estate screening</h1>
        <p className="text-sm text-[#5f5e5a] mt-1">
          These cover the same ground as the six questions on page 1 of IHT403, answered by you now rather than
          by an executor later. Answering &quot;not sure yet&quot; keeps that section open rather than closing it
          off.
        </p>
      </div>

      {QUESTIONS.map((q) => {
        const value = s[q.key] as TriageAnswer;
        return (
          <div key={q.key} className="card">
            <div className="text-sm mb-2">{q.text}</div>
            <div className="flex gap-2">
              {(["yes", "no", "not_sure"] as TriageAnswer[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(q.key, opt)}
                  className="flex-1 !py-1.5"
                  style={value === opt ? { background: "#f0ede4", borderColor: "#0F2A44" } : {}}
                >
                  {opt === "not_sure" ? "Not sure yet" : opt === "yes" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="card">
        <div className="text-sm font-medium mb-2">Sections required for this estate</div>
        {QUESTIONS.map((q) => {
          const value = s[q.key] as TriageAnswer;
          const b = badge(value);
          return (
            <div key={q.key} className="flex justify-between text-xs py-1">
              <span className="text-[#5f5e5a]">{q.section}</span>
              <span className={`px-2 py-0.5 rounded ${b.cls}`}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
