"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Trophy,
  Calendar,
  Users,
  Award,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [stats] = useState({
    activeHackathons: 1,
    registrations: 0,
    teams: 0,
    certificates: 0,
  });

  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isCampusAdmin = user?.role === "CAMPUS_ADMIN";

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
              Track your hackathon registrations, team formations, problem statements, and real-time evaluation rubrics across JECRC University & Foundation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4 text-indigo-400" />
              Explore Hackathons
            </Link>

            {isAdmin && (
              <Link
                href="/hackathons/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]"
              >
                <PlusCircle className="w-4 h-4" />
                Create Hackathon
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Hackathons</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.activeHackathons}</div>
          <p className="text-xs text-slate-400 mt-1">Open for registrations</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">My Registrations</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.registrations}</div>
          <p className="text-xs text-slate-400 mt-1">Confirmed participations</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">My Teams</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.teams}</div>
          <p className="text-xs text-slate-400 mt-1">Formed or joined teams</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificates</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.certificates}</div>
          <p className="text-xs text-slate-400 mt-1">Participation & awards</p>
        </div>
      </div>

      {/* Role-Specific Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Browse Active Hackathons</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Explore upcoming multi-campus hackathons, problem statements, track details, prize pools, and timelines.
            </p>
          </div>
          <Link
            href="/hackathons"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mt-6"
          >
            View Hackathon List <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Student Profile & Skills</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Maintain your enrollment number, branch, academic year, GitHub handle, and skills tags for team matchmaking.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 mt-6"
          >
            Edit Profile <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isAdmin ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Campus Administration</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Configure hackathon parameters, launch registration windows, define problem statement tracks, and manage sponsors.
              </p>
            </div>
            <Link
              href="/hackathons/create"
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 mt-6"
            >
              Launch Hackathon <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-md hover:border-indigo-500/40 transition-colors flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Find Teammates</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect with complementary skill sets across JECRC University and Foundation on the upcoming Matchmaking Board.
              </p>
            </div>
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 mt-6"
            >
              Explore Teams <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
