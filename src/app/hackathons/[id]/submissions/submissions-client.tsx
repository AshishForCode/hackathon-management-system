"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Code,
  Video,
  FileText,
  Search,
  Filter,
  ArrowLeft,
  ExternalLink,
  Layers,
  Sparkles,
  GitCommit,
  Star,
  Users,
  Building,
  CheckCircle2,
  X,
  FileCode,
} from "lucide-react";
import { HackathonStatus } from "@prisma/client";

interface Track {
  id: string;
  name: string;
}

interface RepoSnapshot {
  totalCommits: number;
  contributors: number;
  languages: Record<string, number> | null;
  readme: string | null;
  stars: number;
  branches: string[] | null;
}

interface TeamMember {
  user: {
    id: string;
    name: string;
    campus?: { code: string } | null;
  };
}

interface SubmissionItem {
  id: string;
  title: string;
  description: string | null;
  techStack: string | null;
  demoVideoUrl: string | null;
  presentationUrl: string | null;
  repoUrl: string | null;
  isFinal: boolean;
  submittedAt: string;
  track?: Track | null;
  repoSnapshot?: RepoSnapshot | null;
  team: {
    id: string;
    name: string;
    leader: {
      id: string;
      name: string;
      campus?: { name: string; code: string } | null;
    };
    members: TeamMember[];
  };
}

export function SubmissionsClient({ hackathonId }: { hackathonId: string }) {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [hackathonTitle, setHackathonTitle] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeModalItem, setActiveModalItem] = useState<SubmissionItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [hackRes, subRes] = await Promise.all([
        fetch(`/api/v1/hackathons/${hackathonId}`),
        fetch(`/api/v1/hackathons/${hackathonId}/submissions?finalOnly=false&limit=100`),
      ]);

      const hackJson = await hackRes.json();
      if (hackJson.success && hackJson.data) {
        setHackathonTitle(hackJson.data.title);
        setTracks(hackJson.data.tracks || []);
      }

      const subJson = await subRes.json();
      if (subJson.success && subJson.data) {
        setSubmissions(subJson.data || []);
      }
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter submissions
  const filteredSubmissions = submissions.filter((item) => {
    const matchesTrack = selectedTrack === "ALL" || item.track?.id === selectedTrack;
    if (!matchesTrack) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.techStack && item.techStack.toLowerCase().includes(q)) ||
      item.team.name.toLowerCase().includes(q)
    );
  });

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

      {/* Hero Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Showcase & Project Archive</span>
          </div>
          <h1 className="text-3xl font-black text-white">Project Showcase Gallery</h1>
          <p className="text-sm text-slate-300 mt-1">
            Browse creative solutions, verified repositories, and pitch decks from {hackathonTitle || "all teams"}.
          </p>
        </div>

        <Link
          href={`/hackathons/${hackathonId}/submit`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start md:self-auto"
        >
          <Code className="w-4 h-4" />
          <span>Submit Your Project</span>
        </Link>
      </div>

      {/* Search & Track Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by project title, tech stack, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {tracks.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Track:</span>
            <select
              value={selectedTrack}
              onChange={(e) => setSelectedTrack(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Tracks ({submissions.length})</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Gallery Cards Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading project gallery...</p>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-xl">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Projects Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No projects matched your filters yet. Submissions open during the hackathon window!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Chips */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {sub.track?.name || "Open Innovation"}
                  </span>

                  {sub.isFinal && (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Final
                    </span>
                  )}
                </div>

                {/* Project Title */}
                <h3
                  onClick={() => setActiveModalItem(sub)}
                  className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1 mb-2"
                >
                  {sub.title}
                </h3>

                {/* Description Snippet */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {sub.description}
                </p>

                {/* Tech Stack Pills */}
                {sub.techStack && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {sub.techStack
                      .split(",")
                      .slice(0, 4)
                      .map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {t.trim()}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Bottom Card Footer */}
              <div>
                {/* Team & Campus Info */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="font-semibold text-slate-200">{sub.team.name}</span>
                  {sub.team.leader.campus && (
                    <span className="text-[11px] text-slate-400">
                      {sub.team.leader.campus.name}
                    </span>
                  )}
                </div>

                {/* Links Toolbar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {sub.repoUrl && (
                      <a
                        href={sub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="GitHub Repository"
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {sub.demoVideoUrl && (
                      <a
                        href={sub.demoVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Watch Demo Video"
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-purple-400 hover:text-purple-300 transition-colors border border-slate-800"
                      >
                        <Video className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {sub.presentationUrl && (
                      <a
                        href={sub.presentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View Presentation Deck"
                        className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors border border-slate-800"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveModalItem(sub)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 relative">
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-950 border border-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-2 inline-block">
                {activeModalItem.track?.name || "Open Innovation"}
              </span>
              <h2 className="text-2xl font-black text-white">{activeModalItem.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Built by <span className="font-semibold text-white">{activeModalItem.team.name}</span>{" "}
                ({activeModalItem.team.members.length} team members)
              </p>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Project Overview & Architecture
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                {activeModalItem.description}
              </p>
            </div>

            {/* Repo Snapshot Stats */}
            {activeModalItem.repoSnapshot && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Repository Audit Statistics
                </h4>
                <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 block mb-1">Total Commits</span>
                    <span className="font-bold text-white text-base">
                      {activeModalItem.repoSnapshot.totalCommits}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Contributors</span>
                    <span className="font-bold text-white text-base">
                      {activeModalItem.repoSnapshot.contributors}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Stars</span>
                    <span className="font-bold text-white text-base">
                      {activeModalItem.repoSnapshot.stars}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-3 pt-2">
              {activeModalItem.repoUrl && (
                <a
                  href={activeModalItem.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Inspect GitHub Repo</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
              {activeModalItem.demoVideoUrl && (
                <a
                  href={activeModalItem.demoVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  <Video className="w-4 h-4" />
                  <span>Watch Video Demo</span>
                </a>
              )}
              {activeModalItem.presentationUrl && (
                <a
                  href={activeModalItem.presentationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open Pitch Deck</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
