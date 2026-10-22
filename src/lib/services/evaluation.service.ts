import { prisma } from "@/lib/db/prisma";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/utils/errors";
import {
  CreateRubricInput,
  SubmitEvaluationInput,
  MentorFeedbackInput,
} from "@/lib/validators/evaluation.schema";
import {
  EvaluationRound,
  UserRole,
  NotificationType,
} from "@prisma/client";
import { SessionUser } from "@/types";
import { logger } from "@/lib/utils/logger";

const DEFAULT_CRITERIA = [
  {
    name: "Innovation & Originality",
    description: "Novelty of the solution, creativity, and problem-solving uniqueness.",
    weight: 1.5,
    maxScore: 10,
    sortOrder: 1,
  },
  {
    name: "Technical Execution & Architecture",
    description: "Quality of code, architecture, tech stack integration, and GitHub sync.",
    weight: 1.5,
    maxScore: 10,
    sortOrder: 2,
  },
  {
    name: "Multi-Campus Impact & Feasibility",
    description: "Scalability, practical relevance, and benefit to JECRC institutions.",
    weight: 1.0,
    maxScore: 10,
    sortOrder: 3,
  },
  {
    name: "UI/UX & Pitch Presentation",
    description: "Clarity of demonstration video, user experience, and documentation.",
    weight: 1.0,
    maxScore: 10,
    sortOrder: 4,
  },
];

