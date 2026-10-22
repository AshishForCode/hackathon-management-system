import Link from "next/link";
import {
  Users,
  Award,
  ArrowRight,
  Sparkles,
  GitPullRequest,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-36 overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Multi-Campus Platform</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            <span>JECRC University & Foundation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Build, Compete, and Innovate Across Campuses.
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            The unified hackathon lifecycle platform for JECRC: streamlined registrations, skill-based team matchmaking, repository tracking, and rubric-driven jury evaluations.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/hackathons"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 cursor-pointer"
            >
              Explore Hackathons
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              Join as Participant
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-20 border-t border-slate-900 bg-slate-950/60 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              End-to-End Hackathon Lifecycle
            </h2>
            <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">
              Engineered for Students, Mentors & Campus Admins
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg hover:border-indigo-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Multi-Campus Matchmaking</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Connect with teammates across both JECRC University and Foundation. Filter by skills, branch, and academic year.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg hover:border-indigo-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-6">
                <GitPullRequest className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Repository & Commit Sync</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Integrated GitHub and GitLab tracking verifies commit timeliness, language breakdowns, and contribution distribution.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 shadow-lg hover:border-indigo-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white">Jury Rubric Scoring</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Configurable weighted criteria (screening through final rounds) with conflict-of-interest detection and auto-leaderboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 JECRC Hackathon Management Platform. Built for JECRC University & JECRC Foundation.</p>
        </div>
      </footer>
    </div>
  );
}
