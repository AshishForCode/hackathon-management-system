"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  History,
  Filter,
  ArrowLeft,
  X,
  AlertCircle,
  Eye,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    campus?: { code: string } | null;
  } | null;
}

export function AuditLogsClient() {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN"].includes(user.role);

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    let ignore = false;
    async function fetchLogs() {
      try {
        const url =
          actionFilter && actionFilter !== "ALL"
            ? `/api/v1/audit-logs?action=${actionFilter}&pageSize=50`
            : `/api/v1/audit-logs?pageSize=50`;

        const res = await fetch(url);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setLogs(json.data);
          if (json.meta) setTotal(json.meta.total);
        }
      } catch {
        // Error handling
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchLogs();
    return () => {
      ignore = true;
    };
  }, [actionFilter]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-2xl">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Administrator Access Only</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          The institutional audit trail is restricted to authorized campus administrators.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
            <History className="w-4 h-4" />
            <span>Compliance & Audit Trail</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            System Audit Ledger
          </h1>
          <p className="text-sm text-slate-300 mt-2">
            Immutable log of state mutations, score locks, roster changes, and lifecycle transitions.
          </p>
        </div>

        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 text-center min-w-[160px] self-start md:self-auto">
          <span className="text-3xl font-black text-white block">{total}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wider">Logged Events</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Filter Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Actions</option>
            <option value="HACKATHON_STATUS_CHANGE">HACKATHON_STATUS_CHANGE</option>
            <option value="PARTICIPANT_REGISTERED">PARTICIPANT_REGISTERED</option>
            <option value="REGISTRATION_STATUS_UPDATED">REGISTRATION_STATUS_UPDATED</option>
            <option value="TEAM_CREATED">TEAM_CREATED</option>
            <option value="SUBMISSION_FINALIZED">SUBMISSION_FINALIZED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs text-slate-400">Reading audit log ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No audit records match the selected action filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Entity</th>
                  <th className="py-4 px-6">Actor</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {item.entity} <span className="font-mono text-slate-500 text-[10px]">({item.entityId.slice(0, 8)}...)</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-medium block">
                        {item.user?.name || "System"}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {item.user?.email || "internal"} ({item.user?.role || "SYSTEM"})
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => setSelectedLog(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Payload</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-mono font-bold text-xs text-indigo-400">
                {selectedLog.action}
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Entity ID</span>
                <span className="font-mono text-slate-300">{selectedLog.entityId}</span>
              </div>

              {Boolean(selectedLog.oldValue) && (
                <div>
                  <span className="text-slate-500 block mb-1">Previous State</span>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto font-mono text-[11px] text-slate-400">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {Boolean(selectedLog.newValue) && (
                <div>
                  <span className="text-slate-500 block mb-1">Mutated State</span>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 overflow-x-auto font-mono text-[11px] text-emerald-400">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
