import express from "express";

import {
  createGitProfile,
  createYearlyStats,
  fetchGitStats,
  getGitProfileById,
  getGitProfileByUsername,
  getGitProfileList,
} from "@/modules/git-profile";
import { ApiError } from "@/modules/type";

export const apiGitProfileRouter = express.Router();

apiGitProfileRouter.get("/", async (req, res) => {
  try {
    const { page = 1, perPage = 50 } = req.query;
    const data = await getGitProfileList(
      {},
      {
        page: parseInt(page.toString()),
        perPage: parseInt(perPage.toString()),
      }
    );
    return res.status(200).json({
      success: true,
      message: "Git profile retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("api-git-profile > GET / > error :>>", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

apiGitProfileRouter.get("/fetch", async (req, res) => {
  try {
    const username = req.query.username;
    if (!username)
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Username is required",
      });
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const data = await fetchGitStats(username.toString(), year);
    return res.status(200).json({
      success: true,
      message: "Git stats retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("api-git-profile > GET /:username > error :>>", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

apiGitProfileRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await getGitProfileById(id);
    return res.status(200).json({
      success: true,
      message: "Git profile retrieved successfully",
      data,
    });
  } catch (error) {
    console.error("api-git-profile > GET /:id > error :>>", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

apiGitProfileRouter.post("/", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    // Check if profile already exists
    const existingProfile = await getGitProfileByUsername(username);
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: "Profile already exists",
      });
    }

    // Create profile and fetch stats
    const year = new Date().getFullYear();
    const stats = await fetchGitStats(username, year, { debug: true });
    console.log("stats :>> ", stats);
    const profile = await createGitProfile(
      {
        username: stats.username,
        url: stats.url,
        avatar: stats.avatarUrl,
      },
      res.locals.user?.id
    );

    // Create yearly stats
    await createYearlyStats(
      profile.id,
      {
        year,
        contributions: stats.totalContributions,
        longestStreak: stats.longestStreak,
        currentStreak: stats.currentStreak,
        dates: stats.dailyStats,
      },
      res.locals.user?.id
    );

    return res.status(201).json({
      success: true,
      message: "Git profile created successfully",
      data: profile,
    });
  } catch (error) {
    console.error("api-git-profile > POST / > error :>>", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
