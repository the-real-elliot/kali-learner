import { Router } from "express";
import { db } from "@workspace/db";
import { progressTable, lessonsTable, modulesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { MarkCompleteBody } from "@workspace/api-zod";

const router = Router();

router.get("/progress", async (req, res) => {
  const progress = await db.select().from(progressTable);
  const result = progress.map((p) => ({
    ...p,
    completedAt: p.completedAt.toISOString(),
  }));
  res.json(result);
});

router.post("/progress", async (req, res) => {
  const parsed = MarkCompleteBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { lessonId } = parsed.data;

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId));
  if (!lesson) return res.status(404).json({ error: "Lesson not found" });

  const existing = await db.select().from(progressTable).where(eq(progressTable.lessonId, lessonId));
  if (existing.length > 0) {
    return res.status(201).json({ ...existing[0], completedAt: existing[0].completedAt.toISOString() });
  }

  const [inserted] = await db.insert(progressTable).values({ lessonId }).returning();
  res.status(201).json({ ...inserted, completedAt: inserted.completedAt.toISOString() });
});

export default router;
