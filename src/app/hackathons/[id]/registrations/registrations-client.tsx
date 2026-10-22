"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  Search,
  Filter,
  Check,
  X,
  FileSpreadsheet,
  Building,
  GraduationCap,
} from "lucide-react";
import { RegistrationStatus } from "@prisma/client";

interface ParticipantProfile {
  enrollmentNo?: string | null;
  branch?: string | null;
  year?: number | null;
  skills?: string | null;
}

interface RegistrationItem {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  customFields?: Record<string, unknown>;
  user: {
    id: string;
    name: string;
    email: string;
    campus?: { name: string; code: string } | null;
    profile?: ParticipantProfile | null;
  };
}

interface RegistrationsResponse {
  items: RegistrationItem[];
  total: number;
  page: number;
  limit: number;
}

export function RegistrationsClient({ hackathonId }: { hackathonId: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RegistrationsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchRegistrations() {
      try {
        const url =
          statusFilter && statusFilter !== "ALL"
            ? `/api/v1/hackathons/${hackathonId}/registrations?status=${statusFilter}&limit=100`
            : `/api/v1/hackathons/${hackathonId}/registrations?limit=100`;

        const res = await fetch(url);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setData(json.data);
        }
      } catch {
        if (!ignore) {
          setMessage({ type: "error", text: "Failed to load registrations." });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchRegistrations();

    return () => {
      ignore = true;
    };
  }, [hackathonId, statusFilter]);

  const handleStatusChange = async (regId: string, newStatus: RegistrationStatus) => {
    setUpdatingId(regId);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/registrations/${regId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Participant marked as ${newStatus}!`,
        });
        // Optimistic UI update
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((it) => (it.id === regId ? { ...it, status: newStatus } : it)),
              }
            : null
        );
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to update status." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Access Restricted</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          You must be an authorized Campus Administrator or Organizer to view registrations.
        </p>
        <Link
          href={`/hackathons/${hackathonId}`}
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white"
        >
          Back to Hackathon
        </Link>
      </div>
    );
  }

  // Filter items by client-side search term
  const filteredItems = (data?.items || []).filter((item) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.user.name.toLowerCase().includes(q) ||
      item.user.email.toLowerCase().includes(q) ||
      item.user.profile?.enrollmentNo?.toLowerCase().includes(q) ||
      item.user.campus?.name.toLowerCase().includes(q)
    );
  });

  const totalCount = data?.total || 0;
  const approvedCount = (data?.items || []).filter((i) => i.status === RegistrationStatus.APPROVED).length;
  const waitlistedCount = (data?.items || []).filter((i) => i.status === RegistrationStatus.WAITLISTED).length;
  const rejectedCount = (data?.items || []).filter((i) => i.status === RegistrationStatus.REJECTED).length;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href={`/hackathons/${hackathonId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hackathon Overview</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Administration Console</span>
          </div>
          <h1 className="text-3xl font-black text-white">Participant Registrations</h1>
          <p className="text-sm text-slate-300 mt-1">
            Review applicant profiles, approve or waitlist admissions, and export certified rosters.
          </p>
        </div>

        {/* CSV Export Button */}
        <a
          href={`/api/v1/hackathons/${hackathonId}/registrations/export`}
          download
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export CSV Roster</span>
        </a>
      </div>

      {/* Toast Feedback */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Enrolled</span>
          <span className="text-2xl font-black text-white">{totalCount}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-emerald-400 block mb-1">Approved</span>
          <span className="text-2xl font-black text-emerald-300">{approvedCount}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-amber-400 block mb-1">Waitlisted</span>
          <span className="text-2xl font-black text-amber-300">{waitlistedCount}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-rose-400 block mb-1">Rejected</span>
          <span className="text-2xl font-black text-rose-300">{rejectedCount}</span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by student name, email, or enrollment #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value={RegistrationStatus.APPROVED}>Approved</option>
            <option value={RegistrationStatus.WAITLISTED}>Waitlisted</option>
            <option value={RegistrationStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs text-slate-400">Loading applicant roster...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No registrations found</p>
            <p className="text-xs text-slate-500 mt-1">No applicants match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Participant</th>
                  <th className="py-3.5 px-6">Campus & Branch</th>
                  <th className="py-3.5 px-6">Registered On</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Student Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center font-bold">
                          {item.user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">{item.user.name}</span>
                          <span className="text-slate-400 block">{item.user.email}</span>
                          {item.user.profile?.enrollmentNo && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Enr: {item.user.profile.enrollmentNo}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Campus & Academic Info */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{item.user.campus?.name || "JECRC Institution"}</span>
                        </div>
                        {item.user.profile?.branch && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                            <span>
                              {item.user.profile.branch} (Year {item.user.profile.year || "N/A"})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Registered Date */}
                    <td className="py-4 px-6 text-slate-400">
                      {new Date(item.registeredAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.status === RegistrationStatus.APPROVED
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : item.status === RegistrationStatus.WAITLISTED
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {item.status !== RegistrationStatus.APPROVED && (
                          <button
                            onClick={() => handleStatusChange(item.id, RegistrationStatus.APPROVED)}
                            disabled={updatingId === item.id}
                            title="Approve registration"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status !== RegistrationStatus.WAITLISTED && (
                          <button
                            onClick={() => handleStatusChange(item.id, RegistrationStatus.WAITLISTED)}
                            disabled={updatingId === item.id}
                            title="Waitlist registration"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.status !== RegistrationStatus.REJECTED && (
                          <button
                            onClick={() => handleStatusChange(item.id, RegistrationStatus.REJECTED)}
                            disabled={updatingId === item.id}
                            title="Reject registration"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