export class EvaluationService {
  /**
   * Get active rubrics for a hackathon. Auto-seeds standard rubric if none exists.
   */
  static async getHackathonRubric(
    hackathonIdOrSlug: string,
    round: EvaluationRound = EvaluationRound.FINAL
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    let rubric = await prisma.rubric.findFirst({
      where: {
        hackathonId: hackathon.id,
        round,
      },
      include: {
        criteria: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Auto-seed default rubric if missing
    if (!rubric) {
      rubric = await prisma.rubric.create({
        data: {
          hackathonId: hackathon.id,
          name: `${round.replace("_", " ")} Evaluation Rubric`,
          round,
          criteria: {
            create: DEFAULT_CRITERIA,
          },
        },
        include: {
          criteria: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });
    }

    return rubric;
  }

  /**
   * Create or update a rubric for a hackathon.
   */
  static async createOrUpdateRubric(
    hackathonIdOrSlug: string,
    user: SessionUser,
    input: CreateRubricInput
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CAMPUS_ADMIN ||
      user.role === UserRole.ORGANIZER;

    if (!isAdmin) {
      throw new ForbiddenError("Only organizers or administrators can configure scoring rubrics.");
    }

    return prisma.$transaction(async (tx) => {
      // Delete existing criteria if updating
      const existing = await tx.rubric.findFirst({
        where: { hackathonId: hackathon.id, round: input.round },
      });

      if (existing) {
        await tx.criterion.deleteMany({ where: { rubricId: existing.id } });
        return tx.rubric.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            criteria: {
              create: input.criteria.map((c, idx) => ({
                name: c.name,
                description: c.description || null,
                weight: c.weight,
                maxScore: c.maxScore,
                sortOrder: c.sortOrder ?? idx + 1,
              })),
            },
          },
          include: { criteria: true },
        });
      }

      return tx.rubric.create({
        data: {
          hackathonId: hackathon.id,
          name: input.name,
          round: input.round,
          criteria: {
            create: input.criteria.map((c, idx) => ({
              name: c.name,
              description: c.description || null,
              weight: c.weight,
              maxScore: c.maxScore,
              sortOrder: c.sortOrder ?? idx + 1,
            })),
          },
        },
        include: { criteria: true },
      });
    });
  }

  /**
   * Get the queue of submissions for a jury member to evaluate.
   */
  static async getJuryEvaluationQueue(
    hackathonIdOrSlug: string,
    juryUser: SessionUser,
    round: EvaluationRound = EvaluationRound.FINAL
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const submissions = await prisma.submission.findMany({
      where: {
        hackathonId: hackathon.id,
        isFinal: true,
      },
      include: {
        track: true,
        repoSnapshot: true,
        team: {
          include: {
            leader: { select: { id: true, name: true, campus: true } },
            members: {
              include: {
                user: { select: { id: true, name: true, campus: true } },
              },
            },
          },
        },
        evaluations: {
          where: {
            juryId: juryUser.id,
            round,
          },
          include: {
            scores: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    return submissions.map((sub) => {
      const myEval = sub.evaluations[0] || null;
      return {
        ...sub,
        myEvaluation: myEval,
        hasEvaluated: Boolean(myEval),
      };
    });
  }

  /**
   * Submit or update a jury member's evaluation for a project submission.
   */
  static async submitEvaluation(
    submissionId: string,
    juryUser: SessionUser,
    input: SubmitEvaluationInput
  ) {
    const isJudge =
      juryUser.role === UserRole.JURY ||
      juryUser.role === UserRole.SUPER_ADMIN ||
      juryUser.role === UserRole.CAMPUS_ADMIN ||
      juryUser.role === UserRole.ORGANIZER;

    if (!isJudge) {
      throw new ForbiddenError("Only assigned jury members or administrators can evaluate submissions.");
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        hackathon: true,
        team: true,
      },
    });

    if (!submission) {
      throw new NotFoundError("Submission", submissionId);
    }

    // Load active rubric with criteria
    const rubric = await this.getHackathonRubric(submission.hackathonId, input.round);

    // Validate criterion IDs and max scores
    const criteriaMap = new Map(rubric.criteria.map((c) => [c.id, c]));

    let totalWeightedScore = 0;
    let totalMaxPossible = 0;

    for (const item of input.scores) {
      const crit = criteriaMap.get(item.criterionId);
      if (!crit) {
        throw new ValidationError(`Criterion ID "${item.criterionId}" does not belong to this rubric.`);
      }

      if (item.score < 0 || item.score > crit.maxScore) {
        throw new ValidationError(
          `Score for "${crit.name}" must be between 0 and ${crit.maxScore} (received ${item.score}).`
        );
      }

      totalWeightedScore += item.score * crit.weight;
      totalMaxPossible += crit.maxScore * crit.weight;
    }

    // Normalize score to a 100-point scale
    const normalizedTotalScore =
      totalMaxPossible > 0 ? (totalWeightedScore / totalMaxPossible) * 100 : 0;

    // Check existing evaluation
    const existing = await prisma.evaluation.findUnique({
      where: {
        submissionId_juryId_round: {
          submissionId: submission.id,
          juryId: juryUser.id,
          round: input.round,
        },
      },
    });

    if (existing?.isLocked && !["SUPER_ADMIN", "CAMPUS_ADMIN"].includes(juryUser.role)) {
      throw new ValidationError("This evaluation has been locked and cannot be edited.");
    }

    return prisma.$transaction(async (tx) => {
      let evaluation;
      if (existing) {
        // Delete previous scores and recreate
        await tx.score.deleteMany({ where: { evaluationId: existing.id } });

        evaluation = await tx.evaluation.update({
          where: { id: existing.id },
          data: {
            totalScore: Math.round(normalizedTotalScore * 10) / 10,
            comments: input.comments || null,
            isLocked: input.isLocked,
            scores: {
              create: input.scores.map((s) => ({
                criterionId: s.criterionId,
                score: s.score,
                comment: s.comment || null,
              })),
            },
          },
          include: {
            scores: { include: { criterion: true } },
          },
        });
      } else {
        evaluation = await tx.evaluation.create({
          data: {
            submissionId: submission.id,
            juryId: juryUser.id,
            rubricId: rubric.id,
            round: input.round,
            totalScore: Math.round(normalizedTotalScore * 10) / 10,
            comments: input.comments || null,
            isLocked: input.isLocked,
            scores: {
              create: input.scores.map((s) => ({
                criterionId: s.criterionId,
                score: s.score,
                comment: s.comment || null,
              })),
            },
          },
          include: {
            scores: { include: { criterion: true } },
          },
        });
      }

      logger.info("Evaluation recorded", {
        submissionId: submission.id,
        juryId: juryUser.id,
        score: evaluation.totalScore,
      });

      return evaluation;
    });
  }

  /**
   * Submit mentor feedback for a team.
   */
  static async addMentorFeedback(
    teamId: string,
    mentorUser: SessionUser,
    input: MentorFeedbackInput
  ) {
    const isMentorOrAdmin =
      mentorUser.role === UserRole.MENTOR ||
      mentorUser.role === UserRole.SUPER_ADMIN ||
      mentorUser.role === UserRole.CAMPUS_ADMIN ||
      mentorUser.role === UserRole.ORGANIZER;

    if (!isMentorOrAdmin) {
      throw new ForbiddenError("Only assigned mentors or organizers can submit mentor feedback.");
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        leader: true,
        hackathon: true,
      },
    });

    if (!team) {
      throw new NotFoundError("Team", teamId);
    }

    const feedback = await prisma.mentorFeedback.create({
      data: {
        teamId: team.id,
        mentorId: mentorUser.id,
        feedback: input.feedback.trim(),
      },
      include: {
        mentor: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify team leader
    await prisma.notification.create({
      data: {
        userId: team.leaderId,
        title: "New Mentor Feedback Received 💡",
        message: `${mentorUser.name} left feedback for your team "${team.name}".`,
        type: NotificationType.MENTOR_FEEDBACK,
        link: `/hackathons/${team.hackathon.slug}/teams`,
      },
    });

    return feedback;
  }

  /**
   * Get all mentor feedback for a team.
   */
  static async getTeamMentorFeedback(teamId: string) {
    return prisma.mentorFeedback.findMany({
      where: { teamId },
      include: {
        mentor: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
