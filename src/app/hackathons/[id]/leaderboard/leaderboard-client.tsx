"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Award,
  Crown,
  Trophy,
  Medal,
  ArrowLeft,
  Building,
  Video,
  FileCode,
  Sparkles,
  ExternalLink,
  Filter,
  Users,
} from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  submissionId: string;
  projectTitle: string;
  trackName: string;
  trackId: string | null;
  teamId: string;
  teamName: string;
  campusName: string;
  campusCode: string;
  leaderName: string;
  memberCount: number;
  repoUrl: string | null;
  demoVideoUrl: string | null;
  averageScore: number;
  evaluationsCount: number;
  criteriaBreakdown: Record<string, number>;
  submittedAt: string;
}

interface CampusMeta {
  code: string;
  name: string;
}

interface TrackMeta {
  id: string;
  name: string;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  totalTeams: number;
  campuses: CampusMeta[];
  tracks: TrackMeta[];
}

export function LeaderboardClient({ hackathonId }: { hackathonId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string>("ALL");
  const [selectedTrack, setSelectedTrack] = useState<string>("ALL");

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCampus !== "ALL") params.set("campus", selectedCampus);
      if (selectedTrack !== "ALL") params.set("trackId", selectedTrack);

      const res = await fetch(`/api/v1/hackathons/${hackathonId}/leaderboard?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch {
      // Error handling
    } finally {
      setLoading(false);
    }
  }, [hackathonId, selectedCampus, selectedTrack]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const entries = data?.entries || [];
  const top1 = entries[0];
  const top2 = entries[1];
  const top3 = entries[2];

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href={`/hackathons/${hackathonId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Hackathon</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" />
            <span>Official Standings</span>
          </div>
          <h1 className="text-3xl font-black text-white">Hackathon Leaderboard</h1>
          <p className="text-sm text-slate-300 mt-1">
            Live weighted scores compiled across jury evaluation panels.
          </p>
        </div>

        <Link
          href={`/hackathons/${hackathonId}/evaluate`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <Award className="w-4 h-4" />
          <span>Jury Scoring Console</span>
        </Link>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        {/* Campus Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedCampus("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCampus === "ALL"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Campuses
          </button>
          {data?.campuses.map((c) => (
            <button
              key={c.code}
              onClick={() => setSelectedCampus(c.code)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCampus === c.code
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Track Filter */}
        {data?.tracks && data.tracks.length > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Track:</span>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Tracks</option>
              {data.tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Computing live jury standings...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-xl">
          <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Evaluated Projects Yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Jury evaluation scores will appear here once judges begin scoring finalized submissions.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top 3 Podium Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* 2nd Place Podium */}
            {top2 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden order-2 md:order-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-slate-300/10 text-slate-200 border border-slate-400/30">
                    <Medal className="w-4 h-4 text-slate-300" /> 2nd Place
                  </span>
                  <span className="text-2xl font-black text-white">{top2.averageScore}</span>
                </div>
                <h3 className="font-black text-lg text-white line-clamp-1">{top2.projectTitle}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Team: {top2.teamName} • {top2.campusName}
                </p>
              </div>
            )}

            {/* 1st Place Podium (Elevated) */}
            {top1 && (
              <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden order-1 md:order-2 md:-translate-y-4">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Crown className="w-4 h-4 text-amber-400" /> Champion • 1st Place
                  </span>
                  <div className="text-right">
                    <span className="text-3xl font-black text-amber-300">{top1.averageScore}</span>
                    <span className="text-xs text-slate-400"> / 100</span>
                  </div>
                </div>
                <h3 className="font-black text-xl text-white line-clamp-1">{top1.projectTitle}</h3>
                <p className="text-xs text-amber-200/80 mt-1">
                  Team: <span className="font-bold text-white">{top1.teamName}</span> •{" "}
                  {top1.campusName}
                </p>
              </div>
            )}

            {/* 3rd Place Podium */}
            {top3 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden order-3">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-700/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-700/10 text-amber-300 border border-amber-700/30">
                    <Medal className="w-4 h-4 text-amber-600" /> 3rd Place
                  </span>
                  <span className="text-2xl font-black text-white">{top3.averageScore}</span>
                </div>
                <h3 className="font-black text-lg text-white line-clamp-1">{top3.projectTitle}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Team: {top3.teamName} • {top3.campusName}
                </p>
              </div>
            )}
          </div>

          {/* Complete Rankings Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-4 px-6 text-center w-16">Rank</th>
                    <th className="py-4 px-6">Project & Track</th>
                    <th className="py-4 px-6">Team & Campus</th>
                    <th className="py-4 px-6">Jury Panel Score</th>
                    <th className="py-4 px-6 text-right">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {entries.map((entry) => (
                    <tr key={entry.submissionId} className="hover:bg-slate-800/30 transition-colors">
                      {/* Rank */}
                      <td className="py-4 px-6 text-center">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 font-black text-sm border border-amber-500/30">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-200 font-black text-sm border border-slate-400/30">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-400 font-black text-sm border border-amber-700/30">
                            3
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400">{entry.rank}</span>
                        )}
                      </td>

                      {/* Project Title & Track */}
                      <td className="py-4 px-6">
                        <span className="font-bold text-sm text-white block">
                          {entry.projectTitle}
                        </span>
                        <span className="text-[11px] text-indigo-400 font-semibold">
                          {entry.trackName}
                        </span>
                      </td>

                      {/* Team & Campus */}
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-200 block">{entry.teamName}</span>
                        <span className="text-[11px] text-slate-400">{entry.campusName}</span>
                      </td>

                      {/* Score & Evaluations Count */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-white">
                            {entry.averageScore}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({entry.evaluationsCount}{" "}
                            {entry.evaluationsCount === 1 ? "judge" : "judges"})
                          </span>
                        </div>
                      </td>

                      {/* Links */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          {entry.repoUrl && (
                            <a
                              href={entry.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Code Repository"
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {entry.demoVideoUrl && (
                            <a
                              href={entry.demoVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Demo Video"
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-purple-400 border border-slate-800"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
