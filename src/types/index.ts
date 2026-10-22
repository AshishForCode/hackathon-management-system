import { UserRole, UserStatus, HackathonStatus } from "@prisma/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  campusId?: string | null;
  image?: string | null;
}

export interface UserProfileSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  campusName?: string;
  enrollmentNo?: string | null;
  branch?: string | null;
  year?: number | null;
}

export interface HackathonCardData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: HackathonStatus;
  isInterCampus: boolean;
  campusName?: string;
  startDate: Date | null;
  endDate: Date | null;
  registrationEnd: Date | null;
  minTeamSize: number;
  maxTeamSize: number;
  trackCount: number;
  participantCount?: number;
}
