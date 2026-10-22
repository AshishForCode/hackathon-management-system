"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Calendar,
  Users,
  Search,
  PlusCircle,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "@/components/hackathon/status-badge";
import { HackathonStatus, HackathonMode } from "@prisma/client";

interface HackathonItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: HackathonStatus;
  mode: HackathonMode;
  isInterCampus: boolean;
  registrationEnd: string | null;
  startDate: string | null;
  endDate: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  prizes: string | null;
  campus?: { id: string; name: string; code: string } | null;
  tracks?: Array<{ id: string; name: string }>;
  _count?: {
    registrations: number;
    teams: number;
    submissions: number;
  };
}

export default function HackathonsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN"].includes(user.role);

  const [hackathons, setHackathons] = useState<HackathonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    async function fetchHackathons() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedStatus !== "ALL") queryParams.set("status", selectedStatus);
        if (selectedCampus !== "ALL") queryParams.set("campusId", selectedCampus);
        if (searchTerm.trim()) queryParams.set("search", searchTerm.trim());

        const res = await fetch(`/api/v1/hackathons?${queryParams.toString()}`);
        const json = await res.json();
        if (json.success && json.data) {
          setHackathons(json.data);
        }
      } catch {
        console.error("Failed to load hackathons");
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(() => {
      fetchHackathons();
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedCampus, selectedStatus, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header with Title and Create Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Campus Competitions
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Explore Hackathons
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Participate in flagship hackathons from JECRC University & JECRC Foundation.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/hackathons/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] self-start md:self-auto cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Create Hackathon
          </Link>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, track, keywords..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="REGISTRATION_OPEN">Registration Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SUBMISSION_OPEN">Submissions Open</option>
            <option value="EVALUATION">Evaluation</option>
            <option value="RESULTS_PUBLISHED">Results Published</option>
            <option value="DRAFT">Draft</option>
          </select>

          {/* Campus Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
            <button
              onClick={() => setSelectedCampus("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCampus === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Campuses
            </button>
            <button
              onClick={() => setSelectedCampus("JECRC-U")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCampus === "JECRC-U"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              University
            </button>
            <button
              onClick={() => setSelectedCampus("JECRC-F")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedCampus === "JECRC-F"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Foundation
            </button>
          </div>
        </div>
      </div>

      {/* Hackathons Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-sm text-slate-400">Loading hackathons...</p>
        </div>
      ) : hackathons.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto mb-4">
            <Trophy className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">No Hackathons Found</h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            There are currently no hackathons matching your search criteria.
            {isAdmin && " You can create a new hackathon anytime."}
          </p>
          {isAdmin && (
            <Link
              href="/hackathons/create"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create First Hackathon
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hackathons.map((hackathon) => {
            const startDateFormatted = hackathon.startDate
              ? new Date(hackathon.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "TBA";

            return (
              <div
                key={hackathon.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 shadow-xl transition-all hover:scale-[1.01] flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <StatusBadge status={hackathon.status} />

                    <div className="flex items-center gap-1.5">
                      {hackathon.isInterCampus ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                          Inter-Campus
                        </span>
                      ) : hackathon.campus ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {hackathon.campus.code}
                        </span>
                      ) : null}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {hackathon.mode}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors tracking-tight line-clamp-1">
                    {hackathon.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {hackathon.description || "Flagship hackathon competition."}
                  </p>

                  {/* Tracks Pills */}
                  {hackathon.tracks && hackathon.tracks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {hackathon.tracks.slice(0, 3).map((track) => (
                        <span
                          key={track.id}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium border border-slate-700/60"
                        >
                          {track.name}
                        </span>
                      ))}
                      {hackathon.tracks.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                          +{hackathon.tracks.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Starts: {startDateFormatted}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Team: {hackathon.minTeamSize}-{hackathon.maxTeamSize} devs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    <span className="font-bold text-white">
                      {hackathon._count?.registrations || 0}
                    </span>{" "}
                    Registered
                  </div>

                  <Link
                    href={`/hackathons/${hackathon.slug || hackathon.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
