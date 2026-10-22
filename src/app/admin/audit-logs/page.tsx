import { Suspense } from "react";
import { AuditLogsClient } from "./audit-logs-client";

export const dynamic = "force-dynamic";

export default function AuditLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Loading system audit trail ledger...</p>
        </div>
      }
    >
      <AuditLogsClient />
    </Suspense>
  );
}
