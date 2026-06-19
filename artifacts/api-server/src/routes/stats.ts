import { Router } from "express";
import { db } from "@workspace/db";
import { progressTable, lessonsTable, modulesTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";

const router = Router();

const HACKER_TIPS = [
  { type: "tip" as const, title: "Recon First", description: "Always enumerate before you exploit. Information is the most powerful weapon in your arsenal." },
  { type: "tip" as const, title: "Know Your Tools", description: "nmap -sV reveals service versions. Knowing what's running is the first step to knowing how it breaks." },
  { type: "tip" as const, title: "Document Everything", description: "Real pentesters document every step. Screenshots, command outputs, timestamps. If you didn't write it down, it didn't happen." },
  { type: "tip" as const, title: "Understand the Target", description: "Study the target's architecture before touching it. Blind attacks are loud attacks." },
  { type: "tip" as const, title: "Privilege Escalation", description: "Getting a foothold is just the beginning. linpeas.sh and winpeas.exe are your best friends for privesc." },
  { type: "tip" as const, title: "OSINT is Underrated", description: "You can learn more about a target from Google than from Metasploit. Maltego, Shodan, and theHarvester are essentials." },
  { type: "tip" as const, title: "Burp Suite Mastery", description: "Every web pentester lives in Burp Suite. Learn the Repeater and Intruder tabs before anything else." },
];

router.get("/stats", async (req, res) => {
  const [totalLessonsResult] = await db.select({ cnt: count() }).from(lessonsTable);
  const [totalModulesResult] = await db.select({ cnt: count() }).from(modulesTable);
  const progress = await db.select().from(progressTable);

  const completedLessons = progress.length;

  const allLessons = await db.select({ id: lessonsTable.id, moduleId: lessonsTable.moduleId, duration: lessonsTable.duration }).from(lessonsTable);
  const completedIds = new Set(progress.map((p) => p.lessonId));

  const completedModuleIds = new Set<number>();
  const moduleToLessons = new Map<number, number[]>();
  for (const l of allLessons) {
    if (!moduleToLessons.has(l.moduleId)) moduleToLessons.set(l.moduleId, []);
    moduleToLessons.get(l.moduleId)!.push(l.id);
  }
  for (const [mId, lIds] of moduleToLessons.entries()) {
    if (lIds.every((lid) => completedIds.has(lid))) completedModuleIds.add(mId);
  }

  const totalHours = allLessons
    .filter((l) => completedIds.has(l.id))
    .reduce((sum, l) => sum + l.duration, 0) / 60;

  const xp = completedLessons * 100 + completedModuleIds.size * 500;
  let level = "Script Kiddie";
  if (xp >= 5000) level = "Elite";
  else if (xp >= 3000) level = "Red Team";
  else if (xp >= 1500) level = "Pentester";
  else if (xp >= 500) level = "Hacker";
  else if (xp >= 100) level = "Newbie";

  res.json({
    totalLessons: totalLessonsResult.cnt,
    completedLessons,
    totalModules: totalModulesResult.cnt,
    completedModules: completedModuleIds.size,
    totalHours: Math.round(totalHours * 10) / 10,
    currentStreak: Math.min(completedLessons, 7),
    level,
    xp,
  });
});

router.get("/feed", async (req, res) => {
  const progress = await db
    .select({ id: progressTable.id, lessonId: progressTable.lessonId, completedAt: progressTable.completedAt })
    .from(progressTable)
    .orderBy(progressTable.completedAt);

  const lessons = await db.select({ id: lessonsTable.id, title: lessonsTable.title }).from(lessonsTable);
  const lessonMap = new Map(lessons.map((l) => [l.id, l.title]));

  const items: Array<{
    id: number;
    type: "tip" | "achievement" | "lesson_complete" | "module_complete";
    title: string;
    description: string;
    timestamp: string;
    lessonId: number | null;
  }> = [];

  for (const p of progress.slice(-5).reverse()) {
    const title = lessonMap.get(p.lessonId) ?? "Unknown lesson";
    items.push({
      id: p.id,
      type: "lesson_complete",
      title: `Completed: ${title}`,
      description: `You finished the "${title}" lesson. XP +100`,
      timestamp: p.completedAt.toISOString(),
      lessonId: p.lessonId,
    });
  }

  const tipIdx = Math.floor(Date.now() / 3600000) % HACKER_TIPS.length;
  const tip = HACKER_TIPS[tipIdx];
  items.push({
    id: 9000 + tipIdx,
    type: "tip",
    title: tip.title,
    description: tip.description,
    timestamp: new Date().toISOString(),
    lessonId: null,
  });

  res.json(items);
});

export default router;
