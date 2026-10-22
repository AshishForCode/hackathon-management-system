"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Users,
  MapPin,
  ShieldCheck,
  Award,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Layers,
} from "lucide-react";
import { StatusBadge } from "@/components/hackathon/status-badge";
import { HackathonStatus, HackathonMode } from "@prisma/client";
import { HACKATHON_STATUS_TRANSITIONS } from "@/lib/utils/constants";

interface Track {
  id: string;
  name: string;
  description: string | null;
  maxTeams: number | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface Sponsor {
  id: string;
  name: string;
  tier: string;
  logoUrl: string | null;
  website: string | null;
}

interface HackathonDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: HackathonStatus;
  mode: HackathonMode;
  venue: string | null;
  isInterCampus: boolean;
  registrationStart: string | null;
  registrationEnd: string | null;
  startDate: string | null;
  endDate: string | null;
  submissionDeadline: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  rules: string | null;
  eligibility: string | null;
  prizes: string | null;
  campus?: { id: string; name: string; code: string } | null;
  tracks: Track[];
  faqs: FAQ[];
  sponsors: Sponsor[];
  _count?: {
    registrations: number;
    teams: number;
    submissions: number;
  };
}

export function HackathonDetailClient({ hackathonId }: { hackathonId: string }) {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user && ["SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);

  const [hackathon, setHackathon] = useState<HackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracks" | "rules" | "prizes" | "faqs">("tracks");
  const [faqOpen, setFaqOpen] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/v1/hackathons/${hackathonId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setHackathon(json.data);
        }
      } catch {
        setMessage({ type: "error", text: "Failed to load hackathon details." });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [hackathonId]);

  const handleStatusChange = async (newStatus: HackathonStatus) => {
    if (!hackathon) return;
    setTransitioning(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/hackathons/${hackathon.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (json.success) {
        setHackathon((prev) => (prev ? { ...prev, status: newStatus } : null));
        setMessage({ type: "success", text: `Hackathon lifecycle transitioned to ${newStatus.replace("_", " ")}!` });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Status transition failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setTransitioning(false);
    }
  };

  const toggleFaq = (id: string) => {
    setFaqOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Loading hackathon overview...</p>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Hackathon Not Found</h2>
        <p className="text-xs text-slate-400 mt-2">The competition you are looking for does not exist or has been removed.</p>
        <Link href="/hackathons" className="mt-6 inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white">
          Back to List
        </Link>
      </div>
    );
  }

  const nextStatuses = (HACKATHON_STATUS_TRANSITIONS[hackathon.status] || []) as HackathonStatus[];

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Toast Notification */}
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

      {/* Hero Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusBadge status={hackathon.status} />
              {hackathon.isInterCampus ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Inter-Campus Event
                </span>
              ) : hackathon.campus ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {hackathon.campus.name}
                </span>
              ) : null}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {hackathon.mode}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              {hackathon.title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              {hackathon.description}
            </p>

            {/* Quick Metadata Chips */}
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-slate-300">
              {hackathon.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span>{hackathon.venue}</span>
                </div>
              )}
              {hackathon.startDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>
                    {new Date(hackathon.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                <span>
                  Team size: {hackathon.minTeamSize}-{hackathon.maxTeamSize} members
                </span>
              </div>
            </div>
          </div>

          {/* Action Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3 min-w-[240px]">
            <div className="text-center pb-3 border-b border-slate-800/80">
              <div className="text-2xl font-black text-white">
                {hackathon._count?.registrations || 0}
              </div>
              <div className="text-xs text-slate-400">Registered Students</div>
            </div>

            <Link
              href={`/hackathons/${hackathon.slug || hackathon.id}/register`}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-center text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Register for Hackathon
            </Link>

            <Link
              href={`/hackathons/${hackathon.slug || hackathon.id}/teams`}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-center text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              Browse Teams & Matchmaking
            </Link>
          </div>
        </div>

        {/* Admin Lifecycle Status Controls */}
        {isAdmin && nextStatuses.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Admin Lifecycle Control
                </span>
                <p className="text-[11px] text-slate-400">
                  Current stage: {hackathon.status.replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {nextStatuses.map((nxt) => (
                <button
                  key={nxt}
                  onClick={() => handleStatusChange(nxt)}
                  disabled={transitioning}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  {transitioning ? "Transitioning..." : `Advance to: ${nxt.replace("_", " ")}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Tabs */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          {[
            { id: "tracks", label: "Problem Tracks", count: hackathon.tracks.length },
            { id: "rules", label: "Rules & Eligibility" },
            { id: "prizes", label: "Prizes & Awards" },
            { id: "faqs", label: "FAQs", count: hackathon.faqs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "tracks" | "rules" | "prizes" | "faqs")}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Tracks */}
        {activeTab === "tracks" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hackathon.tracks.length === 0 ? (
              <p className="text-sm text-slate-400 col-span-2 py-8 text-center">No tracks specified yet.</p>
            ) : (
              hackathon.tracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-md"
                >
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-base mb-2">
                    <Layers className="w-4 h-4" />
                    {track.name}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {track.description || "Open challenge track for creative submissions."}
                  </p>
                  {track.maxTeams && (
                    <div className="mt-4 text-[11px] text-slate-500">
                      Cap: {track.maxTeams} teams
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Rules */}
        {activeTab === "rules" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-md space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Eligibility
              </h3>
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {hackathon.eligibility || "Open to all verified students of JECRC University & JECRC Foundation."}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
                Competition Rules
              </h3>
              <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {hackathon.rules || "Standard hackathon rules apply. Working demo and source code required."}
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Prizes */}
        {activeTab === "prizes" && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Prizes & Recognition
            </h3>
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
              {hackathon.prizes || "Prizes will be announced prior to the hackathon kickoff."}
            </div>
          </div>
        )}

        {/* Tab 4: FAQs */}
        {activeTab === "faqs" && (
          <div className="space-y-3">
            {hackathon.faqs.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No FAQs posted yet.</p>
            ) : (
              hackathon.faqs.map((faq) => {
                const isOpen = faqOpen[faq.id];
                return (
                  <div
                    key={faq.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-white hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
