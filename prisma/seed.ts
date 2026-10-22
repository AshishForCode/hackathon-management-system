import { PrismaClient, UserRole, UserStatus, HackathonStatus, HackathonMode, EvaluationRound } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Seed script for the Hackathon Management Platform.
 * Creates: 2 campuses, admin users, sample mentor/jury, students,
 *          a sample hackathon with tracks, rubric, and FAQ.
 *
 * Run: pnpm prisma db seed
 */

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ---- Campuses ----
  const campusU = await prisma.campus.upsert({
    where: { code: "JECRC-U" },
    update: {},
    create: {
      name: "JECRC University",
      code: "JECRC-U",
      location: "Jaipur, Rajasthan",
      active: true,
    },
  });

  const campusF = await prisma.campus.upsert({
    where: { code: "JECRC-F" },
    update: {},
    create: {
      name: "JECRC Foundation",
      code: "JECRC-F",
      location: "Jaipur, Rajasthan",
      active: true,
    },
  });

  console.log("✅ Campuses created:", campusU.name, "&", campusF.name);

  // ---- Password hash (shared for demo accounts) ----
  const demoPassword = await hash("Password@123", 12);

  // ---- Super Admin ----
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@hackathon.jecrc.ac.in" },
    update: {},
    create: {
      email: "admin@hackathon.jecrc.ac.in",
      name: "Super Admin",
      passwordHash: demoPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Super Admin:", superAdmin.email);

  // ---- Campus Admins ----
  const campusAdminU = await prisma.user.upsert({
    where: { email: "admin.university@jecrc.ac.in" },
    update: {},
    create: {
      email: "admin.university@jecrc.ac.in",
      name: "University Admin",
      passwordHash: demoPassword,
      role: UserRole.CAMPUS_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      campusId: campusU.id,
    },
  });

  const campusAdminF = await prisma.user.upsert({
    where: { email: "admin.foundation@jecrc.ac.in" },
    update: {},
    create: {
      email: "admin.foundation@jecrc.ac.in",
      name: "Foundation Admin",
      passwordHash: demoPassword,
      role: UserRole.CAMPUS_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      campusId: campusF.id,
    },
  });
  console.log("✅ Campus Admins:", campusAdminU.email, "&", campusAdminF.email);

  // ---- Mentor ----
  const mentor = await prisma.user.upsert({
    where: { email: "mentor@jecrc.ac.in" },
    update: {},
    create: {
      email: "mentor@jecrc.ac.in",
      name: "Dr. Rajesh Sharma",
      passwordHash: demoPassword,
      role: UserRole.MENTOR,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      campusId: campusU.id,
    },
  });
  console.log("✅ Mentor:", mentor.email);

  // ---- Jury Members ----
  const jury1 = await prisma.user.upsert({
    where: { email: "jury1@jecrc.ac.in" },
    update: {},
    create: {
      email: "jury1@jecrc.ac.in",
      name: "Prof. Anita Verma",
      passwordHash: demoPassword,
      role: UserRole.JURY,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      campusId: campusU.id,
    },
  });

  const jury2 = await prisma.user.upsert({
    where: { email: "jury2@jecrc.ac.in" },
    update: {},
    create: {
      email: "jury2@jecrc.ac.in",
      name: "Mr. Vikram Singh",
      passwordHash: demoPassword,
      role: UserRole.JURY,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      campusId: campusF.id,
    },
  });
  console.log("✅ Jury:", jury1.email, "&", jury2.email);

  // ---- Students ----
  const students = [];
  const studentData = [
    { email: "student1@jecrcu.edu.in", name: "Aashi Gupta", campus: campusU.id, enrollment: "23BCON1755", branch: "Computer Science", year: 3, skills: "React,TypeScript,Node.js" },
    { email: "student2@jecrcu.edu.in", name: "Rahul Meena", campus: campusU.id, enrollment: "23BCON1801", branch: "Computer Science", year: 3, skills: "Python,Django,PostgreSQL" },
    { email: "student3@jecrcu.edu.in", name: "Priya Sharma", campus: campusU.id, enrollment: "23BCON1650", branch: "Information Technology", year: 3, skills: "Flutter,Dart,Firebase" },
    { email: "student4@jecrcf.edu.in", name: "Arjun Patel", campus: campusF.id, enrollment: "23BCSF2001", branch: "Computer Science", year: 3, skills: "Java,Spring Boot,React" },
    { email: "student5@jecrcf.edu.in", name: "Sneha Joshi", campus: campusF.id, enrollment: "23BCSF2045", branch: "Electronics", year: 2, skills: "IoT,Arduino,Python" },
  ];

  for (const s of studentData) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        name: s.name,
        passwordHash: demoPassword,
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        campusId: s.campus,
        profile: {
          create: {
            enrollmentNo: s.enrollment,
            branch: s.branch,
            year: s.year,
            skills: s.skills,
            github: s.name.toLowerCase().replace(/\s/g, ""),
            linkedin: `https://linkedin.com/in/${s.name.toLowerCase().replace(/\s/g, "-")}`,
          },
        },
      },
    });
    students.push(student);
  }
  console.log(`✅ ${students.length} Students created with profiles`);

  // ---- Sample Hackathon ----
  const hackathon = await prisma.hackathon.upsert({
    where: { slug: "innovate-jecrc-2026" },
    update: {},
    create: {
      title: "Innovate JECRC 2026",
      slug: "innovate-jecrc-2026",
      description:
        "The flagship inter-campus hackathon bringing together the brightest minds from JECRC University and JECRC Foundation. Build innovative solutions for real-world problems across multiple tracks.",
      status: HackathonStatus.REGISTRATION_OPEN,
      mode: HackathonMode.HYBRID,
      isInterCampus: true,
      campusId: campusU.id,
      registrationStart: new Date("2026-11-01T00:00:00Z"),
      registrationEnd: new Date("2026-11-15T23:59:59Z"),
      startDate: new Date("2026-11-20T09:00:00Z"),
      endDate: new Date("2026-11-21T18:00:00Z"),
      submissionDeadline: new Date("2026-11-21T16:00:00Z"),
      minTeamSize: 2,
      maxTeamSize: 4,
      venue: "JECRC University, Main Auditorium & Labs",
      rules:
        "1. All code must be written during the hackathon.\n2. Pre-existing libraries and frameworks are allowed.\n3. Each team must present a working demo.\n4. Plagiarism will result in disqualification.\n5. All submissions must include a GitHub repository link.",
      eligibility: "Open to all currently enrolled students of JECRC University and JECRC Foundation.",
      prizes:
        "🥇 1st Place: ₹50,000 + Internship Opportunities\n🥈 2nd Place: ₹30,000\n🥉 3rd Place: ₹15,000\n⭐ Best Innovation: ₹10,000\n⭐ Best UI/UX: ₹10,000",
      createdById: superAdmin.id,
    },
  });
  console.log("✅ Hackathon created:", hackathon.title);

  // ---- Tracks ----
  const tracks = await Promise.all([
    prisma.track.upsert({
      where: { hackathonId_name: { hackathonId: hackathon.id, name: "HealthTech" } },
      update: {},
      create: {
        hackathonId: hackathon.id,
        name: "HealthTech",
        description: "Build solutions for healthcare challenges — telemedicine, patient monitoring, health data analytics, or mental health support.",
        maxTeams: 20,
      },
    }),
    prisma.track.upsert({
      where: { hackathonId_name: { hackathonId: hackathon.id, name: "EdTech" } },
      update: {},
      create: {
        hackathonId: hackathon.id,
        name: "EdTech",
        description: "Innovate in education — adaptive learning, accessibility tools, gamified platforms, or AI tutors.",
        maxTeams: 20,
      },
    }),
    prisma.track.upsert({
      where: { hackathonId_name: { hackathonId: hackathon.id, name: "FinTech" } },
      update: {},
      create: {
        hackathonId: hackathon.id,
        name: "FinTech",
        description: "Solve financial challenges — digital payments, budgeting tools, blockchain applications, or financial literacy.",
        maxTeams: 15,
      },
    }),
    prisma.track.upsert({
      where: { hackathonId_name: { hackathonId: hackathon.id, name: "Open Innovation" } },
      update: {},
      create: {
        hackathonId: hackathon.id,
        name: "Open Innovation",
        description: "Any innovative idea that doesn't fit other tracks. Surprise us!",
      },
    }),
  ]);
  console.log(`✅ ${tracks.length} Tracks created`);

  // ---- Rubric & Criteria ----
  const rubric = await prisma.rubric.upsert({
    where: { hackathonId_round: { hackathonId: hackathon.id, round: EvaluationRound.FINAL } },
    update: {},
    create: {
      hackathonId: hackathon.id,
      name: "Final Judging Rubric",
      round: EvaluationRound.FINAL,
      isActive: true,
      criteria: {
        create: [
          { name: "Innovation & Creativity", description: "How novel and creative is the solution?", weight: 1.5, maxScore: 10, sortOrder: 1 },
          { name: "Technical Complexity", description: "Quality of code, architecture, and technical implementation.", weight: 1.5, maxScore: 10, sortOrder: 2 },
          { name: "UI/UX Design", description: "User interface design, user experience, and accessibility.", weight: 1.0, maxScore: 10, sortOrder: 3 },
          { name: "Impact & Feasibility", description: "Real-world impact and feasibility of the solution.", weight: 1.0, maxScore: 10, sortOrder: 4 },
          { name: "Presentation & Demo", description: "Quality of the presentation and live demo.", weight: 1.0, maxScore: 10, sortOrder: 5 },
        ],
      },
    },
  });
  console.log("✅ Rubric created:", rubric.name, "with 5 criteria");

  // ---- Sponsors ----
  await Promise.all([
    prisma.hackathonSponsor.create({
      data: { hackathonId: hackathon.id, name: "TechCorp India", tier: "TITLE", website: "https://techcorp.example.com" },
    }),
    prisma.hackathonSponsor.create({
      data: { hackathonId: hackathon.id, name: "CloudBase", tier: "GOLD", website: "https://cloudbase.example.com" },
    }),
    prisma.hackathonSponsor.create({
      data: { hackathonId: hackathon.id, name: "DevTools Inc", tier: "SILVER", website: "https://devtools.example.com" },
    }),
  ]);
  console.log("✅ 3 Sponsors added");

  // ---- FAQs ----
  await Promise.all([
    prisma.hackathonFAQ.create({
      data: { hackathonId: hackathon.id, question: "Who can participate?", answer: "Any currently enrolled student of JECRC University or JECRC Foundation.", sortOrder: 1 },
    }),
    prisma.hackathonFAQ.create({
      data: { hackathonId: hackathon.id, question: "Is it free to participate?", answer: "Yes! Registration and participation are completely free.", sortOrder: 2 },
    }),
    prisma.hackathonFAQ.create({
      data: { hackathonId: hackathon.id, question: "Can I participate solo?", answer: "No, the minimum team size is 2 members. Use the 'Looking for Teammates' board to find partners!", sortOrder: 3 },
    }),
    prisma.hackathonFAQ.create({
      data: { hackathonId: hackathon.id, question: "Do I need to bring my own laptop?", answer: "Yes, all participants must bring their own laptops. Power strips and Wi-Fi will be provided.", sortOrder: 4 },
    }),
  ]);
  console.log("✅ 4 FAQs added");

  // ---- Summary ----
  console.log("\n" + "=".repeat(50));
  console.log("🎉 Seed complete! Demo credentials:");
  console.log("=".repeat(50));
  console.log("Password for all accounts: Password@123\n");
  console.log("Super Admin:     admin@hackathon.jecrc.ac.in");
  console.log("Campus Admin U:  admin.university@jecrc.ac.in");
  console.log("Campus Admin F:  admin.foundation@jecrc.ac.in");
  console.log("Mentor:          mentor@jecrc.ac.in");
  console.log("Jury 1:          jury1@jecrc.ac.in");
  console.log("Jury 2:          jury2@jecrc.ac.in");
  console.log("Student 1:       student1@jecrcu.edu.in");
  console.log("Student 2:       student2@jecrcu.edu.in");
  console.log("Student 3:       student3@jecrcu.edu.in");
  console.log("Student 4:       student4@jecrcf.edu.in");
  console.log("Student 5:       student5@jecrcf.edu.in");
  console.log("=".repeat(50));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
