import type { GitProfile, Prisma, YearlyStats } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  createGitProfileSchema,
  type CreateYearlyStatsSchema,
  createYearlyStatsSchema,
  updateGitProfileSchema,
  updateYearlyStatsSchema,
} from "@/schemas/git-profile-schemas";

import { ApiError } from "../type";

export type GitProfileWithStats = GitProfile & {
  yearlyStats: YearlyStats[];
};

export async function getGitProfileList(
  where: Prisma.GitProfileWhereInput = {},
  options?: { page?: number; perPage?: number }
) {
  try {
    const { page = 1, perPage = 10 } = options ?? {};

    // First get all profiles with their latest yearly stats
    const allProfiles = await prisma.gitProfile.findMany({
      include: {
        yearlyStats: {
          orderBy: {
            year: "desc",
          },
          take: 1,
        },
      },
    });

    // Sort all profiles to establish global ranks
    const sortedProfiles = allProfiles.sort((a, b) => {
      const aStats = a.yearlyStats[0];
      const bStats = b.yearlyStats[0];

      if (!aStats && !bStats) return 0;
      if (!aStats) return 1;
      if (!bStats) return -1;

      // First sort by current streak
      if (aStats.currentStreak !== bStats.currentStreak) {
        return bStats.currentStreak - aStats.currentStreak;
      }

      // Then by longest streak
      if (aStats.longestStreak !== bStats.longestStreak) {
        return bStats.longestStreak - aStats.longestStreak;
      }

      // Finally by contributions
      return bStats.contributions - aStats.contributions;
    });

    // Add global rank to each profile
    const profilesWithRank = sortedProfiles.map((profile, index) => ({
      ...profile,
      globalRank: index + 1,
    }));

    // Apply search filter if provided
    const filteredProfiles = where.username
      ? profilesWithRank.filter((profile) =>
          profile.username.toLowerCase().includes((where.username as any).contains.toLowerCase())
        )
      : profilesWithRank;

    // Apply pagination to filtered results
    const total = filteredProfiles.length;
    const start = (page - 1) * perPage;
    const paginatedProfiles = filteredProfiles.slice(start, start + perPage);

    return {
      list: paginatedProfiles,
      pagination: { page, perPage, total },
    };
  } catch (error) {
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get git profile list",
      cause: error,
    });
  }
}

/**
 * Create a new git profile for a user
 */
export async function createGitProfile(
  input: typeof createGitProfileSchema._type,
  userId?: string
): Promise<GitProfileWithStats> {
  try {
    // Validate input
    const validatedData = createGitProfileSchema.parse(input);

    // Check if profile already exists
    const existingProfile = await prisma.gitProfile.findUnique({
      where: {
        username: validatedData.username,
        url: validatedData.url,
        avatar: validatedData.avatar,
      },
    });

    if (existingProfile) {
      throw new ApiError({
        code: "CONFLICT",
        message: "Git profile already exists for this username",
      });
    }

    // Create profile
    const profile = await prisma.gitProfile.create({
      data: {
        ...validatedData,
        userId,
      },
      include: {
        yearlyStats: true,
      },
    });

    return profile;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create git profile",
      cause: error,
    });
  }
}

/**
 * Get a git profile by ID
 */
export async function getGitProfileById(id: string): Promise<GitProfileWithStats | null> {
  try {
    const profile = await prisma.gitProfile.findUnique({
      where: { id },
      include: {
        yearlyStats: true,
      },
    });

    return profile;
  } catch (error) {
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get git profile",
      cause: error,
    });
  }
}

/**
 * Get a git profile by username
 */
export async function getGitProfileByUsername(
  username: string
): Promise<GitProfileWithStats | null> {
  try {
    const profile = await prisma.gitProfile.findUnique({
      where: { username },
      include: {
        yearlyStats: true,
      },
    });

    return profile;
  } catch (error) {
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get git profile",
      cause: error,
    });
  }
}

/**
 * Update a git profile
 */
