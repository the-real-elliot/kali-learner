import { Router } from "express";
import { db } from "@workspace/db";
import { lessonsTable, progressTable } from "@workspace/db";
import { eq, and, gt, lt } from "drizzle-orm";

const router = Router();

router.get("/lessons/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id));
  if (!lesson) return res.status(404).json({ error: "Not found" });

  const completedProgress = await db.select({ lessonId: progressTable.lessonId }).from(progressTable);
  const completedIds = new Set(completedProgress.map((p) => p.lessonId));

  const moduleLessons = await db
    .select({ id: lessonsTable.id, order: lessonsTable.order })
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, lesson.moduleId));

  moduleLessons.sort((a, b) => a.order - b.order);
  const idx = moduleLessons.findIndex((l) => l.id === id);
  const prevLessonId = idx > 0 ? moduleLessons[idx - 1].id : null;
  const nextLessonId = idx < moduleLessons.length - 1 ? moduleLessons[idx + 1].id : null;

  res.json({
    ...lesson,
    completed: completedIds.has(lesson.id),
    nextLessonId,
    prevLessonId,
  });
});

export default router;
