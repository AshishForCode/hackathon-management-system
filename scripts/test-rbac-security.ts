import { NextRequest } from "next/server";
import { UserRole, UserStatus } from "@prisma/client";
import { SessionUser } from "@/types";
import { __setTestUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";

// Route handler imports
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getCampuses } from "@/app/api/v1/campuses/route";
import { GET as getArchive } from "@/app/api/v1/archive/route";
import { GET as getAuditLogs } from "@/app/api/v1/audit-logs/route";
import { GET as getAuthMe } from "@/app/api/v1/auth/me/route";
import { PUT as putAuthProfile } from "@/app/api/v1/auth/profile/route";
import { GET as getCertificatesMe } from "@/app/api/v1/certificates/me/route";
import { GET as getCertificatesVerify } from "@/app/api/v1/certificates/verify/[code]/route";
import { GET as getHackathons, POST as postHackathons } from "@/app/api/v1/hackathons/route";
import { GET as getHackathonById, PUT as putHackathonById } from "@/app/api/v1/hackathons/[id]/route";
import { PATCH as patchHackathonStatus } from "@/app/api/v1/hackathons/[id]/status/route";
import { POST as postTracks } from "@/app/api/v1/hackathons/[id]/tracks/route";
import { POST as postSponsors } from "@/app/api/v1/hackathons/[id]/sponsors/route";
import { POST as postFaqs } from "@/app/api/v1/hackathons/[id]/faqs/route";
import { GET as getRegistrationStatus, POST as postRegister } from "@/app/api/v1/hackathons/[id]/register/route";
import { GET as getRegistrations } from "@/app/api/v1/hackathons/[id]/registrations/route";
import { GET as getRegistrationsExport } from "@/app/api/v1/hackathons/[id]/registrations/export/route";
import { PATCH as patchRegistrationReview } from "@/app/api/v1/registrations/[id]/route";
import { GET as getTeams, POST as postTeams } from "@/app/api/v1/hackathons/[id]/teams/route";
import { GET as getTeamById, PATCH as patchTeamById } from "@/app/api/v1/teams/[id]/route";
import { POST as postTeamJoin } from "@/app/api/v1/teams/join/route";
import { POST as postTeamInvites } from "@/app/api/v1/teams/[id]/invites/route";
import { POST as postInviteRespond } from "@/app/api/v1/invites/[id]/respond/route";
import { DELETE as deleteTeamMember } from "@/app/api/v1/teams/[id]/members/[userId]/route";
import { GET as getMatchmaking } from "@/app/api/v1/hackathons/[id]/matchmaking/route";
import { GET as getTeamFeedback, POST as postTeamFeedback } from "@/app/api/v1/teams/[id]/feedback/route";
import { GET as getSubmissions, POST as postSubmissions } from "@/app/api/v1/hackathons/[id]/submissions/route";
import { GET as getSubmissionById, PATCH as patchSubmissionById } from "@/app/api/v1/submissions/[id]/route";
import { POST as postSubmissionFinalize } from "@/app/api/v1/submissions/[id]/finalize/route";
import { POST as postSubmissionSync } from "@/app/api/v1/submissions/[id]/sync/route";
import { GET as getRubrics, POST as postRubrics } from "@/app/api/v1/hackathons/[id]/rubrics/route";
import { GET as getEvaluations } from "@/app/api/v1/hackathons/[id]/evaluations/route";
import { POST as postEvaluationScores } from "@/app/api/v1/submissions/[id]/evaluations/route";
import { GET as getLeaderboard } from "@/app/api/v1/hackathons/[id]/leaderboard/route";
import { GET as getResults, POST as postResults } from "@/app/api/v1/hackathons/[id]/results/route";
import { POST as postGenerateCertificates } from "@/app/api/v1/hackathons/[id]/certificates/generate/route";
import { POST as postUploads } from "@/app/api/v1/uploads/route";

// --- Mock Users ---
const CAMPUS_A = "campus-jecrc-university";
const CAMPUS_B = "campus-jecrc-college";

function makeUser(role: UserRole, campusId: string = CAMPUS_A, status: UserStatus = UserStatus.ACTIVE): SessionUser {
  return {
    id: `usr-${role.toLowerCase()}-${campusId}`,
    email: `${role.toLowerCase()}@jecrc.ac.in`,
    name: `Test ${role}`,
    role,
    status,
    campusId,
  };
}

