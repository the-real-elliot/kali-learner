import { Router } from "express";
import { db } from "@workspace/db";
import { modulesTable, lessonsTable, progressTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/modules", async (req, res) => {
  const modules = await db.select().from(modulesTable).orderBy(modulesTable.order);
  const completedProgress = await db.select({ lessonId: progressTable.lessonId }).from(progressTable);
  const completedIds = new Set(completedProgress.map((p) => p.lessonId));

  const lessonCounts = await db
    .select({ moduleId: lessonsTable.moduleId, cnt: count(lessonsTable.id) })
    .from(lessonsTable)
    .groupBy(lessonsTable.moduleId);

  const countMap = new Map(lessonCounts.map((l) => [l.moduleId, l.cnt]));

  const lessons = await db.select({ id: lessonsTable.id, moduleId: lessonsTable.moduleId }).from(lessonsTable);
  const completedPerModule = new Map<number, number>();
  for (const l of lessons) {
    if (completedIds.has(l.id)) {
      completedPerModule.set(l.moduleId, (completedPerModule.get(l.moduleId) ?? 0) + 1);
    }
  }

  const result = modules.map((m) => ({
    ...m,
    lessonCount: countMap.get(m.id) ?? 0,
    completedCount: completedPerModule.get(m.id) ?? 0,
  }));

  res.json(result);
});

router.get("/modules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [module] = await db.select().from(modulesTable).where(eq(modulesTable.id, id));
  if (!module) return res.status(404).json({ error: "Not found" });

  const completedProgress = await db.select({ lessonId: progressTable.lessonId }).from(progressTable);
  const completedIds = new Set(completedProgress.map((p) => p.lessonId));

  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, id))
    .orderBy(lessonsTable.order);

  const lessonsWithCompletion = lessons.map((l) => ({
    id: l.id,
    moduleId: l.moduleId,
    title: l.title,
    slug: l.slug,
    order: l.order,
    duration: l.duration,
    completed: completedIds.has(l.id),
  }));

  res.json({ ...module, lessons: lessonsWithCompletion });
});

export default router;
