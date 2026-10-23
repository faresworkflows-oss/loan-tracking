import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { AdminLayout, PageHeader, Panel, TableWrap, Th } from "@/components/admin-layout";
import { PaymentStatusBadge, RecordedBy } from "@/components/payment-status";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatKES, pad2 } from "@/lib/format";
import { quoteLoan } from "@/lib/loan-math";
import {
  channelLabel,
  paymentDate,
  paymentRef,
  useLoan,
  usePaymentsForLoan,
  usePenaltiesForLoan,
  useBorrower,
  useRequestStkPush,
  loanOutstanding,
  loanPaid,
} from "@/lib/data";

export default function LoanDetailPage() {
  const { loanId } = useParams<{ loanId: string }>();
  const { data: loan, isLoading } = useLoan(loanId);
  const { data: borrower } = useBorrower(loan?.borrower_id);
  const { data: loanPayments } = usePaymentsForLoan(loanId);
  const { data: loanPenalties } = usePenaltiesForLoan(loanId);
  const requestStkPush = useRequestStkPush();
  const [recordOpen, setRecordOpen] = useState(false);

  async function handleRequestPayment(installmentId: string, amount: number) {
    if (!loan || !borrower) return;
    try {
      await requestStkPush.mutateAsync({
        loanId: loan.id,
        installmentId,
        phone: borrower.phone,
        amount,
      });
      toast.success("STK push sent", { description: `Prompt sent to ${borrower.phone}.` });
    } catch (err) {
      toast.error("Could not send STK push", { description: (err as Error).message });
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader eyebrow="Loan detail" title="Loading…" />
      </AdminLayout>
    );
  }

  if (!loan) {
    return (
      <AdminLayout>
        <PageHeader eyebrow="Loan detail" title="Loan not found" />
      </AdminLayout>
    );
  }

  const quote = quoteLoan(loan.principal, loan.term_months);
  const payments = loanPayments ?? [];
  const penalties = loanPenalties ?? [];

  return (
    <AdminLayout>
      <PageHeader
        eyebrow="Loan detail"
        title={`${loan.ref} · ${borrower?.full_name ?? "…"}`}
        action={
          <div className="flex items-center gap-5">
            {loan.status !== "completed" ? (
              <Button onClick={() => setRecordOpen(true)}>Record payment</Button>
            ) : null}
            <div className="text-right">
              <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
                Outstanding
              </p>
              <p className="font-mono text-2xl font-bold tracking-tight tabular-nums">
                {formatKES(loanOutstanding(loan))}
              </p>
            </div>
          </div>
        }
      />

      <div className="space-y-6 p-6 md:p-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Principal", value: formatKES(loan.principal) },
            { label: "Monthly installment", value: formatKES(quote.monthlyInstallment) },
            { label: "Total payable", value: formatKES(quote.totalPayable) },
            { label: "Paid to date", value: formatKES(loanPaid(loan)) },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl p-5 ring-1 ring-white/10">
              <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase">
                {item.label}
              </p>
              <p className="mt-3 font-mono text-xl font-bold tracking-tight tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <Tabs defaultValue="schedule">
          <TabsList className="bg-transparent p-0">
            <TabsTrigger value="schedule">Repayment schedule</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="penalties">Penalties</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-6">
            <Panel title="Repayment schedule" meta={`${loan.term_months} installments · 10% flat p.a.`}>
              <TableWrap>
                <thead>
                  <tr className="border-b">
                    <Th>Installment</Th>
                    <Th>Due date</Th>
                    <Th right>Amount due</Th>
                    <Th right>Amount paid</Th>
                    <Th right>Status</Th>
                    <Th right>Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loan.schedule.map((i) => (
                    <tr key={i.id} className="ledger-row">
                      <td className="px-5 py-3 font-mono">{pad2(i.number)}</td>
                      <td className="px-5 py-3">{formatDate(i.due_date)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {formatKES(i.amount_due)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {i.amount_paid > 0 ? (
                          formatKES(i.amount_paid)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {i.amount_paid < i.amount_due ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={requestStkPush.isPending}
                            onClick={() => handleRequestPayment(i.id, i.amount_due - i.amount_paid)}
                          >
                            {requestStkPush.isPending ? "Sending…" : "Request STK"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Panel>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <Panel title="Payment history" meta={`${payments.length} payments`}>
              <TableWrap>
                <thead>
                  <tr className="border-b">
                    <Th>Receipt</Th>
                    <Th>Method</Th>
                    <Th>Installment</Th>
                    <Th right>Amount</Th>
                    <Th>Date</Th>
                    <Th>Recorded by</Th>
                    <Th right>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((p) => (
                    <tr key={p.id} className={`ledger-row ${p.voided_at ? "opacity-60" : ""}`}>
                      <td className="text-muted-foreground px-5 py-3 font-mono">
                        {paymentRef(p) ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs">{channelLabel(p.channel)}</p>
                        {p.reference && p.channel !== "mpesa_manual" ? (
                          <p className="text-muted-foreground font-mono text-[11px]">
                            {p.reference}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 font-mono">
                        {p.installment_number ? pad2(p.installment_number) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {formatKES(p.amount)}
                      </td>
                      <td className="text-muted-foreground px-5 py-3 whitespace-nowrap">
                        {formatDate(paymentDate(p))}
                      </td>
                      <td className="px-5 py-3">
                        <RecordedBy p={p} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <PaymentStatusBadge p={p} />
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground px-5 py-8 text-center">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </TableWrap>
            </Panel>
          </TabsContent>

          <TabsContent value="penalties" className="mt-6">
            <Panel title="Penalty history" meta={`${penalties.length} charges`}>
              <TableWrap>
                <thead>
                  <tr className="border-b">
                    <Th>Installment</Th>
                    <Th>Reason</Th>
                    <Th right>Amount</Th>
                    <Th>Charged</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {penalties.map((p) => (
                    <tr key={p.id} className="ledger-row">
                      <td className="px-5 py-3 font-mono">{pad2(p.installment_number)}</td>
                      <td className="px-5 py-3">{p.reason}</td>
                      <td className="text-coral px-5 py-3 text-right font-mono tabular-nums">
                        {formatKES(p.amount)}
                      </td>
                      <td className="text-muted-foreground px-5 py-3">{formatDate(p.charged_at)}</td>
                    </tr>
                  ))}
                  {penalties.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted-foreground px-5 py-8 text-center">
                        No penalties on this loan.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </TableWrap>
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
      <RecordPaymentDialog loan={loan} open={recordOpen} onOpenChange={setRecordOpen} />
    </AdminLayout>
  );
}
