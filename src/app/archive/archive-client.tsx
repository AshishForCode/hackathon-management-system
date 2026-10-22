"use client";

import { useState, useEffect } from "react";
import {
  Archive,
  Search,
  Trophy,
  Crown,
  FileCode,
  Video,
  FileText,
  Layers,
  GitCommit,
} from "lucide-react";

interface CampusMeta {
  code: string;
  name: string;
}

interface HackathonMeta {
  id: string;
  title: string;
  slug: string;
}

interface ProjectArchiveItem {
  id: string;
  title: string;
  description: string | null;
  techStack: string | null;
  repoUrl: string | null;
  demoVideoUrl: string | null;
  presentationUrl: string | null;
  trackName: string;
  submittedAt: string;
  hackathon: {
    id: string;
    title: string;
    slug: string;
    year: number;
  };
  campus: {
    code: string;
    name: string;
  };
  team: {
    id: string;
    name: string;
    leaderName: string;
    membersCount: number;
    members: string[];
  };
  award: string | null;
  repoStats: {
    commits: number;
    stars: number;
    contributors: number;
    languages: Record<string, number> | null;
  } | null;
}

interface ArchiveData {
  projects: ProjectArchiveItem[];
  total: number;
  campuses: CampusMeta[];
  hackathons: HackathonMeta[];
}

export function ArchiveClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ArchiveData | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("ALL");
  const [selectedHackathon, setSelectedHackathon] = useState("ALL");
  const [winnersOnly, setWinnersOnly] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchArchive() {
      try {
        const params = new URLSearchParams();
        if (selectedCampus !== "ALL") params.set("campus", selectedCampus);
        if (selectedHackathon !== "ALL") params.set("hackathonId", selectedHackathon);
        if (winnersOnly) params.set("winnersOnly", "true");
        if (activeSearch.trim()) params.set("search", activeSearch.trim());

        const res = await fetch(`/api/v1/archive?${params.toString()}`);
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setData(json.data);
        }
      } catch {
        // Handle error
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchArchive();

    return () => {
      ignore = true;
    };
  }, [selectedCampus, selectedHackathon, winnersOnly, activeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setActiveSearch(search);
  };

  const projects = data?.projects || [];

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
            <Archive className="w-4 h-4" />
            <span>Permanent Campus Innovation Ledger</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Multi-Campus Project Archive
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Explore verified open-source repositories, pitch decks, and winning technologies
            built across JECRC University & JECRC Foundation hackathons.
          </p>
        </div>

        <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 text-center min-w-[160px] self-start md:self-auto">
          <span className="text-3xl font-black text-white block">{data?.total || 0}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wider">Archived Projects</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search titles, tech stack (e.g. Next.js, AI)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Campus Selector */}
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Campuses</option>
            {data?.campuses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Hackathon Selector */}
          {data?.hackathons && data.hackathons.length > 0 && (
            <select
              value={selectedHackathon}
              onChange={(e) => setSelectedHackathon(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Hackathons</option>
              {data.hackathons.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title}
                </option>
              ))}
            </select>
          )}

          {/* Winners Only Toggle */}
          <button
            type="button"
            onClick={() => setWinnersOnly(!winnersOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              winnersOnly
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Award Winners Only</span>
          </button>
        </div>
      </div>

      {/* Archive Cards Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-slate-400">Loading project repository archive...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-xl">
          <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Projects Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No projects matched your search criteria. Try clearing search filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`bg-slate-900/90 border rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between group ${
                proj.award
                  ? "border-amber-500/40 hover:border-amber-500/70"
                  : "border-slate-800 hover:border-indigo-500/50"
              }`}
            >
              <div>
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                    {proj.hackathon.title} ({proj.hackathon.year})
                  </span>

                  {proj.award && (
                    <span className="flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>{proj.award}</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1 mb-2">
                  {proj.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {proj.description}
                </p>

                {/* Tech Stack */}
                {proj.techStack && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {proj.techStack
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
                {/* Team & Campus */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 mb-4">
                  <div>
                    <span className="font-semibold text-slate-200 block">{proj.team.name}</span>
                    <span className="text-[11px] text-slate-400">{proj.campus.name}</span>
                  </div>

                  {proj.repoStats && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{proj.repoStats.commits} commits</span>
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="flex items-center gap-2">
                  {proj.repoUrl && (
                    <a
                      href={proj.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Inspect GitHub Code"
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-800"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {proj.demoVideoUrl && (
                    <a
                      href={proj.demoVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Watch Demo Video"
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-purple-400 border border-slate-800"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {proj.presentationUrl && (
                    <a
                      href={proj.presentationUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="View Pitch Deck"
                      className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
