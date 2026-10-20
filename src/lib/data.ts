/**
 * ─────────────────────────────────────────────────────────────────────────
 * LIVE SUPABASE DATA LAYER
 * ─────────────────────────────────────────────────────────────────────────
 * Replaces lib/mock-data.ts. Every hook here is a React Query wrapper around
 * a real Supabase query/mutation against the `loans` project schema.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import { addMonths, quoteLoan } from "./loan-math";

export type InstallmentStatus = "pending" | "paid" | "late" | "penalized";
export type LoanStatus = "active" | "completed" | "defaulted";
export type MatchStatus = "matched" | "unmatched";
export type SmsType = "reminder" | "overdue" | "payment_received" | "account_created";

export interface Borrower {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  national_id: string | null;
  officer_id: string | null;
}

export interface Installment {
  id: string;
  number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: InstallmentStatus;
}

export interface Loan {
  id: string;
  ref: string;
  borrower_id: string;
  principal: number;
  term_months: number;
  start_date: string;
  status: LoanStatus;
  outstanding_balance: number;
  schedule: Installment[];
}

export interface Payment {
  id: string;
  receipt: string | null;
  borrower_id: string | null;
  loan_id: string | null;
  installment_number: number | null;
  matched_installment_id: string | null;
  amount: number;
  channel: "STK" | "C2B";
  phone: string | null;
  account_number_entered: string | null;
  paid_at: string;
  match_status: MatchStatus;
}

export interface Penalty {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  reason: string;
  charged_at: string;
}

export interface SmsLogEntry {
  id: string;
  borrower_id: string | null;
  type: SmsType;
  message: string;
  status: "sent" | "failed";
  sent_at: string;
}

function makeRef(id: string) {
  return `LN-${id.slice(0, 8).toUpperCase()}`;
}

function mapChannel(channel: string): "STK" | "C2B" {
  return channel === "stk_push" ? "STK" : "C2B";
}

function mapLoan(row: any): Loan {
  const schedule: Installment[] = (row.repayment_schedule ?? [])
    .slice()
    .sort((a: any, b: any) => a.installment_no - b.installment_no)
    .map((i: any) => ({
      id: i.id,
      number: i.installment_no,
      due_date: i.due_date,
      amount_due: Number(i.amount_due),
      amount_paid: Number(i.amount_paid),
      status: i.status,
    }));
  return {
    id: row.id,
    ref: makeRef(row.id),
    borrower_id: row.borrower_id,
    principal: Number(row.principal),
    term_months: row.term_months,
    start_date: row.start_date,
    status: row.status,
    outstanding_balance: Number(row.outstanding_balance),
    schedule,
  };
}

function mapPayment(row: any): Payment {
  return {
    id: row.id,
    receipt: row.mpesa_receipt_number,
    borrower_id: row.borrower_id,
    loan_id: row.loan_id,
    installment_number: row.matched_installment?.installment_no ?? null,
    matched_installment_id: row.matched_installment_id,
    amount: Number(row.amount),
    channel: mapChannel(row.channel),
    phone: row.phone_number,
    account_number_entered: row.account_number_entered,
    paid_at: row.created_at,
    match_status: row.status,
  };
}

/* ── Borrowers ────────────────────────────────────────────────────────── */

const BORROWER_SELECT = "id, full_name, phone, email, national_id, officer_id";

