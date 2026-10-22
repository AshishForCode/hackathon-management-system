"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Calendar,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Building,
  Activity,
  ExternalLink,
} from "lucide-react";

interface CampusMetric {
  id: string;
  name: string;
  code: string;
  students: number;
  registrations: number;
  teams: number;
  submissions: number;
  submissionRate: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entity: string;
  userName: string;
  userRole: string;
  createdAt: string;
}

interface AdminDashboardData {
  role: string;
  isAdmin: true;
  stats: {
    totalHackathons: number;
    activeHackathons: number;
    totalRegistrations: number;
    totalTeams: number;
    totalSubmissions: number;
    totalCertificates: number;
  };
  campusBreakdown: CampusMetric[];
  recentActivity: ActivityItem[];
}

interface ParticipantDashboardData {
  role: string;
  isAdmin: false;
  stats: {
    registrationsCount: number;
    teamsCount: number;
    submissionsCount: number;
    certificatesCount: number;
  };
  myRegistrations: Array<{
    id: string;
    status: string;
    registeredAt: string;
    hackathon: {
      id: string;
      title: string;
      slug: string;
      status: string;
      startDate: string | null;
    };
  }>;
  myTeams: Array<{
    id: string;
    name: string;
    role: string;
    memberCount: number;
    hackathon: { title: string; slug: string };
  }>;
  myCertificates: Array<{
    id: string;
    type: string;
    hackathonTitle: string;
    award: string;
  }>;
}

type DashboardData = AdminDashboardData | ParticipantDashboardData;

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/v1/analytics/overview");
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      } catch {
        // Fallback or error handled silently
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isCampusAdmin = user?.role === "CAMPUS_ADMIN";
  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user?.role?.replace("_", " ") || "PARTICIPANT"}
              </span>
              <span className="text-xs text-slate-400">
                {isSuperAdmin
                  ? "Multi-Campus Scope (University & Foundation)"
                  : isCampusAdmin
                  ? "Campus Administrator"
                  : "Student Participant"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || "Hacker"}! 👋
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
              Track hackathon registrations, team rosters, and real-time evaluation metrics across
              JECRC University & Foundation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>Explore Hackathons</span>
            </Link>

            {isAdmin && (
              <Link
                href="/hackathons/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Hackathon</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Compiling real-time campus metrics...</p>
        </div>
      ) : data?.isAdmin ? (
        /* ================= ADMIN VIEW ================= */
        <div className="space-y-8">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Active Hackathons
              </span>
              <div className="text-2xl font-black text-indigo-400">
                {data.stats.activeHackathons}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Registrations
              </span>
              <div className="text-2xl font-black text-white">
                {data.stats.totalRegistrations}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Teams Formed
              </span>
              <div className="text-2xl font-black text-purple-400">
                {data.stats.totalTeams}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Final Submissions
              </span>
              <div className="text-2xl font-black text-emerald-400">
                {data.stats.totalSubmissions}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Certificates Issued
              </span>
              <div className="text-2xl font-black text-amber-400">
                {data.stats.totalCertificates}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Total Competitions
              </span>
              <div className="text-2xl font-black text-slate-300">
                {data.stats.totalHackathons}
              </div>
            </div>
          </div>

          {/* Multi-Campus Comparative Analytics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">
                  Multi-Campus Comparative Analytics
                </h2>
              </div>
              <span className="text-xs text-slate-400">Real-time cohort distribution</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.campusBreakdown.map((campus) => (
                <div
                  key={campus.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
                        {campus.code}
                      </span>
                      <h3 className="text-xl font-black text-white mt-2">{campus.name}</h3>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-400">
                        {campus.submissionRate}%
                      </span>
                      <span className="text-[11px] text-slate-400 block">Completion Rate</span>
                    </div>
                  </div>

                  {/* Metric Chips */}
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 text-[10px]">Students</span>
                      <span className="font-bold text-white text-base">{campus.students}</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 text-[10px]">Registered</span>
                      <span className="font-bold text-white text-base">{campus.registrations}</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 text-[10px]">Teams</span>
                      <span className="font-bold text-white text-base">{campus.teams}</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 block mb-1 text-[10px]">Submitted</span>
                      <span className="font-bold text-white text-base">{campus.submissions}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Stream & System Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Recent Audit Activity */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Live System Audit Trail</h3>
                </div>
                <Link
                  href="/admin/audit-logs"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>View All Logs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {data.recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px]">
                        {log.action}
                      </span>
                      <span className="text-slate-200">
                        {log.userName} ({log.userRole})
                      </span>
                    </div>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Admin Shortcuts */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Administrative Actions</span>
              </h3>

              <div className="space-y-2.5">
                <Link
                  href="/hackathons/create"
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-800 flex items-center justify-between transition-colors block"
                >
                  <span>Create New Hackathon</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  href="/admin/audit-logs"
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-800 flex items-center justify-between transition-colors block"
                >
                  <span>Audit Trail Explorer</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                <Link
                  href="/archive"
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-800 flex items-center justify-between transition-colors block"
                >
                  <span>Project Innovation Archive</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>

                <a
                  href="/api/health"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800 flex items-center justify-between transition-colors block"
                >
                  <span>System Health Endpoint</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= STUDENT PARTICIPANT VIEW ================= */
        <div className="space-y-8">
          {/* Participant Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 block mb-1">My Registrations</span>
              <span className="text-2xl font-black text-white">
                {data?.stats.registrationsCount || 0}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 block mb-1">My Teams</span>
              <span className="text-2xl font-black text-indigo-400">
                {data?.stats.teamsCount || 0}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Project Submissions</span>
              <span className="text-2xl font-black text-purple-400">
                {data?.stats.submissionsCount || 0}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <span className="text-xs text-slate-400 block mb-1">Verified Certificates</span>
              <span className="text-2xl font-black text-amber-400">
                {data?.stats.certificatesCount || 0}
              </span>
            </div>
          </div>

          {/* Registered Hackathons List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="font-bold text-base text-white">My Enrolled Hackathons</h3>

            {data?.myRegistrations && data.myRegistrations.length > 0 ? (
              <div className="space-y-3">
                {data.myRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80"
                  >
                    <div>
                      <h4 className="font-bold text-white text-sm">{reg.hackathon.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Status: <span className="text-emerald-400 font-semibold">{reg.status}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/hackathons/${reg.hackathon.slug}/teams`}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                      >
                        Team Hub
                      </Link>
                      <Link
                        href={`/hackathons/${reg.hackathon.slug}/submit`}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                      >
                        Submit Project
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                You have not registered for any upcoming competitions. Browse hackathons to join!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
