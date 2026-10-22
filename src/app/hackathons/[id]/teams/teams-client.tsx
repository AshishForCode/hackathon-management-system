"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  Crown,
  UserPlus,
  Copy,
  Check,
  Lock,
  Unlock,
  LogOut,
  Trash2,
  Search,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Share2,
  Compass,
} from "lucide-react";
import { TeamMemberRole } from "@prisma/client";

interface UserProfile {
  skills?: string | null;
  branch?: string | null;
  year?: number | null;
}

interface TeamMemberUser {
  id: string;
  name: string;
  email: string;
  campus?: { name: string; code: string } | null;
  profile?: UserProfile | null;
}

interface TeamMember {
  id: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: TeamMemberUser;
}

interface TeamInvite {
  id: string;
  inviteeEmail: string;
  status: string;
  createdAt: string;
}

interface TeamDetail {
  id: string;
  name: string;
  inviteCode: string;
  lookingForMembers: boolean;
  requiredSkills: string | null;
  locked: boolean;
  leaderId: string;
  hackathonId: string;
  members: TeamMember[];
  invites: TeamInvite[];
  hackathon: {
    id: string;
    title: string;
    slug: string;
    minTeamSize: number;
    maxTeamSize: number;
    status: string;
  };
}

interface MatchmakingTeam {
  id: string;
  name: string;
  inviteCode: string;
  lookingForMembers: boolean;
  requiredSkills: string | null;
  leader: {
    id: string;
    name: string;
    email: string;
    campus?: { name: string; code: string } | null;
  };
  members: {
    user: {
      id: string;
      name: string;
      campus?: { code: string } | null;
    };
  }[];
  vacancies: number;
  maxTeamSize: number;
}