export function useBorrowers() {
  return useQuery({
    queryKey: ["borrowers"],
    queryFn: async (): Promise<Borrower[]> => {
      const { data, error } = await supabase
        .from("borrowers")
        .select(BORROWER_SELECT)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useBorrower(id: string | undefined) {
  return useQuery({
    queryKey: ["borrowers", id],
    enabled: !!id,
    queryFn: async (): Promise<Borrower | null> => {
      const { data, error } = await supabase
        .from("borrowers")
        .select(BORROWER_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** The signed-in borrower's own record, resolved from their auth session. */
export function useCurrentBorrower() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["borrowers", "me", session?.user.id],
    enabled: !!session,
    queryFn: async (): Promise<Borrower | null> => {
      const { data, error } = await supabase
        .from("borrowers")
        .select(BORROWER_SELECT)
        .eq("auth_user_id", session!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Creates a borrower AND their Supabase Auth login in one step via the
 * `create-borrower` edge function (which uses the service-role key
 * server-side). Returns a generated temporary password the admin should
 * pass on to the borrower — there is no other way to retrieve it later.
 */
export function useCreateBorrower() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      phone: string;
      email: string;
      national_id?: string;
      officer_id?: string;
    }): Promise<{ temp_password: string }> => {
      const { data, error } = await supabase.functions.invoke("create-borrower", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["borrowers"] }),
  });
}

/* ── Loans ────────────────────────────────────────────────────────────── */

const LOAN_SELECT = "*, repayment_schedule(*)";

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from("loans")
        .select(LOAN_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapLoan);
    },
  });
}

export function useLoan(id: string | undefined) {
  return useQuery({
    queryKey: ["loans", id],
    enabled: !!id,
    queryFn: async (): Promise<Loan | null> => {
      const { data, error } = await supabase
        .from("loans")
        .select(LOAN_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapLoan(data) : null;
    },
  });
}

export function useLoansForBorrower(borrowerId: string | undefined) {
  return useQuery({
    queryKey: ["loans", "borrower", borrowerId],
    enabled: !!borrowerId,
    queryFn: async (): Promise<Loan[]> => {
      const { data, error } = await supabase
        .from("loans")
        .select(LOAN_SELECT)
        .eq("borrower_id", borrowerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapLoan);
    },
  });
}

/** Creates a loan and generates its flat-rate repayment schedule. */
export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      borrower_id: string;
      principal: number;
      term_months: number;
      start_date: string;
    }) => {
      const quote = quoteLoan(input.principal, input.term_months);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: loan, error: loanError } = await supabase
        .from("loans")
        .insert({
          borrower_id: input.borrower_id,
          principal: input.principal,
          interest_rate: 10.0,
          term_months: input.term_months,
          monthly_installment: quote.monthlyInstallment,
          total_payable: quote.totalPayable,
          start_date: input.start_date,
          status: "active",
          outstanding_balance: quote.totalPayable,
          created_by: user?.id,
        })
        .select()
        .single();
      if (loanError) throw loanError;

      const principalPerInstallment = input.principal / input.term_months;
      const interestPerInstallment = quote.totalInterest / input.term_months;
      const schedule = Array.from({ length: input.term_months }, (_, i) => ({
        loan_id: loan.id,
        installment_no: i + 1,
        due_date: addMonths(input.start_date, i + 1),
        principal_due: principalPerInstallment,
        interest_due: interestPerInstallment,
        amount_due: quote.monthlyInstallment,
        amount_paid: 0,
        status: "pending" as const,
      }));
      const { error: scheduleError } = await supabase.from("repayment_schedule").insert(schedule);
      if (scheduleError) throw scheduleError;

      return loan;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loans"] }),
  });
}

/* ── Payments ─────────────────────────────────────────────────────────── */

const PAYMENT_SELECT = "*, matched_installment:repayment_schedule(installment_no)";

export function useAllPayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapPayment);
    },
  });
}

export function usePaymentsForLoan(loanId: string | undefined) {
  return useQuery({
    queryKey: ["payments", "loan", loanId],
    enabled: !!loanId,
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("loan_id", loanId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapPayment);
    },
  });
}

export function usePaymentsForBorrower(borrowerId: string | undefined) {
  return useQuery({
    queryKey: ["payments", "borrower", borrowerId],
    enabled: !!borrowerId,
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from("payments")
        .select(PAYMENT_SELECT)
        .eq("borrower_id", borrowerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(mapPayment);
    },
  });
}

