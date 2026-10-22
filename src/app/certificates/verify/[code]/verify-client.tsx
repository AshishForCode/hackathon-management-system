"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Award,
  Calendar,
  Building,
  GraduationCap,
  Printer,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  FileCheck,
} from "lucide-react";

interface VerificationData {
  isValid: boolean;
  verificationCode: string;
  certificateId: string;
  recipient: {
    name: string;
    email: string;
    campusName: string;
    enrollmentNo: string;
    branch: string | null;
    year: number | null;
  };
  award: {
    type: string;
    title: string;
    teamName: string | null;
    rank: number | null;
  };
  hackathon: {
    title: string;
    slug: string;
    campusName: string;
    isInterCampus: boolean;
    eventDate: string | null;
  };
  issuedAt: string;
}

export function VerifyClient({ code }: { code: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verify() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/certificates/verify/${code}`);
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Invalid or revoked certificate.");
        }
      } catch {
        setError("Failed to reach institutional verification server.");
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [code]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-sm text-slate-400">Verifying credential on institution ledger...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 bg-slate-900 border border-rose-500/30 rounded-3xl text-center shadow-2xl">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white">Credential Verification Failed</h2>
        <p className="text-xs text-slate-400 mt-2 mb-6">
          {error || "No certificate matched the specified credential identifier."}
        </p>
        <Link
          href="/hackathons"
          className="inline-block px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 text-white"
        >
          Explore Competitions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Verification Status Banner */}
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-white">
                Official Credential Verified Authentic
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-300/80">
              Validated on the JECRC Centralized Hackathon Management Platform
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Luxury Certificate Card */}
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden text-center space-y-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Certificate Header / Institution Seals */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 mb-2">
            <span>JECRC UNIVERSITY</span>
            <span>•</span>
            <span>JECRC FOUNDATION</span>
          </div>

          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
            Certificate of Achievement
          </h2>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-2" />
        </div>

        {/* Presentation Text */}
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            This is proudly presented to
          </p>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {data.recipient.name}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
            <span>{data.recipient.campusName}</span>
            {data.recipient.enrollmentNo && data.recipient.enrollmentNo !== "N/A" && (
              <>
                <span>•</span>
                <span className="font-mono">Enr: {data.recipient.enrollmentNo}</span>
              </>
            )}
            {data.recipient.branch && (
              <>
                <span>•</span>
                <span>{data.recipient.branch}</span>
              </>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
            In recognition of outstanding performance as{" "}
            <span className="font-bold text-amber-300">{data.award.title}</span>
            {data.award.teamName ? ` with team "${data.award.teamName}"` : ""} in the
            inter-campus competition:
          </p>

          <h3 className="text-lg sm:text-xl font-bold text-white pt-1">
            {data.hackathon.title}
          </h3>
        </div>

        {/* Verification Credentials Footer */}
        <div className="relative z-10 pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="text-left space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Verification Code
            </span>
            <span className="font-mono font-bold text-indigo-300 text-sm">
              {data.verificationCode}
            </span>
          </div>

          <div className="text-center sm:text-right space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Issue</span>
            <span className="font-semibold text-slate-200">
              {new Date(data.issuedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
