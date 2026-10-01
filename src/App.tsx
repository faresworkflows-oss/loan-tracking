import { Routes, Route } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { RequireAdmin, RequireBorrower } from "@/components/route-guards";
import { useRealtimeSync } from "@/lib/data";

import OverviewPage from "./pages/Overview";
import LoansIndexPage from "./pages/LoansIndex";
import LoanDetailPage from "./pages/LoanDetail";
import BorrowersIndexPage from "./pages/BorrowersIndex";
import BorrowerDetailPage from "./pages/BorrowerDetail";
import PaymentsPage from "./pages/Payments";
import NotificationsPage from "./pages/Notifications";
import LoginPage from "./pages/Login";
import PortalIndexPage from "./pages/PortalIndex";
import PortalStatementPage from "./pages/PortalStatement";
import { NotFoundPage } from "@/components/not-found";

export default function App() {
  const queryClient = useQueryClient();
  useRealtimeSync(queryClient);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<RequireAdmin><OverviewPage /></RequireAdmin>} />
        <Route path="/loans" element={<RequireAdmin><LoansIndexPage /></RequireAdmin>} />
        <Route path="/loans/:loanId" element={<RequireAdmin><LoanDetailPage /></RequireAdmin>} />
        <Route path="/borrowers" element={<RequireAdmin><BorrowersIndexPage /></RequireAdmin>} />
        <Route
          path="/borrowers/:borrowerId"
          element={<RequireAdmin><BorrowerDetailPage /></RequireAdmin>}
        />
        <Route path="/payments" element={<RequireAdmin><PaymentsPage /></RequireAdmin>} />
        <Route path="/notifications" element={<RequireAdmin><NotificationsPage /></RequireAdmin>} />

        <Route path="/portal" element={<RequireBorrower><PortalIndexPage /></RequireBorrower>} />
        <Route
          path="/portal/statement"
          element={<RequireBorrower><PortalStatementPage /></RequireBorrower>}
        />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  );
}
