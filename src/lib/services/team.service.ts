import { prisma } from "@/lib/db/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/utils/errors";
import { CreateTeamInput, UpdateTeamInput } from "@/lib/validators/team.schema";
import {
  RegistrationStatus,
  HackathonStatus,
  TeamMemberRole,
  InviteStatus,
  NotificationType,
} from "@prisma/client";
import { SessionUser } from "@/types";
import { INVITE_EXPIRY_MS } from "@/lib/utils/constants";
import { logger } from "@/lib/utils/logger";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "JECRC-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class TeamService {
  /**
   * Create a new team for a hackathon.
   */
  static async createTeam(
    hackathonIdOrSlug: string,
    user: SessionUser,
    input: CreateTeamInput
  ) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    if (
      hackathon.status !== HackathonStatus.REGISTRATION_OPEN &&
      hackathon.status !== HackathonStatus.IN_PROGRESS
    ) {
      throw new ValidationError(
        `Team creation is closed for this hackathon (Status: ${hackathon.status.replace("_", " ")}).`
      );
    }

    // Check user registration
    const registration = await prisma.registration.findUnique({
      where: {
        userId_hackathonId: {
          userId: user.id,
          hackathonId: hackathon.id,
        },
      },
    });

    if (!registration || registration.status !== RegistrationStatus.APPROVED) {
      throw new ValidationError("You must have an approved registration to create a team.");
    }

    // Check if user is already in a team for this hackathon
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        team: { hackathonId: hackathon.id },
      },
    });

    if (existingMembership) {
      throw new ConflictError("You are already part of a team in this hackathon.");
    }

    // Check team name uniqueness within this hackathon
    const existingTeam = await prisma.team.findUnique({
      where: {
        hackathonId_name: {
          hackathonId: hackathon.id,
          name: input.name.trim(),
        },
      },
    });

    if (existingTeam) {
      throw new ConflictError(`A team named '${input.name}' already exists in this hackathon.`);
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    let codeExists = await prisma.team.findUnique({ where: { inviteCode } });
    while (codeExists) {
      inviteCode = generateInviteCode();
      codeExists = await prisma.team.findUnique({ where: { inviteCode } });
    }

    const team = await prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          hackathonId: hackathon.id,
          name: input.name.trim(),
          inviteCode,
          leaderId: user.id,
          lookingForMembers: input.lookingForMembers,
          requiredSkills: input.requiredSkills?.trim() || null,
          members: {
            create: {
              userId: user.id,
              role: TeamMemberRole.LEADER,
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  campus: { select: { name: true, code: true } },
                  profile: true,
                },
              },
            },
          },
          leader: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "TEAM_CREATED",
          entity: "Team",
          entityId: createdTeam.id,
          newValue: { name: createdTeam.name, inviteCode: createdTeam.inviteCode },
        },
      });

      return createdTeam;
    });

    logger.info("Team created successfully", { teamId: team.id, inviteCode: team.inviteCode });
    return team;
  }

  /**
   * Join an existing team using its unique invite code.
   */
  static async joinTeamByCode(inviteCode: string, user: SessionUser) {
    const codeNormalized = inviteCode.trim().toUpperCase();

    const team = await prisma.team.findUnique({
      where: { inviteCode: codeNormalized },
      include: {
        hackathon: true,
        members: true,
      },
    });

    if (!team) {
      throw new NotFoundError("Team with invite code", codeNormalized);
    }

    if (team.locked) {
      throw new ValidationError("This team roster has been locked by the team leader.");
    }

    if (
      team.hackathon.status !== HackathonStatus.REGISTRATION_OPEN &&
      team.hackathon.status !== HackathonStatus.IN_PROGRESS
    ) {
      throw new ValidationError("Team modifications are closed for this hackathon.");
    }

    // Check participant registration
    const registration = await prisma.registration.findUnique({
      where: {
        userId_hackathonId: {
          userId: user.id,
          hackathonId: team.hackathonId,
        },
      },
    });

    if (!registration || registration.status !== RegistrationStatus.APPROVED) {
      throw new ValidationError("You must have an approved registration before joining a team.");
    }

    // Check if user is already in a team for this hackathon
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        team: { hackathonId: team.hackathonId },
      },
    });

    if (existingMembership) {
      throw new ConflictError("You are already part of a team for this hackathon.");
    }

    // Check team capacity
    if (team.members.length >= team.hackathon.maxTeamSize) {
      throw new ValidationError(
        `Team has reached maximum allowed capacity (${team.hackathon.maxTeamSize} members).`
      );
    }

    const updatedTeam = await prisma.$transaction(async (tx) => {
      // Add member
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: user.id,
          role: TeamMemberRole.MEMBER,
        },
      });

      // If team reaches max size, close lookingForMembers
      const newMemberCount = team.members.length + 1;
      if (newMemberCount >= team.hackathon.maxTeamSize) {
        await tx.team.update({
          where: { id: team.id },
          data: { lookingForMembers: false },
        });
      }

      // Notify team leader
      await tx.notification.create({
        data: {
          userId: team.leaderId,
          title: "New Teammate Joined! 🚀",
          message: `${user.name} has joined your team "${team.name}".`,
          type: NotificationType.TEAM_INVITE,
          link: `/hackathons/${team.hackathon.slug}/teams`,
        },
      });

      return tx.team.findUnique({
        where: { id: team.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  campus: { select: { name: true, code: true } },
                  profile: true,
                },
              },
            },
          },
        },
      });
    });

    return updatedTeam;
  }

  /**
   * Send an invite to a student by email.
   */
  static async inviteMember(teamId: string, inviter: SessionUser, inviteeEmail: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        hackathon: true,
        members: true,
      },
    });

    if (!team) {
      throw new NotFoundError("Team", teamId);
    }

    // Verify inviter is in team
    const isMember = team.members.some((m) => m.userId === inviter.id);
    if (!isMember) {
      throw new ForbiddenError("Only team members can send invitations.");
    }

    if (team.locked) {
      throw new ValidationError("Team is locked from accepting new members.");
    }

    if (team.members.length >= team.hackathon.maxTeamSize) {
      throw new ValidationError("Team has reached maximum team capacity.");
    }

    const targetEmail = inviteeEmail.trim().toLowerCase();

    // Check if invitee exists
    const invitee = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (invitee) {
      // Check if already in this team
      if (team.members.some((m) => m.userId === invitee.id)) {
        throw new ConflictError("This student is already a member of your team.");
      }

      // Check if already in another team in this hackathon
      const inOtherTeam = await prisma.teamMember.findFirst({
        where: {
          userId: invitee.id,
          team: { hackathonId: team.hackathonId },
        },
      });

      if (inOtherTeam) {
        throw new ConflictError("This student is already enrolled in another team for this hackathon.");
      }
    }

    // Create team invite
    const invite = await prisma.teamInvite.create({
      data: {
        teamId: team.id,
        inviterId: inviter.id,
        inviteeId: invitee?.id || null,
        inviteeEmail: targetEmail,
        status: InviteStatus.PENDING,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
      },
    });

    // Notify invitee if registered
    if (invitee) {
      await prisma.notification.create({
        data: {
          userId: invitee.id,
          title: "Team Invitation Received 📩",
          message: `${inviter.name} invited you to join team "${team.name}" in ${team.hackathon.title}.`,
          type: NotificationType.TEAM_INVITE,
          link: `/hackathons/${team.hackathon.slug}/teams`,
        },
      });
    }

    return invite;
  }

  /**
   * Respond to a team invite (Accept or Reject).
   */
  static async respondToInvite(inviteId: string, user: SessionUser, accept: boolean) {
    const invite = await prisma.teamInvite.findUnique({
      where: { id: inviteId },
      include: {
        team: {
          include: {
            hackathon: true,
            members: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundError("Team Invite", inviteId);
    }

    if (invite.inviteeId !== user.id && invite.inviteeEmail !== user.email.toLowerCase()) {
      throw new ForbiddenError("You are not the designated recipient of this invitation.");
    }

    if (invite.status !== InviteStatus.PENDING) {
      throw new ValidationError(`This invitation has already been ${invite.status.toLowerCase()}.`);
    }

    if (invite.expiresAt && new Date() > new Date(invite.expiresAt)) {
      await prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: InviteStatus.EXPIRED },
      });
      throw new ValidationError("This invitation has expired.");
    }

    if (!accept) {
      return prisma.teamInvite.update({
        where: { id: inviteId },
        data: { status: InviteStatus.REJECTED },
      });
    }

    // Accepting invite: Verify participant is registered and not in another team
    const registration = await prisma.registration.findUnique({
      where: {
        userId_hackathonId: {
          userId: user.id,
          hackathonId: invite.team.hackathonId,
        },
      },
    });

    if (!registration || registration.status !== RegistrationStatus.APPROVED) {
      throw new ValidationError("You must have an approved hackathon registration before joining a team.");
    }

    const inTeam = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        team: { hackathonId: invite.team.hackathonId },
      },
    });

    if (inTeam) {
      throw new ConflictError("You are already part of a team in this hackathon.");
    }

    if (invite.team.members.length >= invite.team.hackathon.maxTeamSize) {
      throw new ValidationError("The team has already reached its maximum capacity.");
    }

    return prisma.$transaction(async (tx) => {
      // Mark invite accepted
      await tx.teamInvite.update({
        where: { id: inviteId },
        data: { status: InviteStatus.ACCEPTED, inviteeId: user.id },
      });

      // Add user to team
      await tx.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId: user.id,
          role: TeamMemberRole.MEMBER,
        },
      });

      // If at capacity, close matchmaking
      if (invite.team.members.length + 1 >= invite.team.hackathon.maxTeamSize) {
        await tx.team.update({
          where: { id: invite.teamId },
          data: { lookingForMembers: false },
        });
      }

      // Notify leader
      await tx.notification.create({
        data: {
          userId: invite.team.leaderId,
          title: "Invitation Accepted! 🎉",
          message: `${user.name} accepted your invite and joined "${invite.team.name}".`,
          type: NotificationType.TEAM_INVITE,
          link: `/hackathons/${invite.team.hackathon.slug}/teams`,
        },
      });

      return { success: true };
    });
  }

  /**
   * Remove a member from the team (Leader or Admin only).
   */
  static async removeMember(teamId: string, operator: SessionUser, targetUserId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      throw new NotFoundError("Team", teamId);
    }

    const isLeader = team.leaderId === operator.id;
    const isSelf = operator.id === targetUserId;
    const isAdmin = ["SUPER_ADMIN", "CAMPUS_ADMIN"].includes(operator.role);

    if (!isLeader && !isSelf && !isAdmin) {
      throw new ForbiddenError("Only team leaders or administrators can remove team members.");
    }

    if (targetUserId === team.leaderId && !isSelf) {
      throw new ValidationError("Team leader cannot be removed by members. Transfer leadership first.");
    }

    return prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({
        where: {
          teamId_userId: {
            teamId,
            userId: targetUserId,
          },
        },
      });

      // If leader leaves their own team
      if (targetUserId === team.leaderId) {
        const remaining = team.members.filter((m) => m.userId !== targetUserId);
        if (remaining.length > 0) {
          // Promote next member to leader
          await tx.team.update({
            where: { id: teamId },
            data: { leaderId: remaining[0].userId },
          });
          await tx.teamMember.update({
            where: {
              teamId_userId: {
                teamId,
                userId: remaining[0].userId,
              },
            },
            data: { role: TeamMemberRole.LEADER },
          });
        } else {
          // No members left: delete team
          await tx.team.delete({ where: { id: teamId } });
        }
      }

      return { success: true };
    });
  }

  /**
   * Update team settings (Name, Matchmaking status, Locked status).
   */
  static async updateTeam(teamId: string, operator: SessionUser, input: UpdateTeamInput) {
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundError("Team", teamId);

    const isLeader = team.leaderId === operator.id;
    const isAdmin = ["SUPER_ADMIN", "CAMPUS_ADMIN"].includes(operator.role);

    if (!isLeader && !isAdmin) {
      throw new ForbiddenError("Only team leaders or administrators can update team configuration.");
    }

    return prisma.team.update({
      where: { id: teamId },
      data: {
        name: input.name ? input.name.trim() : undefined,
        lookingForMembers: input.lookingForMembers,
        requiredSkills: input.requiredSkills !== undefined ? input.requiredSkills : undefined,
        locked: input.locked,
      },
    });
  }

  /**
   * List teams on the "Looking for Teammates" Matchmaking Board.
   */
  static async listMatchmakingTeams(hackathonIdOrSlug: string, skillFilter?: string) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
    });

    if (!hackathon) {
      throw new NotFoundError("Hackathon", hackathonIdOrSlug);
    }

    const teams = await prisma.team.findMany({
      where: {
        hackathonId: hackathon.id,
        lookingForMembers: true,
        locked: false,
        ...(skillFilter
          ? {
              requiredSkills: {
                contains: skillFilter,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            campus: { select: { name: true, code: true } },
            profile: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                campus: { select: { code: true } },
                profile: { select: { skills: true, branch: true, year: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Filter out teams that already hit maxTeamSize
    return teams
      .filter((t) => t.members.length < hackathon.maxTeamSize)
      .map((t) => ({
        ...t,
        vacancies: hackathon.maxTeamSize - t.members.length,
        maxTeamSize: hackathon.maxTeamSize,
      }));
  }

  /**
   * Get team details by ID or Invite Code.
   */
  static async getTeamDetails(identifier: string) {
    const team = await prisma.team.findFirst({
      where: {
        OR: [{ id: identifier }, { inviteCode: identifier.toUpperCase() }],
      },
      include: {
        hackathon: true,
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            campus: { select: { name: true, code: true } },
            profile: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                campus: { select: { name: true, code: true } },
                profile: true,
              },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        invites: {
          where: { status: InviteStatus.PENDING },
          orderBy: { createdAt: "desc" },
        },
        submissions: true,
      },
    });

    if (!team) {
      throw new NotFoundError("Team", identifier);
    }

    return team;
  }

  /**
   * Get the current user's team for a hackathon.
   */
  static async getUserTeamInHackathon(hackathonIdOrSlug: string, userId: string) {
    const hackathon = await prisma.hackathon.findFirst({
      where: {
        OR: [{ id: hackathonIdOrSlug }, { slug: hackathonIdOrSlug }],
      },
      select: { id: true },
    });

    if (!hackathon) return null;

    const membership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { hackathonId: hackathon.id },
      },
      include: {
        team: {
          include: {
            hackathon: true,
            leader: { select: { id: true, name: true, email: true } },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    campus: { select: { name: true, code: true } },
                    profile: true,
                  },
                },
              },
              orderBy: { joinedAt: "asc" },
            },
            invites: {
              where: { status: InviteStatus.PENDING },
            },
          },
        },
      },
    });

    return membership?.team || null;
  }
}
