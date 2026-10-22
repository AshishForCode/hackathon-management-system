"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Trophy,
  PlusCircle,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { HackathonMode } from "@prisma/client";

interface Campus {
  id: string;
  name: string;
  code: string;
}

export default function CreateHackathonPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;

  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    mode: HackathonMode.HYBRID,
    campusId: "",
    isInterCampus: true,
    registrationStart: "2026-11-01T00:00",
    registrationEnd: "2026-11-15T23:59",
    startDate: "2026-11-20T09:00",
    endDate: "2026-11-21T18:00",
    submissionDeadline: "2026-11-21T16:00",
    minTeamSize: 2,
    maxTeamSize: 4,
    venue: "Main Auditorium, JECRC Campus",
    rules: "1. All code must be developed during the hackathon.\n2. Projects must include working demo and GitHub repo.\n3. Plagiarism is strictly prohibited.",
    eligibility: "Open to all enrolled students of JECRC University & JECRC Foundation.",
    prizes: "🥇 1st Place: ₹50,000\n🥈 2nd Place: ₹30,000\n🥉 3rd Place: ₹15,000",
    website: "",
    bannerImage: "",
  });

  const [tracks, setTracks] = useState<Array<{ name: string; description: string }>>([
    { name: "AI & Machine Learning", description: "Solutions leveraging generative AI, computer vision, or NLP." },
    { name: "FinTech & Web3", description: "Digital payments, decentralized finance, and smart contracts." },
    { name: "Open Innovation", description: "Novel solutions addressing real-world community challenges." },
  ]);

  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([
    { question: "Who can register?", answer: "Any active student from JECRC University or JECRC Foundation." },
    { question: "Is registration free?", answer: "Yes, participation is completely free." },
  ]);

  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/v1/campuses");
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setCampuses(json.data);
          const defaultCampusId = user?.campusId || json.data[0].id;
          setFormData((prev) => ({ ...prev, campusId: defaultCampusId }));
        }
      } catch {
        setErrorMessage("Unable to fetch campus list. Please reload the page.");
      }
    }
    loadCampuses();
  }, [user]);

  // Auto-slug generator from title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: generatedSlug,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const target = e.target;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;
    setFormData((prev) => ({ ...prev, [target.name]: value }));
    setErrorMessage("");
  };

  // Track manipulation
  const addTrack = () => {
    setTracks([...tracks, { name: "", description: "" }]);
  };

  const removeTrack = (index: number) => {
    setTracks(tracks.filter((_, i) => i !== index));
  };

  const updateTrack = (index: number, field: "name" | "description", val: string) => {
    const next = [...tracks];
    next[index][field] = val;
    setTracks(next);
  };

  // FAQ manipulation
  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: "question" | "answer", val: string) => {
    const next = [...faqs];
    next[index][field] = val;
    setFaqs(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const payload = {
        ...formData,
        minTeamSize: Number(formData.minTeamSize),
        maxTeamSize: Number(formData.maxTeamSize),
        tracks: tracks.filter((t) => t.name.trim() !== ""),
        faqs: faqs.filter((f) => f.question.trim() !== "" && f.answer.trim() !== ""),
      };

      const res = await fetch("/api/v1/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json.success) {
        setErrorMessage(json.error?.message || "Failed to create hackathon.");
        setLoading(false);
        return;
      }

      router.push(`/hackathons/${json.data.slug || json.data.id}`);
      router.refresh();
    } catch {
      setErrorMessage("Network error occurred while creating hackathon.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Link href="/hackathons" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Hackathons
        </Link>
        <span>/</span>
        <span className="text-slate-200">New Competition</span>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-slate-800 pb-6 mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create New Hackathon
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure hackathon rules, problem tracks, timeline deadlines, and campus eligibility.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-sm text-rose-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              1. Basic Information & Scope
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Hackathon Title
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="e.g. HackJECRC 2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  required
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="e.g. hackjecrc-2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Description / Theme
              </label>
              <textarea
                name="description"
                required
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Overview of the hackathon, primary themes, and expectations..."
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Hosting Campus
                </label>
                <select
                  name="campusId"
                  value={formData.campusId}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Event Mode
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={HackathonMode.HYBRID}>Hybrid</option>
                  <option value={HackathonMode.OFFLINE}>Offline / On-Campus</option>
                  <option value={HackathonMode.ONLINE}>Online / Virtual</option>
                </select>
              </div>

              <div className="flex items-center sm:pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isInterCampus"
                    checked={formData.isInterCampus}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-800 bg-slate-950/60"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    Open Inter-Campus (Univ & Foundation)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Timeline & Dates */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              2. Timeline & Deadlines
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Registration Starts
                </label>
                <input
                  type="datetime-local"
                  name="registrationStart"
                  required
                  value={formData.registrationStart}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Registration Deadline
                </label>
                <input
                  type="datetime-local"
                  name="registrationEnd"
                  required
                  value={formData.registrationEnd}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Hackathon Kickoff (Start)
                </label>
                <input
                  type="datetime-local"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Project Submission Deadline
                </label>
                <input
                  type="datetime-local"
                  name="submissionDeadline"
                  required
                  value={formData.submissionDeadline}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Minimum Team Size
                </label>
                <input
                  type="number"
                  name="minTeamSize"
                  min={1}
                  max={formData.maxTeamSize}
                  value={formData.minTeamSize}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Maximum Team Size
                </label>
                <input
                  type="number"
                  name="maxTeamSize"
                  min={formData.minTeamSize}
                  max={10}
                  value={formData.maxTeamSize}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Problem Statements / Tracks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-base font-bold text-white">
                3. Problem Statement Tracks
              </h2>
              <button
                type="button"
                onClick={addTrack}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Track
              </button>
            </div>

            <div className="space-y-3">
              {tracks.map((track, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                >
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="text"
                      placeholder="Track Title (e.g. HealthTech)"
                      value={track.name}
                      onChange={(e) => updateTrack(idx, "name", e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Brief problem statement or track scope..."
                      value={track.description}
                      onChange={(e) => updateTrack(idx, "description", e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTrack(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Rules, Eligibility & Prizes */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white border-b border-slate-800 pb-2">
              4. Rules & Prizes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Rules & Guidelines
                </label>
                <textarea
                  name="rules"
                  rows={3}
                  value={formData.rules}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Prizes & Awards Breakdown
                </label>
                <textarea
                  name="prizes"
                  rows={3}
                  value={formData.prizes}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: FAQs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                5. Frequently Asked Questions (FAQs)
              </h2>
              <button
                type="button"
                onClick={addFaq}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add FAQ
              </button>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                >
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="text"
                      placeholder="Question (e.g. Can I participate solo?)"
                      value={faq.question}
                      onChange={(e) => updateFaq(idx, "question", e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      placeholder="Answer..."
                      value={faq.answer}
                      onChange={(e) => updateFaq(idx, "answer", e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {faqs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFaq(idx)}
                      className="p-2 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <Link
              href="/hackathons"
              className="text-sm font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-xl shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Publishing Hackathon..." : "Create & Save Hackathon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
