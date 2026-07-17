// Core GiftFlow data model — mirrors GiftFlow_Specification_v2.md section 4.
// This file is the single source of truth for record shapes. Every screen
// reads and writes through these types, never a bespoke shape of its own.

export type UUID = string;

export interface Person {
  id: UUID;
  fullName: string;
  dateOfBirth?: string;
  countryWithinUK?: "Scotland" | "England" | "Wales" | "Northern Ireland";
  role: "donor" | "spouse";
}

export interface DonorSplit {
  personId: UUID;
  sharePercent: number;
}

export type ExemptionPathway =
  | "spouse"
  | "annual_exemption"
  | "small_gifts"
  | "normal_expenditure_income"
  | "PET";

export interface GiftTransactionLink {
  transactionId: UUID;
  linkedBy: string;
  linkedAt: string;
  linkedReason?: string;
}

export interface Gift {
  id: UUID;
  donorSplits: DonorSplit[];
  recipientName: string;
  recipientRelationship?: string;
  giftDate?: string;
  taxYear: string; // e.g. "2026/27"
  intendedTotal: number;
  confirmedTotal: number;
  exemptionPathway: ExemptionPathway;
  sourceOfFunds?: { type: "income_item" | "financial_account"; id: UUID };
  linkedTransactions: GiftTransactionLink[];
  reviewStatus: "confirmed" | "planned" | "needs_review" | "voided";
  version: number;
  supersededBy?: UUID;
  notes?: string;
}

export type Regularity = "recurring" | "one_off";
export type IncomeConfirmedStatus = "estimated" | "confirmed_at_source" | "confirmed_final";

export interface IncomeItem {
  id: UUID;
  personId: UUID;
  source: string;
  category: "salary" | "pensions" | "interest" | "investments" | "rents" | "annuities" | "other";
  grossAmount: number;
  taxDeducted?: number;
  taxAttributable?: number;
  taxYear: string;
  regularity: Regularity;
  confirmedStatus: IncomeConfirmedStatus;
  linkedAccountId?: UUID;
}

export const EXPENDITURE_CATEGORIES = [
  "Mortgages", "Insurance", "Household bills", "Council Tax", "Travelling costs",
  "Entertainment", "Holidays", "Nursing home fees", "Other",
] as const;
export type ExpenditureCategory = (typeof EXPENDITURE_CATEGORIES)[number];

export interface ExpenditureItem {
  id: UUID;
  personIds: UUID[];
  iht403Category: ExpenditureCategory;
  description: string;
  amount: number;
  taxYear: string;
  normalOrExceptional: "normal" | "exceptional";
}

export interface FinancialAccount {
  id: UUID;
  institution: string;
  accountName: string;
  ownerIds: UUID[];
  balancesByTaxYear: Record<string, { opening: number; closing?: number; confirmed: boolean }>;
}

export interface AnnualAssessment {
  id: UUID;
  personId: UUID;
  taxYear: string;
  version: number;
  supersededBy?: UUID;
  lockedDate?: string;
  lockNote?: string;
}

export type TriageAnswer = "yes" | "no" | "not_sure" | null;

export interface EstateScreening {
  householdId: UUID;
  q1_giftsOrTransfers: TriageAnswer;
  q2_createdTrust: TriageAnswer;
  q3_addedToTrust: TriageAnswer;
  q4_lifeAssurancePremium: TriageAnswer;
  q5_trustBenefitEnded: TriageAnswer;
  q6_claimingIncomeExemption: TriageAnswer;
}

export interface ReservationOfBenefit {
  id: UUID;
  giftId?: UUID;
  assetDescription: string;
  continuedUseOrBenefit: boolean;
  isHouseOrLand: boolean;
  leaseOrTrustArrangement: boolean;
  valueAtDeath: number | null;
  reviewStatus: "pending_death" | "confirmed";
}

export interface PreOwnedAsset {
  id: UUID;
  assetDescription: string;
  transferOrPurchaseDate?: string;
  incomeTaxPaidOnBenefit: boolean;
  poaElectionMade: boolean;
  electionDate?: string;
  contributedToOthersPurchase: boolean;
  contributionAmount?: number;
}

export interface TrustContribution {
  id: UUID;
  contributionType: "created_new" | "added_to_existing";
  amount: number;
  trustName: string;
  trustees: string;
  taxYear: string;
}

export interface LifeAssurancePremium {
  id: UUID;
  policyBeneficiary: string;
  premiumAmount: number;
  premiumDate?: string;
  ongoing: boolean;
}

export interface Transaction {
  id: UUID;
  date: string; // ISO date
  accountId?: UUID;
  accountName: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  taxYear: string;
  status: "unlinked" | "linked" | "ignored";
  linkedGiftId?: UUID;
}

