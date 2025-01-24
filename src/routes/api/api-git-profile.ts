import express from "express";

import { createGitProfile, fetchGitStats, getGitProfileById } from "@/modules/git-profile";
import { ApiError } from "@/modules/type";

export const apiGitProfileRouter = express.Router();

apiGitProfileRouter.get("/fetch", async (req, res) => {
  try {
    const username = req.query.username;
    if (!username)
      throw new ApiError({
        code: "BAD_REQUEST",
        message: "Username is required",
      });
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    console.log("username :>>", username);
    console.log("year :>>", year);
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
    const data = await createGitProfile(req.body);
    return res.status(201).json({
      success: true,
      message: "Git profile created successfully",
      data,
    });
  } catch (error) {
    console.error("api-git-profile > POST / > error :>>", error);
    return res.status(400).json({
      success: false,
      message: "Failed to create git profile",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