export async function updateGitProfile(
  id: string,
  input: typeof updateGitProfileSchema._type
): Promise<GitProfileWithStats> {
  try {
    // Validate input
    const validatedData = updateGitProfileSchema.parse(input);

    // Check if profile exists
    const existingProfile = await prisma.gitProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new ApiError({
        code: "NOT_FOUND",
        message: "Git profile not found",
      });
    }

    // If username is being updated, check if new username is available
    if (validatedData.username && validatedData.username !== existingProfile.username) {
      const usernameExists = await prisma.gitProfile.findUnique({
        where: { username: validatedData.username },
      });

      if (usernameExists) {
        throw new ApiError({
          code: "CONFLICT",
          message: "Username already taken",
        });
      }
    }

    // Update profile
    const profile = await prisma.gitProfile.update({
      where: { id },
      data: validatedData,
      include: {
        yearlyStats: true,
      },
    });

    return profile;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update git profile",
      cause: error,
    });
  }
}

/**
 * Delete a git profile
 */
export async function deleteGitProfile(id: string): Promise<void> {
  try {
    // Check if profile exists
    const existingProfile = await prisma.gitProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new ApiError({
        code: "NOT_FOUND",
        message: "Git profile not found",
      });
    }

    // Delete profile (this will cascade delete yearlyStats)
    await prisma.gitProfile.delete({
      where: { id },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete git profile",
      cause: error,
    });
  }
}

/**
 * Create yearly stats for a git profile
 */
export async function createYearlyStats(
  profileId: string,
  input: CreateYearlyStatsSchema,
  userId?: string
): Promise<YearlyStats> {
  try {
    // Validate input
    const validatedData = createYearlyStatsSchema.parse({
      ...input,
      dates: input.dates || {}, // Ensure dates is at least an empty object if null
    });

    // Check if profile exists
    const existingProfile = await prisma.gitProfile.findUnique({
      where: { id: profileId },
    });

    if (!existingProfile) {
      throw new ApiError({
        code: "NOT_FOUND",
        message: "Git profile not found",
      });
    }

    // Check if stats for this year already exist
    const existingStats = await prisma.yearlyStats.findFirst({
      where: {
        profileId,
        year: validatedData.year,
      },
    });

    if (existingStats) {
      throw new ApiError({
        code: "CONFLICT",
        message: "Stats for this year already exist",
      });
    }

    // Create stats with dates
    const stats = await prisma.yearlyStats.create({
      data: {
        ...validatedData,
        dates: validatedData.dates || {}, // Ensure dates is saved as an object
        profileId,
        userId,
      },
    });

    return stats;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create yearly stats",
      cause: error,
    });
  }
}

/**
 * Update yearly stats
 */
export async function updateYearlyStats(
  id: string,
  input: typeof updateYearlyStatsSchema._type
): Promise<YearlyStats> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const retryOperation = async (attempt: number): Promise<YearlyStats> => {
    try {
      // Validate input and ensure dates is an object
      const validatedData = updateYearlyStatsSchema.parse({
        ...input,
        dates: input.dates || {}, // Ensure dates is at least an empty object if null
      });

      // Check if stats exist
      const existingStats = await prisma.yearlyStats.findUnique({
        where: { id },
      });

      if (!existingStats) {
        throw new ApiError({
          code: "NOT_FOUND",
          message: "Yearly stats not found",
        });
      }

      // Update stats with dates
      const stats = await prisma.yearlyStats.update({
        where: { id },
        data: {
          ...validatedData,
          dates: validatedData.dates || {}, // Ensure dates is saved as an object
          updatedAt: new Date(),
        },
      });

      return stats;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return retryOperation(attempt + 1);
      }
      throw new ApiError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to update yearly stats",
        cause: error,
      });
    }
  };

  return retryOperation(1);
}

/**
 * Delete yearly stats
 */
export async function deleteYearlyStats(id: string): Promise<void> {
  try {
    // Check if stats exist
    const existingStats = await prisma.yearlyStats.findUnique({
      where: { id },
    });

    if (!existingStats) {
      throw new ApiError({
        code: "NOT_FOUND",
        message: "Yearly stats not found",
      });
    }

    // Delete stats
    await prisma.yearlyStats.delete({
      where: { id },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete yearly stats",
      cause: error,
    });
  }
}
