"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Transaction, FinancialAccount, uuid, taxYearForDate } from "@/lib/types";
import { linkTransaction } from "@/lib/reconcile";
import { Badge } from "@/components/Badge";

const NEW_ACCOUNT = "__new__";

export default function TransactionsPage() {
  const { record, update } = useStore();
  const [date, setDate] = useState("");
  const [accountChoice, setAccountChoice] = useState<string>(NEW_ACCOUNT);
  const [newAccountName, setNewAccountName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectedGiftId, setSelectedGiftId] = useState("");
  const [search, setSearch] = useState("");

  const donorId = record.household.people.find((p) => p.role === "donor")?.id ?? "";

  const addTransaction = () => {
    if (!date || !amount) return;
    update((r) => {
      let accounts = r.accounts;
      let accountId: string | undefined = accountChoice;
      let accountName = "";
      if (accountChoice === NEW_ACCOUNT) {
        if (!newAccountName.trim()) return r;
        const acc: FinancialAccount = {
          id: uuid(), institution: newAccountName, accountName: newAccountName,
          ownerIds: [donorId], balancesByTaxYear: {},
        };
        accounts = [...accounts, acc];
        accountId = acc.id;
        accountName = acc.accountName;
      } else {
        accountName = accounts.find((a) => a.id === accountChoice)?.accountName ?? "Account";
      }
      const t: Transaction = {
        id: uuid(),
        date,
        accountId,
        accountName,
        description,
        amount: Number(amount),
        direction,
        taxYear: taxYearForDate(date),
        status: "unlinked",
      };
      return { ...r, accounts, transactions: [...r.transactions, t] };
    });
    setDate("");
    setDescription("");
    setAmount("");
    setNewAccountName("");
  };

  const outgoingGiftCandidates = useMemo(() => {
    const t = record.transactions.find((x) => x.id === linkingId);
    if (!t) return [];
    return record.gifts
      .filter((g) => g.reviewStatus !== "voided" && g.taxYear === t.taxYear)
      .sort((a, b) => (a.recipientName > b.recipientName ? 1 : -1));
  }, [linkingId, record.transactions, record.gifts]);

  const startLink = (t: Transaction) => {
    setLinkingId(t.id);
    setSelectedGiftId("");
  };

  const confirmLink = () => {
    if (!linkingId || !selectedGiftId) return;
    update((r) => {
      const gift = r.gifts.find((g) => g.id === selectedGiftId);
      if (!gift) return r;
      const updatedGift = linkTransaction(gift, linkingId, "You");
      return {
        ...r,
        gifts: r.gifts.map((g) => (g.id === selectedGiftId ? updatedGift : g)),
        transactions: r.transactions.map((t) => (t.id === linkingId ? { ...t, status: "linked", linkedGiftId: selectedGiftId } : t)),
      };
    });
    setLinkingId(null);
  };

  const setIgnored = (t: Transaction) => {
    update((r) => ({ ...r, transactions: r.transactions.map((x) => (x.id === t.id ? { ...x, status: "ignored" } : x)) }));
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDirection, setEditDirection] = useState<"in" | "out">("out");

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditDate(t.date);
    setEditAccountId(t.accountId ?? record.accounts.find((a) => a.accountName === t.accountName)?.id ?? "");
    setEditDescription(t.description);
    setEditAmount(String(t.amount));
    setEditDirection(t.direction);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const account = record.accounts.find((a) => a.id === editAccountId);
    update((r) => ({
      ...r,
      transactions: r.transactions.map((t) =>
        t.id === editingId
          ? {
              ...t,
              date: editDate,
              accountId: editAccountId || undefined,
              accountName: account?.accountName ?? t.accountName,
              description: editDescription,
              amount: Number(editAmount),
              direction: editDirection,
              taxYear: taxYearForDate(editDate),
            }
          : t
      ),
    }));
    setEditingId(null);
  };

  const deleteTransaction = (t: Transaction) => {
    const warning = t.status === "linked"
      ? `This transaction is linked to ${giftLabelFor(t.linkedGiftId)}. Deleting it will unlink it and reduce that gift's evidenced total. Continue?`
      : `Delete this transaction, ${t.description || "no description"}, £${t.amount.toLocaleString()}?`;
    if (!confirm(warning)) return;
    update((r) => ({
      ...r,
      transactions: r.transactions.filter((x) => x.id !== t.id),
      gifts: r.gifts.map((g) =>
        t.linkedGiftId === g.id ? { ...g, linkedTransactions: g.linkedTransactions.filter((l) => l.transactionId !== t.id) } : g
      ),
    }));
  };

  function giftLabelFor(id?: string) {
    if (!id) return "";
    const g = record.gifts.find((x) => x.id === id);
    return g ? `${g.recipientName} (${g.taxYear})` : "that gift";
  }

  const filtered = record.transactions.filter(
    (t) =>
      !search ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.accountName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-navy">Transaction ledger</h1>
        <p className="text-sm text-[#5f5e5a] mt-1">
          Record each transfer here, then link it as evidence to a gift. A gift claimed as normal expenditure
          from income is stronger evidence when it&apos;s backed by a regular pattern of transfers — monthly, for
          example — rather than a single lump sum, so recording each instalment as it happens is worth doing as
          you go.
        </p>
      </div>

      <div className="card space-y-2">
        <div className="text-sm font-medium">Add a transaction</div>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={accountChoice} onChange={(e) => setAccountChoice(e.target.value)}>
            <option value={NEW_ACCOUNT}>+ Add a new account</option>
            {record.accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
          </select>
          <select value={direction} onChange={(e) => setDirection(e.target.value as "in" | "out")}>
            <option value="out">Money out</option>
            <option value="in">Money in</option>
          </select>
        </div>
        {accountChoice === NEW_ACCOUNT && (
          <input placeholder="Name this account, e.g. NatWest current" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full" />
        )}
        <input placeholder="Description, e.g. FP to Chris Rhodes" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" />
        <button onClick={addTransaction} className="btn-primary w-full">Add transaction</button>
      </div>

      <input placeholder="Search description or account" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full" />

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-sm text-[#5f5e5a]">No transactions recorded yet.</p>}
        {filtered
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((t) => (
            <div key={t.id} className="card">
              {editingId === t.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editAccountId} onChange={(e) => setEditAccountId(e.target.value)}>
                      <option value="">Select an account</option>
                      {record.accounts.map((a) => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                    <select value={editDirection} onChange={(e) => setEditDirection(e.target.value as "in" | "out")}>
                      <option value="out">Money out</option>
                      <option value="in">Money in</option>
                    </select>
                  </div>
                  <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="w-full" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="flex-1">Cancel</button>
                    <button onClick={saveEdit} className="btn-primary flex-1">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm">{t.description || "No description"}</div>
                      <div className="text-xs text-[#5f5e5a]">{t.date} · {t.accountName} · {t.taxYear}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{t.direction === "out" ? "−" : "+"}£{t.amount.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                    {t.status === "linked" ? (
                      <Badge tone="ok">Linked to {giftLabelFor(t.linkedGiftId)}</Badge>
                    ) : t.status === "ignored" ? (
                      <Badge tone="muted">Ignored</Badge>
                    ) : (
                      <Badge tone="warn">Unlinked</Badge>
                    )}
                    <div className="flex gap-2">
                      {t.status === "unlinked" && (
                        <>
                          <button onClick={() => startLink(t)} className="!py-1 !px-2 text-xs">Link to gift</button>
                          <button onClick={() => setIgnored(t)} className="!py-1 !px-2 text-xs">Not related</button>
                        </>
                      )}
                      <button onClick={() => startEdit(t)} className="!py-1 !px-2 text-xs">Edit</button>
                      <button onClick={() => deleteTransaction(t)} className="!py-1 !px-2 text-xs">Delete</button>
                    </div>
                  </div>
                </>
              )}

              {linkingId === t.id && (
                <div className="mt-3 pt-3 border-t border-[#e5e0d3] space-y-2">
                  {outgoingGiftCandidates.length === 0 ? (
                    <div className="text-xs text-[#5f5e5a]">No gifts recorded for tax year {t.taxYear} yet. Add one on the Gifts page first.</div>
                  ) : (
                    <select value={selectedGiftId} onChange={(e) => setSelectedGiftId(e.target.value)} className="w-full">
                      <option value="">Select a gift</option>
                      {outgoingGiftCandidates.map((g) => (
                        <option key={g.id} value={g.id}>{g.recipientName} · £{g.confirmedTotal.toLocaleString()}</option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setLinkingId(null)} className="flex-1">Cancel</button>
                    <button onClick={confirmLink} disabled={!selectedGiftId} className="btn-primary flex-1">Confirm link</button>
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