/**
 * Matches an unmatched C2B/STK payment to a borrower + installment via the
 * match-payment edge function — runs server-side (atomic from the client's
 * perspective) and sends the payment-received SMS as part of the same call.
 */
export function useMatchPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      paymentId: string;
      borrowerId: string;
      loanId: string;
      installmentId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("match-payment", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });
}

/** Triggers an STK push to the borrower's phone for a specific installment. */
export function useRequestStkPush() {
  return useMutation({
    mutationFn: async (input: {
      loanId: string;
      installmentId: string;
      phone: string;
      amount: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

/* ── Penalties ────────────────────────────────────────────────────────── */

export function usePenaltiesForLoan(loanId: string | undefined) {
  return useQuery({
    queryKey: ["penalties", "loan", loanId],
    enabled: !!loanId,
    queryFn: async (): Promise<Penalty[]> => {
      const { data, error } = await supabase
        .from("penalties")
        .select("*, repayment_schedule(loan_id, installment_no)")
        .eq("repayment_schedule.loan_id", loanId);
      if (error) throw error;
      return (data as any[])
        .filter((p) => p.repayment_schedule)
        .map((p) => ({
          id: p.id,
          loan_id: p.repayment_schedule.loan_id,
          installment_number: p.repayment_schedule.installment_no,
          amount: Number(p.amount),
          reason: p.reason ?? "Late payment",
          charged_at: p.applied_at,
        }));
    },
  });
}

/* ── Notifications ────────────────────────────────────────────────────── */

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<SmsLogEntry[]> => {
      const { data, error } = await supabase
        .from("notifications_log")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/* ── Portfolio summary (overview KPIs) ───────────────────────────────── */

export function usePortfolioSummary() {
  const loansQuery = useLoans();
  const paymentsQuery = useAllPayments();

  const loans = loansQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const outstanding = loans.reduce((s, l) => s + l.outstanding_balance, 0);
  const disbursed = loans.reduce((s, l) => s + l.principal, 0);
  const matchedThisMonth = payments.filter(
    (p) => p.match_status === "matched" && isThisMonth(p.paid_at),
  );
  const collected = matchedThisMonth.reduce((s, p) => s + p.amount, 0);
  const overdueLoans = loans.filter((l) =>
    l.schedule.some((i) => i.status === "late" || i.status === "penalized"),
  ).length;

  return {
    isLoading: loansQuery.isLoading || paymentsQuery.isLoading,
    summary: { outstanding, disbursed, collected, overdueLoans, loanCount: loans.length },
    recentPayments: [...payments].slice(0, 5),
    matchedCount: payments.filter((p) => p.match_status === "matched").length,
    matchedThisMonthCount: matchedThisMonth.length,
    totalPaymentsCount: payments.length,
    loans,
  };
}

/* ── Staff, performance and activity (super admin / employees) ─────── */

export function isThisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export interface StaffMember {
  id: string;
  role: "super_admin" | "officer";
  full_name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export function staffLabel(member: Pick<StaffMember, "full_name" | "email"> | undefined | null) {
  return member?.full_name || member?.email || "Unknown";
}

export function staffNameById(staff: StaffMember[] | undefined, id: string | null) {
  if (!id) return "Unassigned";
  const member = staff?.find((m) => m.id === id);
  return member ? staffLabel(member) : "Unknown";
}

/** Only the super admin can read the full staff list (RLS enforces it too). */
export function useStaff() {
  const { role } = useAuth();
  return useQuery({
    queryKey: ["staff"],
    enabled: role === "super_admin",
    queryFn: async (): Promise<StaffMember[]> => {
      const { data, error } = await supabase
        .from("admins")
        .select("id, role, full_name, email, phone, active, created_at")
        .order("created_at");
      if (error) throw error;
      return data as StaffMember[];
    },
  });
}

export type ManageStaffInput =
  | { action: "create"; full_name: string; phone: string; email: string }
  | { action: "deactivate"; staff_id: string; reassign_to?: string }
  | { action: "reactivate"; staff_id: string }
  | { action: "reassign"; to_officer_id: string; borrower_ids?: string[]; from_officer_id?: string };

/** Creates, deactivates, reactivates employees and moves clients between them. */
export function useManageStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: ManageStaffInput,
    ): Promise<{ temp_password?: string; moved?: number }> => {
      const { data, error } = await supabase.functions.invoke("manage-staff", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["borrowers"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export interface ActivityEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

/** Super admin sees everyone's activity; employees see only their own (RLS). */
export function useActivity(limit = 200) {
  return useQuery({
    queryKey: ["activity", limit],
    queryFn: async (): Promise<ActivityEntry[]> => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*, actor:admins(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as any[]).map((row) => ({
        id: row.id,
        actor_id: row.actor_id,
        actor_name: row.actor ? staffLabel(row.actor) : null,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        details: row.details,
        created_at: row.created_at,
      }));
    },
  });
}

export interface OfficerPerformance extends StaffMember {
  clients: number;
  activeLoans: number;
  outstanding: number;
  collectedThisMonth: number;
  overdueLoans: number;
}

/** Per-employee portfolio numbers, computed from what the super admin can see. */
export function usePerformance() {
  const staffQuery = useStaff();
  const borrowersQuery = useBorrowers();
  const loansQuery = useLoans();
  const paymentsQuery = useAllPayments();

  const borrowers = borrowersQuery.data ?? [];
  const loans = loansQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const officerOfBorrower = new Map(borrowers.map((b) => [b.id, b.officer_id]));

  const rows: OfficerPerformance[] = (staffQuery.data ?? []).map((member) => {
    const theirLoans = loans.filter((l) => officerOfBorrower.get(l.borrower_id) === member.id);
    return {
      ...member,
      clients: borrowers.filter((b) => b.officer_id === member.id).length,
      activeLoans: theirLoans.filter((l) => l.status === "active").length,
      outstanding: theirLoans.reduce((sum, l) => sum + l.outstanding_balance, 0),
      collectedThisMonth: payments
        .filter(
          (p) =>
            p.match_status === "matched" &&
            isThisMonth(p.paid_at) &&
            p.borrower_id &&
            officerOfBorrower.get(p.borrower_id) === member.id,
        )
        .reduce((sum, p) => sum + p.amount, 0),
      overdueLoans: theirLoans.filter((l) =>
        l.schedule.some((i) => i.status === "late" || i.status === "penalized"),
      ).length,
    };
  });

  return {
    isLoading:
      staffQuery.isLoading ||
      borrowersQuery.isLoading ||
      loansQuery.isLoading ||
      paymentsQuery.isLoading,
    rows,
  };
}

/* ── Shared helpers ──────────────────────────────────────────────────── */

export function loanOutstanding(loan: Loan) {
  return loan.outstanding_balance;
}

export function loanPaid(loan: Loan) {
  return loan.schedule.reduce((sum, i) => sum + i.amount_paid, 0);
}

export function nextInstallment(loan: Loan) {
  return loan.schedule.find((i) => i.amount_paid < i.amount_due);
}

export function borrowerName(borrowers: Borrower[] | undefined, id: string | null) {
  if (!id || !borrowers) return "Unassigned";
  return borrowers.find((b) => b.id === id)?.full_name ?? "Unknown";
}

/**
 * Subscribes to Realtime changes on the core tables and invalidates the
 * matching React Query caches so admin + borrower views update live.
 */
export function useRealtimeSync(queryClient: QueryClient) {
  useEffect(() => {
    const channel = supabase
      .channel("loan-tracking-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loans" }, () => {
        queryClient.invalidateQueries({ queryKey: ["loans"] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "repayment_schedule" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["loans"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["payments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications_log" }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
