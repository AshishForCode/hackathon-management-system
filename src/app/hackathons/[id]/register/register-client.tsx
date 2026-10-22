"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Calendar,
  ShieldCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shirt,
  Code,
} from "lucide-react";
import { StatusBadge } from "@/components/hackathon/status-badge";
import { HackathonStatus, RegistrationStatus } from "@prisma/client";

interface Track {
  id: string;
  name: string;
  description: string | null;
}

interface HackathonInfo {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: HackathonStatus;
  mode: string;
  venue: string | null;
  isInterCampus: boolean;
  registrationStart: string | null;
  registrationEnd: string | null;
  startDate: string | null;
  endDate: string | null;
  minTeamSize: number;
  maxTeamSize: number;
  campusId?: string | null;
  campus?: { id: string; name: string; code: string } | null;
  tracks: Track[];
}

interface UserRegistration {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  customFields?: Record<string, unknown>;
}

export function RegisterClient({ hackathonId }: { hackathonId: string }) {
  const { data: session, status: authStatus } = useSession();
  const user = session?.user;

  const [hackathon, setHackathon] = useState<HackathonInfo | null>(null);
  const [existingReg, setExistingReg] = useState<UserRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    trackId: "",
    tshirtSize: "L",
    dietary: "Vegetarian",
    experience: "Intermediate",
    motivation: "",
    githubUrl: "",
    linkedinUrl: "",
    agreeToRules: false,
  });

  useEffect(() => {
    async function init() {
      try {
        const [hackathonRes, regRes] = await Promise.all([
          fetch(`/api/v1/hackathons/${hackathonId}`),
          fetch(`/api/v1/hackathons/${hackathonId}/register`),
        ]);

        const hackathonJson = await hackathonRes.json();
        if (hackathonJson.success) {
          setHackathon(hackathonJson.data);
          if (hackathonJson.data.tracks?.length > 0) {
            setFormData((prev) => ({ ...prev, trackId: hackathonJson.data.tracks[0].id }));
          }
        }

        if (regRes.ok) {
          const regJson = await regRes.json();
          if (regJson.success && regJson.data) {
            setExistingReg(regJson.data);
          }
        }
      } catch {
        setErrorMsg("Failed to load registration information.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [hackathonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreeToRules) {
      setErrorMsg("Please agree to the Hackathon Code of Conduct and Rules.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/v1/hackathons/${hackathonId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: formData.trackId || null,
          customFields: {
            tshirtSize: formData.tshirtSize,
            dietary: formData.dietary,
            experience: formData.experience,
            motivation: formData.motivation,
            githubUrl: formData.githubUrl,
            linkedinUrl: formData.linkedinUrl,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setExistingReg(json.data);
        setSuccessMsg("Registration successful! You are now enrolled.");
      } else {
        setErrorMsg(json.error?.message || "Failed to submit registration.");
      }
    } catch {
      setErrorMsg("An unexpected network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authStatus === "loading") {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Verifying hackathon registration status...</p>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Hackathon Not Found</h2>
        <p className="text-xs text-slate-400 mt-2">The requested competition was not found.</p>
        <Link
          href="/hackathons"
          className="mt-6 inline-block px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-white"
        >
          Back to Hackathons
        </Link>
      </div>
    );
  }

  // Not logged in guard
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-2xl">
        <ShieldCheck className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Login Required</h2>
        <p className="text-sm text-slate-400 mt-2 mb-6">
          You must be logged in with your verified JECRC student account to register for {hackathon.title}.
        </p>
        <Link
          href={`/login?callbackUrl=/hackathons/${hackathon.slug || hackathon.id}/register`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
        >
          <span>Sign In with JECRC ID</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Campus eligibility check
  const isCampusRestricted =
    !hackathon.isInterCampus &&
    hackathon.campusId &&
    user.campusId &&
    user.campusId !== hackathon.campusId;

  // Registration window check
  const isRegOpen =
    hackathon.status === HackathonStatus.REGISTRATION_OPEN ||
    hackathon.status === HackathonStatus.IN_PROGRESS;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Back Link */}
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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
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
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Participant Registration
            </h1>
            <p className="text-sm text-slate-300 mt-1">{hackathon.title}</p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Allowed Team Size: {hackathon.minTeamSize}-{hackathon.maxTeamSize}</span>
            </div>
            {hackathon.registrationEnd && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Deadline: {new Date(hackathon.registrationEnd).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* State 1: Already Registered */}
      {existingReg ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">You are Registered!</h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    existingReg.status === RegistrationStatus.APPROVED
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : existingReg.status === RegistrationStatus.WAITLISTED
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  Status: {existingReg.status}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-2">
                Registered on{" "}
                {new Date(existingReg.registeredAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . You are eligible to assemble or join a project team.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={`/hackathons/${hackathon.slug || hackathon.id}/teams`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>Go to Team Hub & Matchmaking</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href={`/hackathons/${hackathon.slug || hackathon.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all cursor-pointer"
                >
                  <span>View Hackathon Overview</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : isCampusRestricted ? (
        /* State 2: Ineligible Campus */
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Campus Eligibility Restriction</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-lg mx-auto">
            This competition is exclusively open to students enrolled at{" "}
            <span className="font-semibold text-rose-300">
              {hackathon.campus?.name || "the designated campus"}
            </span>
            . Your profile is currently mapped to another JECRC institution campus.
          </p>
          <Link
            href="/hackathons"
            className="mt-6 inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Explore Other Competitions
          </Link>
        </div>
      ) : !isRegOpen ? (
        /* State 3: Registration Closed */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
          <Calendar className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Registrations Closed</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-lg mx-auto">
            The registration period for this hackathon is currently closed. Current status:{" "}
            <span className="font-semibold text-amber-300">{hackathon.status.replace("_", " ")}</span>.
          </p>
          <Link
            href={`/hackathons/${hackathon.slug || hackathon.id}`}
            className="mt-6 inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Back to Overview
          </Link>
        </div>
      ) : (
        /* State 4: Registration Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Profile Card Confirmation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Participant Identity</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Full Name</span>
                <span className="font-semibold text-white">{user.name}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">JECRC Email</span>
                <span className="font-semibold text-white">{user.email}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Campus Affiliation</span>
                <span className="font-semibold text-white">
                  {hackathon.campus?.name || "JECRC Institution"}
                </span>
              </div>
            </div>
          </div>

          {/* Track Selection */}
          {hackathon.tracks?.length > 0 && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Preferred Problem Track
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select the track you or your future team intend to solve.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hackathon.tracks.map((track) => (
                  <label
                    key={track.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      formData.trackId === track.id
                        ? "bg-indigo-600/10 border-indigo-500 text-white"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-slate-100">{track.name}</span>
                      <input
                        type="radio"
                        name="trackId"
                        value={track.id}
                        checked={formData.trackId === track.id}
                        onChange={(e) => setFormData({ ...formData, trackId: e.target.value })}
                        className="accent-indigo-500"
                      />
                    </div>
                    {track.description && (
                      <p className="text-xs text-slate-400 line-clamp-2">{track.description}</p>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Logistics & Preferences */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Shirt className="w-4 h-4 text-purple-400" />
              <span>Event Logistics & Sizing</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  T-Shirt Size (Swag Kit)
                </label>
                <select
                  value={formData.tshirtSize}
                  onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                  <option value="XXL">Double Extra Large (XXL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Dietary Preference
                </label>
                <select
                  value={formData.dietary}
                  onChange={(e) => setFormData({ ...formData, dietary: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Jain">Jain</option>
                  <option value="Vegan">Vegan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Experience Level
                </label>
                <select
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Beginner">First Hackathon</option>
                  <option value="Intermediate">1-2 Hackathons</option>
                  <option value="Advanced">3+ Hackathons</option>
                  <option value="Veteran">Pro / Winner Before</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                What do you hope to build or learn?
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe your project idea or learning goals..."
                value={formData.motivation}
                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Social Profiles */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span>Developer Profiles (Optional)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Code of Conduct & Rules Checkbox */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeRules"
              checked={formData.agreeToRules}
              onChange={(e) => setFormData({ ...formData, agreeToRules: e.target.checked })}
              className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="agreeRules" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
              I agree to adhere to the{" "}
              <span className="font-semibold text-white">JECRC Hackathon Code of Conduct</span>. I
              confirm that all submitted work will be built during the official competition window,
              and that academic integrity will be strictly maintained.
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href={`/hackathons/${hackathon.slug || hackathon.id}`}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? "Submitting Registration..." : "Complete Registration"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