const USERS: Record<string, SessionUser | null> = {
  UNAUTHENTICATED: null,
  GUEST: makeUser(UserRole.GUEST),
  PARTICIPANT: makeUser(UserRole.PARTICIPANT),
  MENTOR: makeUser(UserRole.MENTOR),
  JURY: makeUser(UserRole.JURY),
  ORGANIZER: makeUser(UserRole.ORGANIZER),
  CAMPUS_ADMIN_A: makeUser(UserRole.CAMPUS_ADMIN, CAMPUS_A),
  CAMPUS_ADMIN_B: makeUser(UserRole.CAMPUS_ADMIN, CAMPUS_B),
  SUPER_ADMIN: makeUser(UserRole.SUPER_ADMIN),
  SUSPENDED: makeUser(UserRole.PARTICIPANT, CAMPUS_A, UserStatus.SUSPENDED),
};

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedCount++;
  }
}

async function testUnauthenticatedGuards() {
  console.log("\n▶ Suite 1: Unauthenticated (401 Unauthorized) Enforcements");
  __setTestUser(null);

  // All protected endpoints must return 401 when called without a session
  const endpoints = [
    { name: "GET /api/v1/auth/me", fn: () => getAuthMe() },
    { name: "PUT /api/v1/auth/profile", fn: () => putAuthProfile(new NextRequest("http://localhost/api/v1/auth/profile", { method: "PUT", body: "{}" })) },
    { name: "GET /api/v1/audit-logs", fn: () => getAuditLogs(new NextRequest("http://localhost/api/v1/audit-logs")) },
    { name: "GET /api/v1/certificates/me", fn: () => getCertificatesMe() },
    { name: "POST /api/v1/hackathons", fn: () => postHackathons(new NextRequest("http://localhost/api/v1/hackathons", { method: "POST", body: "{}" })) },
    { name: "PUT /api/v1/hackathons/[id]", fn: () => putHackathonById(new NextRequest("http://localhost/api/v1/hackathons/h1", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "PATCH /api/v1/hackathons/[id]/status", fn: () => patchHackathonStatus(new NextRequest("http://localhost/api/v1/hackathons/h1/status", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/tracks", fn: () => postTracks(new NextRequest("http://localhost/api/v1/hackathons/h1/tracks", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/sponsors", fn: () => postSponsors(new NextRequest("http://localhost/api/v1/hackathons/h1/sponsors", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/faqs", fn: () => postFaqs(new NextRequest("http://localhost/api/v1/hackathons/h1/faqs", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/register", fn: () => getRegistrationStatus(new NextRequest("http://localhost/api/v1/hackathons/h1/register"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/register", fn: () => postRegister(new NextRequest("http://localhost/api/v1/hackathons/h1/register", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/registrations", fn: () => getRegistrations(new NextRequest("http://localhost/api/v1/hackathons/h1/registrations"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/registrations/export", fn: () => getRegistrationsExport(new NextRequest("http://localhost/api/v1/hackathons/h1/registrations/export"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "PATCH /api/v1/registrations/[id]", fn: () => patchRegistrationReview(new NextRequest("http://localhost/api/v1/registrations/r1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "r1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/teams", fn: () => getTeams(new NextRequest("http://localhost/api/v1/hackathons/h1/teams"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/teams", fn: () => postTeams(new NextRequest("http://localhost/api/v1/hackathons/h1/teams", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "PATCH /api/v1/teams/[id]", fn: () => patchTeamById(new NextRequest("http://localhost/api/v1/teams/t1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "t1" }) }) },
    { name: "POST /api/v1/teams/join", fn: () => postTeamJoin(new NextRequest("http://localhost/api/v1/teams/join", { method: "POST", body: "{}" })) },
    { name: "POST /api/v1/teams/[id]/invites", fn: () => postTeamInvites(new NextRequest("http://localhost/api/v1/teams/t1/invites", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "t1" }) }) },
    { name: "POST /api/v1/invites/[id]/respond", fn: () => postInviteRespond(new NextRequest("http://localhost/api/v1/invites/inv1/respond", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "inv1" }) }) },
    { name: "DELETE /api/v1/teams/[id]/members/[userId]", fn: () => deleteTeamMember(new NextRequest("http://localhost/api/v1/teams/t1/members/u1", { method: "DELETE" }), { params: Promise.resolve({ id: "t1", userId: "u1" }) }) },
    { name: "GET /api/v1/teams/[id]/feedback", fn: () => getTeamFeedback(new NextRequest("http://localhost/api/v1/teams/t1/feedback"), { params: Promise.resolve({ id: "t1" }) }) },
    { name: "POST /api/v1/teams/[id]/feedback", fn: () => postTeamFeedback(new NextRequest("http://localhost/api/v1/teams/t1/feedback", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "t1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/submissions", fn: () => postSubmissions(new NextRequest("http://localhost/api/v1/hackathons/h1/submissions", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "PATCH /api/v1/submissions/[id]", fn: () => patchSubmissionById(new NextRequest("http://localhost/api/v1/submissions/s1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "s1" }) }) },
    { name: "POST /api/v1/submissions/[id]/finalize", fn: () => postSubmissionFinalize(new NextRequest("http://localhost/api/v1/submissions/s1/finalize", { method: "POST" }), { params: Promise.resolve({ id: "s1" }) }) },
    { name: "POST /api/v1/submissions/[id]/sync", fn: () => postSubmissionSync(new NextRequest("http://localhost/api/v1/submissions/s1/sync", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "s1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/rubrics", fn: () => postRubrics(new NextRequest("http://localhost/api/v1/hackathons/h1/rubrics", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/evaluations", fn: () => getEvaluations(new NextRequest("http://localhost/api/v1/hackathons/h1/evaluations"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/submissions/[id]/evaluations", fn: () => postEvaluationScores(new NextRequest("http://localhost/api/v1/submissions/s1/evaluations", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "s1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/results", fn: () => postResults(new NextRequest("http://localhost/api/v1/hackathons/h1/results", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/certificates/generate", fn: () => postGenerateCertificates(new NextRequest("http://localhost/api/v1/hackathons/h1/certificates/generate", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/uploads", fn: () => postUploads(new NextRequest("http://localhost/api/v1/uploads", { method: "POST" })) },
  ];

  for (const ep of endpoints) {
    const res = await ep.fn();
    assert(res.status === 401, `${ep.name} correctly returns 401 when unauthenticated`);
  }
}

async function testSuspendedUserGuards() {
  console.log("\n▶ Suite 2: Suspended User Account (403 Forbidden) Enforcements");
  __setTestUser(USERS.SUSPENDED);

  const resAuthMe = await getAuthMe();
  assert(resAuthMe.status === 403, "GET /api/v1/auth/me returns 403 Forbidden for suspended user");

  const resAudit = await getAuditLogs(new NextRequest("http://localhost/api/v1/audit-logs"));
  assert(resAudit.status === 403, "GET /api/v1/audit-logs returns 403 Forbidden for suspended user");
}

async function testRolePermissionMatrix() {
  console.log("\n▶ Suite 3: Granular Role-Based Access Control (RBAC) Permitted / Forbidden Mappings");

  // 1. Participant attempting Admin endpoints -> 403
  __setTestUser(USERS.PARTICIPANT);

  const participantForbidden = [
    { name: "GET /api/v1/audit-logs", fn: () => getAuditLogs(new NextRequest("http://localhost/api/v1/audit-logs")) },
    { name: "POST /api/v1/hackathons", fn: () => postHackathons(new NextRequest("http://localhost/api/v1/hackathons", { method: "POST", body: "{}" })) },
    { name: "PUT /api/v1/hackathons/[id]", fn: () => putHackathonById(new NextRequest("http://localhost/api/v1/hackathons/h1", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "PATCH /api/v1/hackathons/[id]/status", fn: () => patchHackathonStatus(new NextRequest("http://localhost/api/v1/hackathons/h1/status", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/registrations", fn: () => getRegistrations(new NextRequest("http://localhost/api/v1/hackathons/h1/registrations"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/registrations/export", fn: () => getRegistrationsExport(new NextRequest("http://localhost/api/v1/hackathons/h1/registrations/export"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "PATCH /api/v1/registrations/[id]", fn: () => patchRegistrationReview(new NextRequest("http://localhost/api/v1/registrations/r1", { method: "PATCH", body: "{}" }), { params: Promise.resolve({ id: "r1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/evaluations (remediated UI-only check)", fn: () => getEvaluations(new NextRequest("http://localhost/api/v1/hackathons/h1/evaluations"), { params: Promise.resolve({ id: "h1" }) }) },
  ];

  for (const ep of participantForbidden) {
    const res = await ep.fn();
    assert(res.status === 403, `${ep.name} correctly returns 403 Forbidden for PARTICIPANT`);
  }

  // 2. Guest attempting creation endpoints -> 403
  __setTestUser(USERS.GUEST);

  const guestForbidden = [
    { name: "POST /api/v1/hackathons/[id]/register (fixed!)", fn: () => postRegister(new NextRequest("http://localhost/api/v1/hackathons/h1/register", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/teams (fixed!)", fn: () => postTeams(new NextRequest("http://localhost/api/v1/hackathons/h1/teams", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "POST /api/v1/hackathons/[id]/submissions (fixed!)", fn: () => postSubmissions(new NextRequest("http://localhost/api/v1/hackathons/h1/submissions", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/evaluations", fn: () => getEvaluations(new NextRequest("http://localhost/api/v1/hackathons/h1/evaluations"), { params: Promise.resolve({ id: "h1" }) }) },
  ];

  for (const ep of guestForbidden) {
    const res = await ep.fn();
    assert(res.status === 403, `${ep.name} correctly returns 403 Forbidden for GUEST`);
  }

  // 3. Jury attempting Admin actions -> 403
  __setTestUser(USERS.JURY);
  const resJuryAudit = await getAuditLogs(new NextRequest("http://localhost/api/v1/audit-logs"));
  assert(resJuryAudit.status === 403, "GET /api/v1/audit-logs returns 403 Forbidden for JURY");

  const resJuryCreate = await postHackathons(new NextRequest("http://localhost/api/v1/hackathons", { method: "POST", body: "{}" }));
  assert(resJuryCreate.status === 403, "POST /api/v1/hackathons returns 403 Forbidden for JURY");

  // 4. Role capabilities verification
  assert(!hasPermission(UserRole.MENTOR, "evaluation:score"), "RBAC: MENTOR is not granted evaluation:score permission");
  assert(hasPermission(UserRole.JURY, "evaluation:score"), "RBAC: JURY is granted evaluation:score permission");
  assert(hasPermission(UserRole.SUPER_ADMIN, "evaluation:score"), "RBAC: SUPER_ADMIN is granted evaluation:score permission");
  assert(!hasPermission(UserRole.ORGANIZER, "audit:read"), "RBAC: ORGANIZER cannot read audit logs");
  assert(hasPermission(UserRole.CAMPUS_ADMIN, "audit:read"), "RBAC: CAMPUS_ADMIN can read audit logs");
  assert(hasPermission(UserRole.SUPER_ADMIN, "audit:read"), "RBAC: SUPER_ADMIN can read audit logs");
  assert(!hasPermission(UserRole.PARTICIPANT, "result:publish"), "RBAC: PARTICIPANT cannot publish results");
  assert(!hasPermission(UserRole.PARTICIPANT, "certificate:generate"), "RBAC: PARTICIPANT cannot generate certificates");
  assert(!hasPermission(UserRole.PARTICIPANT, "hackathon:manage_status"), "RBAC: PARTICIPANT cannot alter hackathon status");
}

async function testCampusAdminScoping() {
  console.log("\n▶ Suite 4: Multi-Campus Scoping & Cross-Campus Boundary Checks");

  // Campus Admin for Campus A trying to operate on Campus B hackathon
  __setTestUser(USERS.CAMPUS_ADMIN_A);

  const now = Date.now();
  const payloadForCampusB = JSON.stringify({
    title: "Malicious Cross-Campus Hackathon",
    slug: "cross-campus-hacks",
    description: "Unauthorized attempt across campus boundaries",
    campusId: CAMPUS_B, // Mismatched campus
    mode: "OFFLINE",
    minTeamSize: 1,
    maxTeamSize: 4,
    registrationStart: new Date(now).toISOString(),
    registrationEnd: new Date(now + 86400000).toISOString(),
    startDate: new Date(now + 172800000).toISOString(),
    endDate: new Date(now + 259200000).toISOString(),
    submissionDeadline: new Date(now + 250000000).toISOString(),
  });

  const resCrossCampusCreate = await postHackathons(new NextRequest("http://localhost/api/v1/hackathons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payloadForCampusB,
  }));

  assert(
    resCrossCampusCreate.status === 403,
    "POST /api/v1/hackathons blocks CAMPUS_ADMIN from creating hackathon for a different campus (403)"
  );

  // Super Admin can create for any campus
  __setTestUser(USERS.SUPER_ADMIN);
  assert(hasPermission(UserRole.SUPER_ADMIN, "hackathon:create"), "SUPER_ADMIN has universal hackathon:create permission");
}

async function testPublicEndpoints() {
  console.log("\n▶ Suite 5: Public Endpoints (Accessible to All Roles & Unauthenticated Visitors)");

  __setTestUser(null);
  const resHealth = await getHealth();
  assert(
    resHealth.status === 200 || resHealth.status === 503,
    "GET /api/health is publicly accessible without authentication (200 UP / 503 DEGRADED)"
  );

  const resCampuses = await getCampuses();
  assert(resCampuses.status === 200, "GET /api/v1/campuses is publicly accessible (200)");

  const resArchive = await getArchive(new NextRequest("http://localhost/api/v1/archive"));
  assert(resArchive.status === 200, "GET /api/v1/archive is publicly accessible (200)");

  const resVerify = await getCertificatesVerify(new NextRequest("http://localhost/api/v1/certificates/verify/SAMPLE-CODE"), {
    params: Promise.resolve({ code: "SAMPLE-CODE" }),
  });
  assert(resVerify.status !== 401 && resVerify.status !== 403, "GET /api/v1/certificates/verify/[code] does not require authentication");

  const publicEndpoints = [
    { name: "GET /api/v1/hackathons", fn: () => getHackathons(new NextRequest("http://localhost/api/v1/hackathons")) },
    { name: "GET /api/v1/hackathons/[id]", fn: () => getHackathonById(new NextRequest("http://localhost/api/v1/hackathons/h1"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/teams/[id]", fn: () => getTeamById(new NextRequest("http://localhost/api/v1/teams/t1"), { params: Promise.resolve({ id: "t1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/matchmaking", fn: () => getMatchmaking(new NextRequest("http://localhost/api/v1/hackathons/h1/matchmaking"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/submissions", fn: () => getSubmissions(new NextRequest("http://localhost/api/v1/hackathons/h1/submissions"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/submissions/[id]", fn: () => getSubmissionById(new NextRequest("http://localhost/api/v1/submissions/s1"), { params: Promise.resolve({ id: "s1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/rubrics", fn: () => getRubrics(new NextRequest("http://localhost/api/v1/hackathons/h1/rubrics"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/leaderboard", fn: () => getLeaderboard(new NextRequest("http://localhost/api/v1/hackathons/h1/leaderboard"), { params: Promise.resolve({ id: "h1" }) }) },
    { name: "GET /api/v1/hackathons/[id]/results", fn: () => getResults(new NextRequest("http://localhost/api/v1/hackathons/h1/results"), { params: Promise.resolve({ id: "h1" }) }) },
  ];

  for (const ep of publicEndpoints) {
    const res = await ep.fn();
    assert(res.status !== 401 && res.status !== 403, `${ep.name} does not require authentication`);
  }
}

async function runAllSecurityIntegrationTests() {
  console.log("=======================================================");
  console.log("  JECRC HACKATHON PLATFORM - RBAC & IDOR SECURITY SUITE");
  console.log("=======================================================");

  await testUnauthenticatedGuards();
  await testSuspendedUserGuards();
  await testRolePermissionMatrix();
  await testCampusAdminScoping();
  await testPublicEndpoints();

  console.log("\n=======================================================");
  console.log(`  SECURITY TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=======================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllSecurityIntegrationTests().catch((err) => {
  console.error("Security Test Suite Error:", err);
  process.exit(1);
});
