"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Code,
  Video,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Sparkles,
  GitCommit,
  GitBranch,
  Star,
  Users,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/components/hackathon/status-badge";
import { HackathonStatus } from "@prisma/client";

interface Track {
  id: string;
  name: string;
  description: string | null;
}

interface RepoSnapshotData {
  totalCommits: number;
  contributors: number;
  languages: Record<string, number> | null;
  readme: string | null;
  lastActivity: string | null;
  stars: number;
  branches: string[] | null;
  flaggedCommits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
    reason: string;
  }> | null;
  syncedAt: string;
}

interface SubmissionData {
  id: string;
  title: string;
  description: string | null;
  techStack: string | null;
  trackId: string | null;
  demoVideoUrl: string | null;
  presentationUrl: string | null;
  repoUrl: string | null;
  isFinal: boolean;
  submittedAt: string;
  repoSnapshot?: RepoSnapshotData | null;
}

interface UserTeam {
  id: string;
  name: string;
  inviteCode: string;
}

interface HackathonMeta {
  id: string;
  title: string;
  slug: string;
  status: HackathonStatus;
  submissionDeadline: string | null;
  tracks: Track[];
}

export function SubmitClient({ hackathonId }: { hackathonId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const [loading, setLoading] = useState(true);
  const [hackathon, setHackathon] = useState<HackathonMeta | null>(null);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [submission, setSubmission] = useState<SubmissionData | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [trackId, setTrackId] = useState("");
  const [techStack, setTechStack] = useState("");
  const [description, setDescription] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  const [presentationUrl, setPresentationUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  // UI State
  const [saving, setSaving] = useState(false);
  const [syncingRepo, setSyncingRepo] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [confirmLockOpen, setConfirmLockOpen] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [hackathonRes, subRes] = await Promise.all([
        fetch(`/api/v1/hackathons/${hackathonId}`),
        fetch(`/api/v1/hackathons/${hackathonId}/submissions?mine=true`),
      ]);

      const hackathonJson = await hackathonRes.json();
      if (hackathonJson.success) {
        setHackathon(hackathonJson.data);
      }

      if (subRes.ok) {
        const subJson = await subRes.json();
        if (subJson.success && subJson.data) {
          const { submission: existingSub, team: userTeam } = subJson.data;
          setTeam(userTeam);
          if (existingSub) {
            setSubmission(existingSub);
            setTitle(existingSub.title || "");
            setTrackId(existingSub.trackId || "");
            setTechStack(existingSub.techStack || "");
            setDescription(existingSub.description || "");
            setDemoVideoUrl(existingSub.demoVideoUrl || "");
            setPresentationUrl(existingSub.presentationUrl || "");
            setRepoUrl(existingSub.repoUrl || "");
          }
        }
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load submission data." });
    } finally {
      setLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Presentation File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/uploads", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.url) {
        setPresentationUrl(json.data.url);
        setMessage({ type: "success", text: `Pitch deck uploaded: ${file.name}` });
      } else {
        setMessage({ type: "error", text: json.error?.message || "File upload failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error during upload." });
    } finally {
      setUploadingFile(false);
    }
  };

  // Save Progress Draft
  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !repoUrl.trim() || !techStack.trim()) {
      setMessage({
        type: "error",
        text: "Please provide a Project Title, Tech Stack, and Git Repository URL.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/hackathons/${hackathonId}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || "Work in progress...",
          techStack: techStack.trim(),
          trackId: trackId || null,
          demoVideoUrl: demoVideoUrl.trim() || null,
          presentationUrl: presentationUrl.trim() || null,
          repoUrl: repoUrl.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmission(json.data);
        setMessage({ type: "success", text: "Submission draft saved successfully!" });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save draft." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  // Sync Git Repo Activity
  const handleSyncRepo = async () => {
    if (!repoUrl.trim()) {
      setMessage({ type: "error", text: "Enter a valid GitHub URL before syncing." });
      return;
    }

    // Auto-save draft if new submission
    if (!submission?.id) {
      await handleSaveDraft();
    }

    setSyncingRepo(true);
    setMessage(null);

    try {
      const targetId = submission?.id;
      if (!targetId) return;

      const res = await fetch(`/api/v1/submissions/${targetId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmission((prev) => (prev ? { ...prev, repoSnapshot: json.data } : null));
        setMessage({
          type: "success",
          text: `GitHub repository synced! ${json.data.totalCommits} commits analyzed.`,
        });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to sync GitHub repo." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to connect to GitHub API." });
    } finally {
      setSyncingRepo(false);
    }
  };

  // Finalize Submission
  const handleFinalize = async () => {
    if (!submission?.id) return;

    setSaving(true);
    setConfirmLockOpen(false);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/submissions/${submission.id}/finalize`, {
        method: "POST",
      });

      const json = await res.json();
      if (json.success) {
        setSubmission(json.data);
        setMessage({
          type: "success",
          text: "🏆 Project finalized! Your submission is now locked for evaluation.",
        });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to finalize project." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Loading submission portal...</p>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Hackathon Not Found</h2>
        <Link
          href="/hackathons"
          className="mt-6 inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white"
        >
          Back to Hackathons
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
        <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Sign In Required</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          You must be logged in with your team credentials to submit a project.
        </p>
        <Link
          href={`/login?callbackUrl=/hackathons/${hackathon.slug || hackathon.id}/submit`}
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
        <Users className="w-12 h-12 text-purple-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Team Required</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          Project submissions are team-based. You must create or join a team for this hackathon first.
        </p>
        <Link
          href={`/hackathons/${hackathon.slug || hackathon.id}/teams`}
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
        >
          Go to Team Hub
        </Link>
      </div>
    );
  }

  const isFinal = submission?.isFinal || false;
  const snapshot = submission?.repoSnapshot;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href={`/hackathons/${hackathon.slug || hackathon.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {hackathon.title}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              Team: {team.name}
            </span>
            <StatusBadge status={hackathon.status} />
          </div>

          <h1 className="text-3xl font-black text-white">Project Submission Portal</h1>
          <p className="text-sm text-slate-300 mt-1">
            Connect your GitHub repository, upload pitch decks, and record demo media.
          </p>
        </div>

        {hackathon.submissionDeadline && (
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl text-xs text-slate-400 flex items-center gap-3 self-start md:self-auto">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="block font-bold text-slate-200">Submission Deadline</span>
              <span>
                {new Date(hackathon.submissionDeadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        )}
      </div>

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

      {/* Locked Submission State Alert */}
      {isFinal && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 flex items-start gap-4 shadow-xl">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 flex-shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Project Submitted & Locked for Evaluation</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
              Your submission has been formally received and locked for jury evaluation. Your team
              roster and repository commit state at finalization are preserved for audit.
            </p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/hackathons/${hackathon.slug || hackathon.id}/submissions`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                <span>View in Project Gallery</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSaveDraft} className="space-y-8">
        {/* Section 1: Basic Identity */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Project Identity</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Title *
              </label>
              <input
                type="text"
                disabled={isFinal}
                placeholder="e.g. CampusPulse - Realtime IoT Multi-Campus Energy Grid"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Problem Track
              </label>
              <select
                disabled={isFinal}
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              >
                <option value="">General Open Innovation</option>
                {hackathon.tracks?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tech Stack (Comma-separated) *
              </label>
              <input
                type="text"
                disabled={isFinal}
                placeholder="e.g. Next.js, Python, PostgreSQL, PyTorch, Docker"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Description & Architecture *
              </label>
              <textarea
                rows={5}
                disabled={isFinal}
                placeholder="Describe the problem, your team's solution, system architecture, and impact across JECRC campuses..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Git Repository Sync */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-400" />
                <span>GitHub Repository Connection</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Provide your public GitHub repository. Our engine audits commit history and tech stacks.
              </p>
            </div>

            {!isFinal && (
              <button
                type="button"
                onClick={handleSyncRepo}
                disabled={syncingRepo || !repoUrl.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRepo ? "animate-spin" : ""}`} />
                <span>{syncingRepo ? "Syncing Commits..." : "Sync Latest Commits"}</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              GitHub Repository URL *
            </label>
            <div className="relative">
              <input
                type="url"
                disabled={isFinal}
                placeholder="https://github.com/organization/project-name"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Repository Snapshot Insights */}
          {snapshot && (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Audit Snapshot Synced</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(snapshot.syncedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Total Commits</span>
                  </div>
                  <span className="text-lg font-bold text-white">{snapshot.totalCommits}</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    <span>Contributors</span>
                  </div>
                  <span className="text-lg font-bold text-white">{snapshot.contributors}</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Stars</span>
                  </div>
                  <span className="text-lg font-bold text-white">{snapshot.stars}</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Branches</span>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {snapshot.branches?.length || 1}
                  </span>
                </div>
              </div>

              {/* Language breakdown */}
              {snapshot.languages && Object.keys(snapshot.languages).length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">
                    Repository Languages
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(snapshot.languages).map(([lang, bytes]) => (
                      <span
                        key={lang}
                        className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Commit Flag Warnings (if any outside competition window) */}
              {snapshot.flaggedCommits && snapshot.flaggedCommits.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300 space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>{snapshot.flaggedCommits.length} commits flagged by timeline audit</span>
                  </div>
                  <p className="text-[11px] text-rose-200">
                    Some commits were detected outside official hackathon start or deadline hours.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Media & Pitch Deck */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Video className="w-4 h-4 text-purple-400" />
            <span>Media & Pitch Presentation</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Demo Video Walkthrough URL
              </label>
              <input
                type="url"
                disabled={isFinal}
                placeholder="https://youtu.be/... or Loom link"
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Presentation Deck URL or File
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  disabled={isFinal}
                  placeholder="https://drive.google.com/... or upload PDF"
                  value={presentationUrl}
                  onChange={(e) => setPresentationUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                />

                {!isFinal && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.zip"
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingFile ? "Uploading..." : "Upload PDF"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        {!isFinal && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Drafts are auto-saved for team review. Finalizing will lock your project.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                {saving ? "Saving Draft..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={() => setConfirmLockOpen(true)}
                disabled={saving || !submission?.id}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>Finalize & Lock Project</span>
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Confirmation Modal for Final Lock */}
      {confirmLockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="p-3 w-fit rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white">Finalize & Lock Project?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to finalize{" "}
              <span className="font-semibold text-white">&quot;{title}&quot;</span>? Once locked,
              your team roster and repository state will be permanently frozen for jury evaluation.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmLockOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleFinalize}
                className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md"
              >
                Confirm & Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
