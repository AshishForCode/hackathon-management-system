"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Crown,
  Medal,
  Award,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface CertificateItem {
  id: string;
  type: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface TeamMember {
  user: {
    id: string;
    name: string;
    campus?: { name: string; code: string } | null;
  };
}

interface SubmissionSnippet {
  id: string;
  title: string;
  repoUrl: string | null;
  demoVideoUrl: string | null;
}

interface ResultItem {
  id: string;
  rank: number;
  finalScore: number;
  award: string | null;
  publishedAt: string | null;
  track?: { name: string } | null;
  team: {
    id: string;
    name: string;
    leader: {
      id: string;
      name: string;
      campus?: { name: string; code: string } | null;
    };
    members: TeamMember[];
    submissions: SubmissionSnippet[];
  };
  certificates: CertificateItem[];
}

interface HackathonMeta {
  id: string;
  title: string;
  slug: string;
  campus?: { name: string } | null;
}

export function ResultsClient({ hackathonId }: { hackathonId: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin =
    user && ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);

  const [loading, setLoading] = useState(true);
  const [hackathon, setHackathon] = useState<HackathonMeta | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const res = await fetch(`/api/v1/hackathons/${hackathonId}/results`);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setHackathon(json.data.hackathon);
          setResults(json.data.results || []);
          setIsPublished(json.data.isPublished);
        }
      } catch {
        if (!ignore) {
          setMessage({ type: "error", text: "Failed to load results announcement." });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [hackathonId, refreshKey]);

  // Admin: Generate results from leaderboard
  const handleGenerateResults = async (publish: boolean) => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/hackathons/${hackathonId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Official results ${publish ? "published live" : "generated as draft"}!`,
        });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to generate results." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: Bulk generate certificates
  const handleGenerateCertificates = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/hackathons/${hackathonId}/certificates/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Successfully issued ${json.data.count} verified digital certificates!`,
        });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to issue certificates." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Loading winners announcement...</p>
      </div>
    );
  }

  const champion = results.find((r) => r.rank === 1);
  const runnerUps = results.filter((r) => r.rank === 2 || r.rank === 3);
  const otherFinalists = results.filter((r) => r.rank > 3);

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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              <Trophy className="w-4 h-4" />
              <span>Official Hall of Fame</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Winners & Certified Rankings
            </h1>
            <p className="text-sm text-slate-300 mt-2">
              {hackathon?.title ? `Celebrating top achievements in ${hackathon.title}` : "Celebrating top innovation and technical achievements across JECRC campuses."}
            </p>
          </div>

          <Link
            href={`/hackathons/${hackathonId}/leaderboard`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>View Complete Leaderboard</span>
          </Link>
        </div>

        {/* Admin Controls Toolbar */}
        {isAdmin && (
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>
                Admin Status:{" "}
                <span className={isPublished ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {isPublished ? "Results Published Live" : "Draft / Unpublished"}
                </span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleGenerateResults(true)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
              >
                {actionLoading ? "Processing..." : "Generate & Publish Winners"}
              </button>

              <button
                onClick={handleGenerateCertificates}
                disabled={actionLoading || results.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Issue Verified Certificates</span>
              </button>
            </div>
          </div>
        )}
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

      {/* Unpublished Notice for Participants */}
      {!isPublished && !isAdmin && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-xl">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white">Official Results Coming Soon</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            The jury evaluation process is currently concluding. Official winners, rankings, and
            certified verification credentials will be published shortly!
          </p>
        </div>
      )}

      {/* Results Published State */}
      {(isPublished || isAdmin) && results.length > 0 && (
        <div className="space-y-10">
          {/* Champion Spotlight Card */}
          {champion && (
            <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-2 border-amber-500/60 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-xs font-black text-amber-300">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>GRAND CHAMPION • 1ST PLACE</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-black text-white">
                    {champion.team.submissions[0]?.title || champion.team.name}
                  </h2>

                  <p className="text-sm text-slate-300">
                    Built by team <span className="font-bold text-white">{champion.team.name}</span>{" "}
                    ({champion.team.leader.campus?.name || "JECRC Institution"})
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-xs text-slate-400">Team Members:</span>
                    {champion.team.members.map((m) => (
                      <span
                        key={m.user.id}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {m.user.name}
                      </span>
                    ))}
                  </div>

                  {/* Certified Credentials Link */}
                  {champion.certificates.length > 0 && (
                    <div className="pt-4 flex flex-wrap gap-2">
                      {champion.certificates.map((cert) => (
                        <Link
                          key={cert.id}
                          href={`/certificates/verify/${cert.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Verify Certificate ({cert.user.name})</span>
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center bg-slate-950/80 p-6 rounded-2xl border border-amber-500/30 min-w-[200px] self-start md:self-auto">
                  <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
                  <span className="text-3xl font-black text-white block">
                    {champion.finalScore}
                  </span>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                    Jury Final Score
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Runners-Up Cards */}
          {runnerUps.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {runnerUps.map((runner) => (
                <div
                  key={runner.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full ${
                          runner.rank === 2
                            ? "bg-slate-300/10 text-slate-200 border border-slate-400/30"
                            : "bg-amber-700/10 text-amber-300 border border-amber-700/30"
                        }`}
                      >
                        <Medal className="w-4 h-4" />
                        <span>{runner.rank === 2 ? "1ST RUNNER UP" : "2ND RUNNER UP"}</span>
                      </span>

                      <span className="text-xl font-black text-white">{runner.finalScore} pts</span>
                    </div>

                    <h3 className="text-xl font-bold text-white">
                      {runner.team.submissions[0]?.title || runner.team.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Team: {runner.team.name} • {runner.team.leader.campus?.name}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {runner.team.members.map((m) => (
                        <span
                          key={m.user.id}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          {m.user.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Certificate Link */}
                  {runner.certificates.length > 0 && (
                    <div className="pt-6 border-t border-slate-800/80 mt-4 flex flex-wrap gap-2">
                      {runner.certificates.map((cert) => (
                        <Link
                          key={cert.id}
                          href={`/certificates/verify/${cert.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300"
                        >
                          <span>Certificate ({cert.user.name})</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Other Finalists Table */}
          {otherFinalists.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-800">
                <h3 className="font-bold text-base text-white">Finalist Standings & Honorees</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-6 text-center w-16">Rank</th>
                      <th className="py-3.5 px-6">Project & Team</th>
                      <th className="py-3.5 px-6">Campus</th>
                      <th className="py-3.5 px-6">Score</th>
                      <th className="py-3.5 px-6 text-right">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {otherFinalists.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-6 text-center font-bold text-slate-400 font-mono">
                          #{f.rank}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-white block">
                            {f.team.submissions[0]?.title || f.team.name}
                          </span>
                          <span className="text-slate-400 text-[11px]">{f.team.name}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-300">
                          {f.team.leader.campus?.name || "JECRC Institutions"}
                        </td>
                        <td className="py-4 px-6 font-bold text-white">{f.finalScore}</td>
                        <td className="py-4 px-6 text-right">
                          {f.certificates[0] ? (
                            <Link
                              href={`/certificates/verify/${f.certificates[0].id}`}
                              className="text-indigo-400 hover:text-indigo-300 font-semibold"
                            >
                              Verify Credential
                            </Link>
                          ) : (
                            <span className="text-slate-500">In Issuance</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