export function TeamsClient({ hackathonId }: { hackathonId: string }) {
  const { data: session } = useSession();
  const currentUser = session?.user;

  const [activeTab, setActiveTab] = useState<"my-team" | "matchmaking">("my-team");
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [myTeam, setMyTeam] = useState<TeamDetail | null>(null);
  const [matchmakingTeams, setMatchmakingTeams] = useState<MatchmakingTeam[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [searching, setSearching] = useState(false);

  // Forms State
  const [createName, setCreateName] = useState("");
  const [createSkills, setCreateSkills] = useState("");
  const [createLooking, setCreateLooking] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Status feedback
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [regRes, teamRes, boardRes] = await Promise.all([
          fetch(`/api/v1/hackathons/${hackathonId}/register`),
          fetch(`/api/v1/hackathons/${hackathonId}/teams`),
          fetch(`/api/v1/hackathons/${hackathonId}/matchmaking`),
        ]);

        if (regRes.ok) {
          const regJson = await regRes.json();
          if (!ignore) {
            setIsRegistered(Boolean(regJson.success && regJson.data));
          }
        }

        if (teamRes.ok) {
          const teamJson = await teamRes.json();
          if (!ignore && teamJson.success) {
            setMyTeam(teamJson.data);
          }
        }

        if (boardRes.ok) {
          const boardJson = await boardRes.json();
          if (!ignore && boardJson.success) {
            setMatchmakingTeams(boardJson.data || []);
          }
        }
      } catch {
        if (!ignore) {
          setMessage({ type: "error", text: "Failed to load team data." });
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

  const handleSearchMatchmaking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const url = skillSearch.trim()
        ? `/api/v1/hackathons/${hackathonId}/matchmaking?skill=${encodeURIComponent(skillSearch.trim())}`
        : `/api/v1/hackathons/${hackathonId}/matchmaking`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMatchmakingTeams(json.data || []);
      }
    } catch {
      setMessage({ type: "error", text: "Search failed." });
    } finally {
      setSearching(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/hackathons/${hackathonId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName.trim(),
          requiredSkills: createSkills.trim() || undefined,
          lookingForMembers: createLooking,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Team "${createName}" formed successfully!` });
        setCreateName("");
        setCreateSkills("");
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to create team." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "You have joined the team successfully!" });
        setJoinCode("");
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to join team." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeam || !inviteEmail.trim()) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/teams/${myTeam.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Invitation dispatched to ${inviteEmail}!` });
        setInviteEmail("");
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to send invitation." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLock = async () => {
    if (!myTeam) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/teams/${myTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: !myTeam.locked }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: myTeam.locked ? "Roster unlocked." : "Roster locked for submissions!",
        });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to toggle lock." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleLooking = async () => {
    if (!myTeam) return;
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/teams/${myTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lookingForMembers: !myTeam.lookingForMembers }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: !myTeam.lookingForMembers
            ? "Team is now visible on the Matchmaking Board!"
            : "Team hidden from Matchmaking Board.",
        });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to update status." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string, isSelf: boolean) => {
    if (!myTeam) return;
    const confirmText = isSelf
      ? "Are you sure you want to leave this team?"
      : "Are you sure you want to remove this member from the team?";
    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/teams/${myTeam.id}/members/${userId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (json.success) {
        setMessage({
          type: "success",
          text: isSelf ? "You have left the team." : "Member removed.",
        });
        setRefreshKey((k) => k + 1);
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to remove member." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Loading team configuration...</p>
      </div>
    );
  }

  const isLeader = myTeam && currentUser && myTeam.leaderId === currentUser.id;

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
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Collaboration Center</span>
          </div>
          <h1 className="text-3xl font-black text-white">Team Hub & Matchmaking</h1>
          <p className="text-sm text-slate-300 mt-1">
            Form your crew, share your private join code, or scout talent across JECRC campuses.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("my-team")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "my-team"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>My Team {myTeam ? `(${myTeam.members.length})` : ""}</span>
          </button>

          <button
            onClick={() => setActiveTab("matchmaking")}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "matchmaking"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Matchmaking Board ({matchmakingTeams.length})</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
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

      {/* Guard: Not registered for hackathon */}
      {!isRegistered && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-amber-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
            <span>You need an approved hackathon registration before creating or joining a team.</span>
          </div>
          <Link
            href={`/hackathons/${hackathonId}/register`}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-colors whitespace-nowrap"
          >
            Register Now
          </Link>
        </div>
      )}

      {/* TAB 1: MY TEAM */}
      {activeTab === "my-team" && (
        <>
          {myTeam ? (
            /* User ALREADY has a team */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Team Overview & Roster */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-black text-white">{myTeam.name}</h2>
                        {myTeam.locked && (
                          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Roster capacity: {myTeam.members.length} / {myTeam.hackathon.maxTeamSize} members
                      </p>
                    </div>

                    {/* Leader Lock / Unlock Button */}
                    {isLeader && (
                      <button
                        onClick={handleToggleLock}
                        disabled={actionLoading}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                          myTeam.locked
                            ? "bg-slate-800 text-slate-300 hover:text-white"
                            : "bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
                        }`}
                      >
                        {myTeam.locked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlock Roster</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Lock Team Roster</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Members Roster List */}
                  <div className="mt-6 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Team Roster
                    </h3>

                    {myTeam.members.map((m) => {
                      const isMemberLeader = m.role === TeamMemberRole.LEADER;
                      const isCurrentMemberSelf = currentUser?.id === m.userId;

                      return (
                        <div
                          key={m.id}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-200">
                              {m.user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-white">{m.user.name}</span>
                                {isMemberLeader && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    <Crown className="w-3 h-3" /> Leader
                                  </span>
                                )}
                                {isCurrentMemberSelf && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span>{m.user.email}</span>
                                {m.user.campus && (
                                  <>
                                    <span>•</span>
                                    <span>{m.user.campus.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action: Kick or Leave */}
                          {(isLeader || isCurrentMemberSelf) && !myTeam.locked && (
                            <button
                              onClick={() => handleRemoveMember(m.userId, isCurrentMemberSelf)}
                              disabled={actionLoading}
                              title={isCurrentMemberSelf ? "Leave Team" : "Remove Member"}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              {isCurrentMemberSelf ? (
                                <LogOut className="w-4 h-4" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pending Invites */}
                  {myTeam.invites?.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Pending Invitations ({myTeam.invites.length})
                      </h3>
                      <div className="space-y-2">
                        {myTeam.invites.map((inv) => (
                          <div
                            key={inv.id}
                            className="bg-slate-950/40 border border-slate-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-slate-300"
                          >
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{inv.inviteeEmail}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">
                              Awaiting response
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Code Share & Team Management */}
              <div className="space-y-6">
                {/* Invite Code Box */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                    <Share2 className="w-4 h-4" />
                    <span>Join Code</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Invite Teammates</h3>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Share this unique code with students so they can join your team directly:
                  </p>

                  <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <span className="font-mono text-xl font-black tracking-widest text-indigo-300">
                      {myTeam.inviteCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(myTeam.inviteCode)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Email Invite Box */}
                {isLeader && !myTeam.locked && myTeam.members.length < myTeam.hackathon.maxTeamSize && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      <span>Send Direct Invitation</span>
                    </h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Invite a registered JECRC student by their university email:
                    </p>

                    <form onSubmit={handleSendInvite} className="space-y-3">
                      <input
                        type="email"
                        placeholder="student.21bcon000@jecrcu.edu.in"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={actionLoading || !inviteEmail.trim()}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {actionLoading ? "Sending..." : "Send Invitation"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Matchmaking Visibility Toggle */}
                {isLeader && (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-white">Matchmaking Board</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Publish team on the public recruiter board
                        </p>
                      </div>

                      <button
                        onClick={handleToggleLooking}
                        disabled={actionLoading}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          myTeam.lookingForMembers ? "bg-indigo-600" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                            myTeam.lookingForMembers ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {myTeam.requiredSkills && (
                      <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                        <span className="font-semibold text-slate-300">Target Skills: </span>
                        <span>{myTeam.requiredSkills}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* User DOES NOT have a team yet -> Create or Join */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Option A: Create Team */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-3 w-fit rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
                    <Crown className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Create a New Team</h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Become the team captain, set your desired tech stack, and recruit teammates via
                    invite codes or the Matchmaking Board.
                  </p>

                  <form onSubmit={handleCreateTeam} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Team Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ByteCraft Innovations"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        required
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Desired Skills (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. React, Next.js, Python, UI/UX"
                        value={createSkills}
                        onChange={(e) => setCreateSkills(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="lookingCheck"
                        checked={createLooking}
                        onChange={(e) => setCreateLooking(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="lookingCheck" className="text-xs text-slate-300 cursor-pointer">
                        List team on &quot;Looking for Teammates&quot; matchmaking board
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading || !createName.trim()}
                      className="w-full mt-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                    >
                      {actionLoading ? "Creating Team..." : "Create Team"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Option B: Join via Invite Code */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-3 w-fit rounded-2xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Join Existing Team</h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Have a code from your team leader? Enter your team&apos;s unique invite code below
                    to join their roster immediately.
                  </p>

                  <form onSubmit={handleJoinTeam} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Team Invite Code *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. JECRC-A7K92"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        required
                        className="w-full font-mono uppercase bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-white tracking-widest placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading || !joinCode.trim()}
                      className="w-full mt-4 py-3 rounded-xl text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {actionLoading ? "Joining..." : "Join with Invite Code"}
                    </button>
                  </form>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                  <p className="text-xs text-slate-400">
                    Don&apos;t have a team yet? Check out the{" "}
                    <button
                      onClick={() => setActiveTab("matchmaking")}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      Matchmaking Board
                    </button>{" "}
                    to connect with peers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: MATCHMAKING BOARD */}
      {activeTab === "matchmaking" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <form
            onSubmit={handleSearchMatchmaking}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 shadow-lg"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter teams by required skills (e.g. Python, React, UI/UX, Flutter)..."
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer shadow-md"
            >
              {searching ? "Filtering..." : "Search Teams"}
            </button>
          </form>

          {/* Cards Grid */}
          {matchmakingTeams.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xl">
              <Sparkles className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">No Open Teams Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No teams are currently open for recruits matching your query. Be the first to start a
                team and list it here!
              </p>
              <button
                onClick={() => setActiveTab("my-team")}
                className="mt-6 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
              >
                Create a Team
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchmakingTeams.map((team) => (
                <div
                  key={team.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {team.vacancies} {team.vacancies === 1 ? "Spot" : "Spots"} Left
                      </span>
                      <span className="text-xs text-slate-400">
                        {team.members.length} / {team.maxTeamSize} members
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{team.name}</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Lead by <span className="text-slate-200">{team.leader.name}</span>{" "}
                      {team.leader.campus ? `(${team.leader.campus.name})` : ""}
                    </p>

                    {/* Required Skills */}
                    {team.requiredSkills && (
                      <div className="mb-4">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Looking For:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {team.requiredSkills.split(",").map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                            >
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Code or Contact */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">
                      Code:{" "}
                      <span className="font-mono font-bold text-white">{team.inviteCode}</span>
                    </div>
                    <button
                      onClick={() => {
                        copyToClipboard(team.inviteCode);
                        setActiveTab("my-team");
                        setJoinCode(team.inviteCode);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                    >
                      Use Code to Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
