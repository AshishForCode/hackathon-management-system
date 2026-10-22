"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  ExternalLink,
  Video,
  FileText,
  Sliders,
  Save,
  MessageSquare,
  FileCode,
  Scale,
} from "lucide-react";
import { EvaluationRound } from "@prisma/client";

interface Criterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  maxScore: number;
}

interface Rubric {
  id: string;
  name: string;
  round: EvaluationRound;
  criteria: Criterion[];
}

interface ScoreRecord {
  criterionId: string;
  score: number;
  comment?: string | null;
}

interface ExistingEvaluation {
  id: string;
  totalScore: number | null;
  comments: string | null;
  isLocked: boolean;
  scores: ScoreRecord[];
}

interface SubmissionQueueItem {
  id: string;
  title: string;
  description: string | null;
  techStack: string | null;
  repoUrl: string | null;
  demoVideoUrl: string | null;
  presentationUrl: string | null;
  track?: { name: string } | null;
  team: {
    id: string;
    name: string;
    leader: {
      id: string;
      name: string;
      campus?: { name: string; code: string } | null;
    };
  };
  myEvaluation?: ExistingEvaluation | null;
  hasEvaluated: boolean;
}

export function EvaluateClient({ hackathonId }: { hackathonId: string }) {
  const { data: session } = useSession();
  const user = session?.user;

  const isJuryOrAdmin =
    user &&
    ["JURY", "SUPER_ADMIN", "CAMPUS_ADMIN", "ORGANIZER"].includes(user.role);

  const [loading, setLoading] = useState(true);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionQueueItem[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Evaluation Form State
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoreComments, setScoreComments] = useState<Record<string, string>>({});
  const [overallComments, setOverallComments] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const populateSubmissionForm = useCallback(
    (sub: SubmissionQueueItem, activeRubric: Rubric | null) => {
      setSelectedSubId(sub.id);
      const initialScores: Record<string, number> = {};
      const initialComments: Record<string, string> = {};

      if (sub.myEvaluation) {
        sub.myEvaluation.scores.forEach((sc) => {
          initialScores[sc.criterionId] = sc.score;
          if (sc.comment) initialComments[sc.criterionId] = sc.comment;
        });
        setOverallComments(sub.myEvaluation.comments || "");
        setIsLocked(sub.myEvaluation.isLocked);
      } else if (activeRubric) {
        activeRubric.criteria.forEach((c) => {
          initialScores[c.id] = Math.round(c.maxScore / 2);
        });
        setOverallComments("");
        setIsLocked(false);
      }

      setScores(initialScores);
      setScoreComments(initialComments);
    },
    []
  );

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [rubricRes, queueRes] = await Promise.all([
          fetch(`/api/v1/hackathons/${hackathonId}/rubrics`),
          fetch(`/api/v1/hackathons/${hackathonId}/evaluations`),
        ]);

        let loadedRubric: Rubric | null = null;
        const rubricJson = await rubricRes.json();
        if (!ignore && rubricJson.success && rubricJson.data) {
          loadedRubric = rubricJson.data;
          setRubric(loadedRubric);
        }

        const queueJson = await queueRes.json();
        if (!ignore && queueJson.success && queueJson.data) {
          const queue: SubmissionQueueItem[] = queueJson.data || [];
          setSubmissions(queue);
          if (queue.length > 0 && !selectedSubId) {
            populateSubmissionForm(queue[0], loadedRubric);
          }
        }
      } catch {
        if (!ignore) {
          setMessage({ type: "error", text: "Failed to load evaluation workspace." });
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
  }, [hackathonId, selectedSubId, populateSubmissionForm, refreshKey]);

  // Compute live normalized score (0 - 100)
  const calculateLiveScore = () => {
    if (!rubric) return 0;
    let weightedSum = 0;
    let maxWeighted = 0;

    rubric.criteria.forEach((c) => {
      const val = scores[c.id] ?? 0;
      weightedSum += val * c.weight;
      maxWeighted += c.maxScore * c.weight;
    });

    if (maxWeighted === 0) return 0;
    return Math.round((weightedSum / maxWeighted) * 100 * 10) / 10;
  };

  const handleScoreChange = (criterionId: string, val: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: val }));
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubId || !rubric) return;

    setSubmitting(true);
    setMessage(null);

    const scorePayload = rubric.criteria.map((c) => ({
      criterionId: c.id,
      score: Number(scores[c.id] || 0),
      comment: scoreComments[c.id] || null,
    }));

    try {
      const res = await fetch(`/api/v1/submissions/${selectedSubId}/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rubricId: rubric.id,
          round: rubric.round,
          scores: scorePayload,
          comments: overallComments.trim() || null,
          isLocked,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: `Evaluation successfully saved! Total score: ${json.data.totalScore}/100.`,
        });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to submit evaluation." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Loading jury scoring console...</p>
      </div>
    );
  }

  if (!isJuryOrAdmin) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Jury Access Only</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          This portal is reserved for designated jury members and hackathon organizers.
        </p>
        <Link
          href={`/hackathons/${hackathonId}`}
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white"
        >
          Back to Overview
        </Link>
      </div>
    );
  }

  const selectedSub = submissions.find((s) => s.id === selectedSubId);
  const liveTotal = calculateLiveScore();

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
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Scale className="w-4 h-4" />
            <span>Jury Evaluation Workspace</span>
          </div>
          <h1 className="text-3xl font-black text-white">Score Finalist Submissions</h1>
          <p className="text-sm text-slate-300 mt-1">
            Evaluate project architectures, verify GitHub repositories, and assign rubric scores.
          </p>
        </div>

        <Link
          href={`/hackathons/${hackathonId}/leaderboard`}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 shadow-md transition-colors self-start md:self-auto cursor-pointer"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>View Live Leaderboard</span>
        </Link>
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

      {/* Submissions Queue & Evaluation Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Submissions Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Assigned Queue ({submissions.length})
            </h3>
            <span className="text-xs text-slate-400">
              {submissions.filter((s) => s.hasEvaluated).length} evaluated
            </span>
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {submissions.map((sub) => {
              const isSelected = sub.id === selectedSubId;
              return (
                <div
                  key={sub.id}
                  onClick={() => populateSubmissionForm(sub, rubric)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-950 text-indigo-300 border border-indigo-500/20 line-clamp-1">
                      {sub.track?.name || "Open Innovation"}
                    </span>
                    {sub.hasEvaluated ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Scored: {sub.myEvaluation?.totalScore}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">
                        Pending
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-white line-clamp-1">{sub.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Team: {sub.team.name}{" "}
                    {sub.team.leader.campus ? `(${sub.team.leader.campus.name})` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Scoring Console & Project Details */}
        <div className="lg:col-span-8 space-y-6">
          {selectedSub && rubric ? (
            <div className="space-y-6">
              {/* Project Card Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 inline-block mb-2">
                      {selectedSub.track?.name || "Open Innovation"}
                    </span>
                    <h2 className="text-2xl font-black text-white">{selectedSub.title}</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Team: <span className="font-semibold text-slate-200">{selectedSub.team.name}</span>{" "}
                      • Led by {selectedSub.team.leader.name}
                    </p>
                  </div>

                  {/* Links Quick Toolbar */}
                  <div className="flex items-center gap-2">
                    {selectedSub.repoUrl && (
                      <a
                        href={selectedSub.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors"
                      >
                        <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Code Repo</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                    {selectedSub.demoVideoUrl && (
                      <a
                        href={selectedSub.demoVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-purple-400 border border-slate-800 transition-colors"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Demo Video</span>
                      </a>
                    )}
                    {selectedSub.presentationUrl && (
                      <a
                        href={selectedSub.presentationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Pitch Deck</span>
                      </a>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  {selectedSub.description}
                </p>

                {selectedSub.techStack && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSub.techStack.split(",").map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rubric Scoring Form */}
              <form
                onSubmit={handleSubmitScore}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <span>{rubric.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adjust criteria scores according to the standardized rubric guidelines.
                    </p>
                  </div>

                  {/* Live Total Score Pill */}
                  <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl px-5 py-2 text-right">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                      Live Normalized Score
                    </span>
                    <span className="text-2xl font-black text-white">{liveTotal}</span>
                    <span className="text-xs text-slate-400"> / 100</span>
                  </div>
                </div>

                {/* Criteria Sliders */}
                <div className="space-y-5">
                  {rubric.criteria.map((criterion) => {
                    const currentScore = scores[criterion.id] ?? 0;
                    return (
                      <div
                        key={criterion.id}
                        className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{criterion.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                Weight: {criterion.weight}x
                              </span>
                            </div>
                            {criterion.description && (
                              <p className="text-xs text-slate-400 mt-1">{criterion.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <input
                              type="number"
                              min={0}
                              max={criterion.maxScore}
                              value={currentScore}
                              onChange={(e) =>
                                handleScoreChange(criterion.id, Math.max(0, Number(e.target.value)))
                              }
                              className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-center text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                            />
                            <span className="text-xs text-slate-400">/ {criterion.maxScore}</span>
                          </div>
                        </div>

                        {/* Range Slider */}
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={criterion.maxScore}
                            step={1}
                            value={currentScore}
                            onChange={(e) =>
                              handleScoreChange(criterion.id, Number(e.target.value))
                            }
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overall Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Qualitative Jury Feedback & Strengths</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Provide constructive feedback on what the team built well and recommendations for scaling..."
                    value={overallComments}
                    onChange={(e) => setOverallComments(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Finalize Lock Checkbox */}
                <div className="flex items-center gap-2.5 pt-2">
                  <input
                    type="checkbox"
                    id="lockScore"
                    checked={isLocked}
                    onChange={(e) => setIsLocked(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="lockScore" className="text-xs text-slate-300 cursor-pointer flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Lock this evaluation (prevents further accidental edits)</span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{submitting ? "Saving Evaluation..." : "Save Evaluation"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center shadow-xl">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No Finalist Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Select a project submission from the queue on the left to begin scoring.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