export interface Household {
  id: UUID;
  people: Person[];
  jointExpenditureSplitPercent: number; // e.g. 50 means 50/50
  createdAt: string;
  lastModified: string;
}

export interface GiftFlowRecord {
  formatVersion: 1;
  household: Household;
  gifts: Gift[];
  income: IncomeItem[];
  expenditure: ExpenditureItem[];
  accounts: FinancialAccount[];
  transactions: Transaction[];
  assessments: AnnualAssessment[];
  screening: EstateScreening;
  reservationsOfBenefit: ReservationOfBenefit[];
  preOwnedAssets: PreOwnedAsset[];
  trustContributions: TrustContribution[];
  lifeAssurancePremiums: LifeAssurancePremium[];
  lastModified: string;
}

export function currentUKTaxYear(date = new Date()): string {
  const year = date.getFullYear();
  const isAfterApril6 = date.getMonth() > 3 || (date.getMonth() === 3 && date.getDate() >= 6);
  const startYear = isAfterApril6 ? year : year - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function taxYearForDate(isoDate: string): string {
  if (!isoDate) return currentUKTaxYear();
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return currentUKTaxYear();
  return currentUKTaxYear(d);
}

export function taxYearStartDate(taxYear: string): Date {
  const startYear = parseInt(taxYear.split("/")[0], 10);
  return new Date(startYear, 3, 6); // 6 April
}

export function uuid(): UUID {
  return crypto.randomUUID();
}

const SEVEN_YEARS_BACK = 7;

export function scaffoldSevenYears(fromTaxYear: string): string[] {
  const [startStr] = fromTaxYear.split("/");
  const start = parseInt(startStr, 10);
  const years: string[] = [];
  for (let i = -SEVEN_YEARS_BACK; i <= 0; i++) {
    const y = start + i;
    years.push(`${y}/${String((y + 1) % 100).padStart(2, "0")}`);
  }
  return years;
}

export function emptyRecord(): GiftFlowRecord {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    household: {
      id: uuid(),
      people: [],
      jointExpenditureSplitPercent: 50,
      createdAt: now,
      lastModified: now,
    },
    gifts: [],
    income: [],
    expenditure: [],
    accounts: [],
    transactions: [],
    assessments: [],
    screening: {
      householdId: "",
      q1_giftsOrTransfers: null,
      q2_createdTrust: null,
      q3_addedToTrust: null,
      q4_lifeAssurancePremium: null,
      q5_trustBenefitEnded: null,
      q6_claimingIncomeExemption: null,
    },
    reservationsOfBenefit: [],
    preOwnedAssets: [],
    trustContributions: [],
    lifeAssurancePremiums: [],
    lastModified: now,
  };
}

// Any record loaded from a file — however old — is passed through this
// before use. Files are only ever saved with the schema that existed when
// they were written, so a field added later will simply be missing from
// an older file. Rather than every screen defensively checking for that,
// every load path fills in defaults once, here.
export function normalizeRecord(r: Partial<GiftFlowRecord> & { household: Household }): GiftFlowRecord {
  const blank = emptyRecord();
  const expenditure = (r.expenditure ?? blank.expenditure).map((e: any) => {
    if (e.iht403Category) return e as ExpenditureItem;
    // Older files stored a single free-text category. Treat that text as
    // the user's own description and file it under "Other" until re-sorted.
    return {
      id: e.id,
      personIds: e.personIds ?? [],
      iht403Category: "Other" as ExpenditureCategory,
      description: e.category ?? "",
      amount: e.amount ?? 0,
      taxYear: e.taxYear,
      normalOrExceptional: e.normalOrExceptional ?? "normal",
    } as ExpenditureItem;
  });
  return {
    formatVersion: 1,
    household: { ...blank.household, ...r.household },
    gifts: r.gifts ?? blank.gifts,
    income: r.income ?? blank.income,
    expenditure,
    accounts: r.accounts ?? blank.accounts,
    transactions: r.transactions ?? blank.transactions,
    assessments: r.assessments ?? blank.assessments,
    screening: { ...blank.screening, ...r.screening },
    reservationsOfBenefit: r.reservationsOfBenefit ?? blank.reservationsOfBenefit,
    preOwnedAssets: r.preOwnedAssets ?? blank.preOwnedAssets,
    trustContributions: r.trustContributions ?? blank.trustContributions,
    lifeAssurancePremiums: r.lifeAssurancePremiums ?? blank.lifeAssurancePremiums,
    lastModified: r.lastModified ?? new Date().toISOString(),
  };
}
