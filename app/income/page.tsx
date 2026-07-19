"use client";

import { Fragment, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  IncomeItem, ExpenditureItem, FinancialAccount, EXPENDITURE_CATEGORIES, ExpenditureCategory,
  currentUKTaxYear, scaffoldSevenYears, uuid, expenditureShareFor,
} from "@/lib/types";
import { recurringSurplus, committedGiftsThisYear } from "@/lib/reconcile";
import { useView } from "@/lib/view";

const INCOME_CATEGORIES = ["salary", "pensions", "interest", "investments", "rents", "annuities", "other"] as const;
const INCOME_CATEGORY_LABEL: Record<string, string> = {
  salary: "Salary",
  pensions: "Pensions",
  interest: "Interest (including PEPs and ISAs)",
  investments: "Investments",
  rents: "Rents",
  annuities: "Annuities (income element)",
  other: "Other",
};
const NEW_ACCOUNT = "__new__";

export default function IncomePage() {
  const { record, update } = useStore();
  const { viewMode } = useView();
  const donorId = record.household.people.find((p) => p.role === "donor")?.id ?? "";
  const activeDefault = currentUKTaxYear();

  const years = useMemo(() => {
    const scaffold = scaffoldSevenYears(activeDefault);
    return scaffold.includes(activeDefault) ? scaffold : [...scaffold, activeDefault];
  }, [activeDefault]);

  const [taxYear, setTaxYear] = useState(activeDefault);
  const yearIndex = years.indexOf(taxYear);
  const personFilter = viewMode === "household" ? null : viewMode;

  // --- Add income ---
  const [accountChoice, setAccountChoice] = useState<string>(NEW_ACCOUNT);
  const [newAccountName, setNewAccountName] = useState("");
  const [incomeCategory, setIncomeCategory] = useState<(typeof INCOME_CATEGORIES)[number]>("pensions");
  const [gross, setGross] = useState("");
  const [taxDeducted, setTaxDeducted] = useState("");

  const addIncome = () => {
    if (!gross) return;
    update((r) => {
      let accounts = r.accounts;
      let accountId: string | undefined = accountChoice;
      let source = "";
      if (accountChoice === NEW_ACCOUNT) {
        if (!newAccountName.trim()) return r;
        const acc: FinancialAccount = {
          id: uuid(), institution: newAccountName, accountName: newAccountName,
          ownerIds: [personFilter ?? donorId], balancesByTaxYear: {},
        };
        accounts = [...accounts, acc];
        accountId = acc.id;
        source = acc.accountName;
      } else {
        source = accounts.find((a) => a.id === accountChoice)?.accountName ?? "Account";
      }
      const item: IncomeItem = {
        id: uuid(), personId: personFilter ?? donorId, source, category: incomeCategory,
        grossAmount: Number(gross), taxDeducted: taxDeducted ? Number(taxDeducted) : undefined,
        taxYear, regularity: "recurring", confirmedStatus: "estimated",
        linkedAccountId: accountId,
      };
      return { ...r, accounts, income: [...r.income, item] };
    });
    setGross("");
    setTaxDeducted("");
    setNewAccountName("");
  };

  // --- Add expenditure ---
  const [expCategory, setExpCategory] = useState<ExpenditureCategory>("Household bills");
  const [expDescription, setExpDescription] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expJoint, setExpJoint] = useState(true);
  const [expSplitOverride, setExpSplitOverride] = useState("");

  const spouseId = record.household.people.find((p) => p.role === "spouse")?.id;
  const canBeJoint = !!spouseId;

  const addExpenditure = () => {
    if (!expAmount) return;
    const joint = canBeJoint && expJoint;
    const item: ExpenditureItem = {
      id: uuid(),
      personIds: joint ? record.household.people.map((p) => p.id) : [personFilter ?? donorId],
      splitType: joint ? "joint" : "individual",
      splitOverridePercent: joint && expSplitOverride ? Number(expSplitOverride) : undefined,
      iht403Category: expCategory, description: expDescription, amount: Number(expAmount),
      taxYear, normalOrExceptional: "normal",
    };
    update((r) => ({ ...r, expenditure: [...r.expenditure, item] }));
    setExpDescription("");
    setExpAmount("");
    setExpSplitOverride("");
  };

  // --- Editing state, shared pattern for both income and expenditure ---
  const [editIncomeId, setEditIncomeId] = useState<string | null>(null);
  const [editIncomeSource, setEditIncomeSource] = useState("");
  const [editIncomeAmount, setEditIncomeAmount] = useState("");
  const [editIncomeTax, setEditIncomeTax] = useState("");

  const startEditIncome = (i: IncomeItem) => {
    setEditIncomeId(i.id);
    setEditIncomeSource(i.source);
    setEditIncomeAmount(String(i.grossAmount));
    setEditIncomeTax(i.taxDeducted !== undefined ? String(i.taxDeducted) : "");
  };
  const saveEditIncome = () => {
    update((r) => ({
      ...r,
      income: r.income.map((i) =>
        i.id === editIncomeId
          ? { ...i, source: editIncomeSource, grossAmount: Number(editIncomeAmount), taxDeducted: editIncomeTax ? Number(editIncomeTax) : undefined }
          : i
      ),
    }));
    setEditIncomeId(null);
  };
  const deleteIncome = (i: IncomeItem) => {
    if (!confirm(`Delete ${i.source}, £${i.grossAmount.toLocaleString()}?`)) return;
    update((r) => ({ ...r, income: r.income.filter((x) => x.id !== i.id) }));
  };

  const [editExpId, setEditExpId] = useState<string | null>(null);
  const [editExpDesc, setEditExpDesc] = useState("");
  const [editExpAmount, setEditExpAmount] = useState("");
  const [editExpJoint, setEditExpJoint] = useState(false);
  const [editExpSplitOverride, setEditExpSplitOverride] = useState("");

  const startEditExp = (e: ExpenditureItem) => {
    setEditExpId(e.id);
    setEditExpDesc(e.description);
    setEditExpAmount(String(e.amount));
    setEditExpJoint(e.splitType === "joint");
    setEditExpSplitOverride(e.splitOverridePercent !== undefined ? String(e.splitOverridePercent) : "");
  };
  const saveEditExp = () => {
    update((r) => ({
      ...r,
      expenditure: r.expenditure.map((e) =>
        e.id === editExpId
          ? {
              ...e,
              description: editExpDesc,
              amount: Number(editExpAmount),
              splitType: canBeJoint && editExpJoint ? "joint" : "individual",
              personIds: canBeJoint && editExpJoint ? record.household.people.map((p) => p.id) : e.personIds,
              splitOverridePercent: canBeJoint && editExpJoint && editExpSplitOverride ? Number(editExpSplitOverride) : undefined,
            }
          : e
      ),
    }));
    setEditExpId(null);
  };
  const deleteExp = (e: ExpenditureItem) => {
    if (!confirm(`Delete ${e.description || e.iht403Category}, £${e.amount.toLocaleString()}?`)) return;
    update((r) => ({ ...r, expenditure: r.expenditure.filter((x) => x.id !== e.id) }));
  };

  // --- Data for the selected year and view ---
  const yearIncome = record.income.filter((i) => i.taxYear === taxYear && (!personFilter || i.personId === personFilter));
  const yearExpenditure = record.expenditure.filter((e) => e.taxYear === taxYear && (!personFilter || e.personIds.includes(personFilter)));
  const viewLabel = personFilter ? record.household.people.find((p) => p.id === personFilter)?.fullName ?? "" : "Household";

  // In household view, a joint item is only ever counted once, at its
  // full amount. In an individual's view, only their own share counts —
  // this is the fix for what was previously a silent double-count risk.
  const shareOfExp = (e: ExpenditureItem) => (personFilter ? expenditureShareFor(e, personFilter, record.household) : e.amount);

  const recurringNet = yearIncome
    .filter((i) => i.regularity === "recurring")
    .reduce((s, i) => s + (i.taxAttributable !== undefined ? i.grossAmount - i.taxAttributable : i.grossAmount - (i.taxDeducted ?? 0)), 0);
  const expenditureTotal = yearExpenditure.reduce((s, e) => s + shareOfExp(e), 0);
  const surplus = recurringSurplus(recurringNet, expenditureTotal);
  const committed = committedGiftsThisYear(record.gifts, taxYear);
  const buffer = surplus - committed;

  // Box 20 to 22, exactly as the form presents it — every category shown,
  // all income regardless of regularity, tax deducted as its own line.
  const grossByCategory = INCOME_CATEGORIES.map((cat) => ({
    cat, label: INCOME_CATEGORY_LABEL[cat],
    amount: yearIncome.filter((i) => i.category === cat).reduce((s, i) => s + i.grossAmount, 0),
  }));
  const grossIncomeTotal = grossByCategory.reduce((s, g) => s + g.amount, 0);
  const taxTotal = yearIncome.reduce((s, i) => s + (i.taxAttributable ?? i.taxDeducted ?? 0), 0);
  const netIncomeAll = grossIncomeTotal - taxTotal;

  const expByCategory = EXPENDITURE_CATEGORIES.map((cat) => ({
    cat, amount: yearExpenditure.filter((e) => e.iht403Category === cat).reduce((s, e) => s + shareOfExp(e), 0),
  }));
  const surplusDeficitAll = netIncomeAll - expenditureTotal;
  const giftsFromIncomeThisYear = record.gifts.filter(
    (g) => g.taxYear === taxYear && g.exemptionPathway === "normal_expenditure_income" && g.reviewStatus !== "voided"
  );
  const giftsFromIncomeTotal = giftsFromIncomeThisYear.reduce((s, g) => s + g.confirmedTotal, 0);

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const toggleCategory = (key: string) => setOpenCategory((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-medium text-navy">{viewLabel} income and expenditure</h1>
          <p className="text-sm text-[#5f5e5a] mt-1">
            Grouped the same way as IHT403 boxes 20 to 22. Each entry keeps your own description alongside the
            form&apos;s category.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => yearIndex > 0 && setTaxYear(years[yearIndex - 1])} disabled={yearIndex <= 0} className="!py-1 !px-2">‹</button>
          <select value={taxYear} onChange={(e) => setTaxYear(e.target.value)} className="!py-1">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => yearIndex < years.length - 1 && setTaxYear(years[yearIndex + 1])} disabled={yearIndex >= years.length - 1} className="!py-1 !px-2">›</button>
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-medium text-navy mb-1">IHT403, box 20 to 22</div>
        <div className="text-xs text-[#5f5e5a] mb-3">Every category shown, exactly as the form lists them, using all income for the year including one-off amounts.</div>
        <table className="w-full text-sm">
          <tbody>
            {grossByCategory.map((g) => {
              const items = yearIncome.filter((i) => i.category === g.cat);
              const isOpen = openCategory === `inc-${g.cat}`;
              return (
                <Fragment key={g.cat}>
                  <tr
                    className="border-t border-[#e5e0d3]"
                    style={items.length > 0 ? { cursor: "pointer" } : undefined}
                    onClick={() => items.length > 0 && toggleCategory(`inc-${g.cat}`)}
                  >
                    <td className="py-1.5">
                      {items.length > 0 && <span className="text-[#5f5e5a] mr-1">{isOpen ? "▾" : "▸"}</span>}
                      {g.label}
                      {items.length > 0 && <span className="text-xs text-[#5f5e5a] ml-1">({items.length})</span>}
                    </td>
                    <td className="py-1.5 text-right">£{g.amount.toLocaleString()}</td>
                  </tr>
                  {isOpen && items.map((i) => (
                    <tr key={i.id} className="bg-[#F4F1EA]">
                      <td colSpan={2} className="py-1.5 px-3">
                        {editIncomeId === i.id ? (
                          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2 items-center">
                              <input value={editIncomeSource} onChange={(e) => setEditIncomeSource(e.target.value)} className="flex-1" placeholder="Description" />
                              <input type="number" value={editIncomeAmount} onChange={(e) => setEditIncomeAmount(e.target.value)} className="w-28" placeholder="Gross" />
                            </div>
                            <div className="flex gap-2 items-center">
                              <input type="number" value={editIncomeTax} onChange={(e) => setEditIncomeTax(e.target.value)} className="flex-1" placeholder="Tax deducted" />
                              <button onClick={saveEditIncome} className="!py-1 !px-2 text-xs">Save</button>
                              <button onClick={() => setEditIncomeId(null)} className="!py-1 !px-2 text-xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                            <div>
                              <div className="text-sm">{i.source}</div>
                              {i.taxDeducted !== undefined && (
                                <div className="text-xs text-[#5f5e5a]">Tax deducted £{i.taxDeducted.toLocaleString()}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm">£{i.grossAmount.toLocaleString()}</span>
                              <button onClick={() => startEditIncome(i)} className="!py-1 !px-2 text-xs">Edit</button>
                              <button onClick={() => deleteIncome(i)} className="!py-1 !px-2 text-xs">Delete</button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            <tr className="border-t border-[#e5e0d3]">
              <td className="py-1.5">Minus Income Tax paid</td>
              <td className="py-1.5 text-right">−£{taxTotal.toLocaleString()}</td>
            </tr>
            <tr className="border-t-2 font-medium" style={{ borderColor: "#0F2A44" }}>
              <td className="py-1.5">Net income</td>
              <td className="py-1.5 text-right">£{netIncomeAll.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-xs font-medium text-[#5f5e5a] mt-4 mb-1">Expenditure</div>
        <table className="w-full text-sm">
          <tbody>
            {expByCategory.map((g) => {
              const items = yearExpenditure.filter((e) => e.iht403Category === g.cat);
              const isOpen = openCategory === `exp-${g.cat}`;
              return (
                <Fragment key={g.cat}>
                  <tr
                    className="border-t border-[#e5e0d3]"
                    style={items.length > 0 ? { cursor: "pointer" } : undefined}
                    onClick={() => items.length > 0 && toggleCategory(`exp-${g.cat}`)}
                  >
                    <td className="py-1.5">
                      {items.length > 0 && <span className="text-[#5f5e5a] mr-1">{isOpen ? "▾" : "▸"}</span>}
                      {g.cat}
                      {items.length > 0 && <span className="text-xs text-[#5f5e5a] ml-1">({items.length})</span>}
                    </td>
                    <td className="py-1.5 text-right">£{g.amount.toLocaleString()}</td>
                  </tr>
                  {isOpen && items.map((e) => (
                    <tr key={e.id} className="bg-[#F4F1EA]">
                      <td colSpan={2} className="py-1.5 px-3">
                        {editExpId === e.id ? (
                          <div className="space-y-2" onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex gap-2 items-center">
                              <input value={editExpDesc} onChange={(ev) => setEditExpDesc(ev.target.value)} className="flex-1" placeholder="Description" />
                              <input type="number" value={editExpAmount} onChange={(ev) => setEditExpAmount(ev.target.value)} className="w-28" placeholder="Full amount" />
                            </div>
                            {canBeJoint && (
                              <div>
                                <label className="flex items-center gap-2 text-xs cursor-pointer">
                                  <input type="checkbox" checked={editExpJoint} onChange={(ev) => setEditExpJoint(ev.target.checked)} className="!w-auto" />
                                  Joint household expense
                                </label>
                                {editExpJoint && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-[#5f5e5a]">Split, first person&apos;s share</span>
                                    <input
                                      type="number"
                                      placeholder={String(record.household.jointExpenditureSplitPercent)}
                                      value={editExpSplitOverride}
                                      onChange={(ev) => setEditExpSplitOverride(ev.target.value)}
                                      className="w-20"
                                    />
                                    <span className="text-xs text-[#5f5e5a]">%</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={saveEditExp} className="!py-1 !px-2 text-xs">Save</button>
                              <button onClick={() => setEditExpId(null)} className="!py-1 !px-2 text-xs">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center" onClick={(ev) => ev.stopPropagation()}>
                            <span className="text-sm">
                              {e.description || <span className="text-[#5f5e5a] italic">No description</span>}
                              {e.splitType === "joint" && (
                                <span className="text-xs text-[#5f5e5a] ml-2">
                                  (joint, {e.splitOverridePercent ?? record.household.jointExpenditureSplitPercent}/
                                  {100 - (e.splitOverridePercent ?? record.household.jointExpenditureSplitPercent)} split)
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm">
                                £{shareOfExp(e).toLocaleString()}
                                {personFilter && e.splitType === "joint" && (
                                  <span className="text-xs text-[#5f5e5a]"> of £{e.amount.toLocaleString()}</span>
                                )}
                              </span>
                              <button onClick={() => startEditExp(e)} className="!py-1 !px-2 text-xs">Edit</button>
                              <button onClick={() => deleteExp(e)} className="!py-1 !px-2 text-xs">Delete</button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            <tr className="border-t-2 font-medium" style={{ borderColor: "#0F2A44" }}>
              <td className="py-1.5">Total expenditure</td>
              <td className="py-1.5 text-right">£{expenditureTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-sm mt-2">
          <tbody>
            <tr className="border-t-2 font-medium" style={{ borderColor: "#0F2A44" }}>
              <td className="py-1.5">Surplus (deficit) income for the year</td>
              <td className="py-1.5 text-right">£{surplusDeficitAll.toLocaleString()}</td>
            </tr>
            <tr className="border-t border-[#e5e0d3]">
              <td className="py-1.5">Gifts made, claimed as normal expenditure from income</td>
              <td className="py-1.5 text-right">£{giftsFromIncomeTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card">
          <div className="text-xs text-[#5f5e5a]">Recurring surplus, gift affordability</div>
          <div className="text-lg font-medium">£{surplus.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-xs text-[#5f5e5a]">Committed from income</div>
          <div className="text-lg font-medium">£{committed.toLocaleString()}</div>
        </div>
        <div className="card" style={{ background: buffer >= 0 ? "#eaf3de" : "#fcebeb" }}>
          <div className="text-xs" style={{ color: buffer >= 0 ? "#27500a" : "#791f1f" }}>
            {buffer >= 0 ? "Remaining buffer" : "Exceeds surplus by"}
          </div>
          <div className="text-lg font-medium" style={{ color: buffer >= 0 ? "#27500a" : "#791f1f" }}>
            £{Math.abs(buffer).toLocaleString()}
          </div>
        </div>
      </div>
      <p className="text-xs text-[#5f5e5a] -mt-3">
        The three figures above deliberately exclude one-off income and are separate from the box 20 to 22 net
        income — they only govern how much can still be gifted from a genuine, regular surplus.
      </p>

      <div className="card space-y-2">
        <div className="text-sm font-medium">Add income for {taxYear}</div>
        <div className="grid grid-cols-2 gap-2">
          <select value={incomeCategory} onChange={(e) => setIncomeCategory(e.target.value as any)}>
            {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{INCOME_CATEGORY_LABEL[c]}</option>)}
          </select>
          <input placeholder="Gross amount" type="number" value={gross} onChange={(e) => setGross(e.target.value)} />
        </div>
        <input placeholder="Tax deducted, if known" type="number" value={taxDeducted} onChange={(e) => setTaxDeducted(e.target.value)} className="w-full" />
        <select value={accountChoice} onChange={(e) => setAccountChoice(e.target.value)} className="w-full">
          <option value={NEW_ACCOUNT}>+ Add a new pension or account</option>
          {record.accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
        </select>
        {accountChoice === NEW_ACCOUNT && (
          <input placeholder="Name this pension or account, e.g. Just annuity" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full" />
        )}
        <button onClick={addIncome} className="btn-primary w-full">Add income item</button>
      </div>

      <div className="card space-y-2">
        <div className="text-sm font-medium">Add expenditure for {taxYear}</div>
        <div className="grid grid-cols-2 gap-2">
          <select value={expCategory} onChange={(e) => setExpCategory(e.target.value as ExpenditureCategory)}>
            {EXPENDITURE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="Amount" type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
        </div>
        <input placeholder="Your own description, e.g. Utilities or Ground rent" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className="w-full" />
        {canBeJoint && (
          <div className="bg-[#F4F1EA] rounded p-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={expJoint} onChange={(e) => setExpJoint(e.target.checked)} className="!w-auto" />
              Joint household expense, split between {record.household.people.map((p) => p.fullName).join(" and ")}
            </label>
            {expJoint && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-[#5f5e5a]">Split, first person&apos;s share</span>
                <input
                  type="number"
                  placeholder={String(record.household.jointExpenditureSplitPercent)}
                  value={expSplitOverride}
                  onChange={(e) => setExpSplitOverride(e.target.value)}
                  className="w-20"
                />
                <span className="text-xs text-[#5f5e5a]">% (blank uses the household default)</span>
              </div>
            )}
          </div>
        )}
        <button onClick={addExpenditure} className="btn-primary w-full">Add expenditure item</button>
      </div>
    </div>
  );
}
