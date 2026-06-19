import { useGetLesson, useMarkComplete, useListProgress, getListProgressQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Terminal, AlertTriangle, FlaskConical } from "lucide-react";
import { Link, useParams } from "wouter";
import { getScenarioForLesson } from "@/lib/lab-scenarios";

export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const lessonId = parseInt(id);
  const queryClient = useQueryClient();

  const { data: lesson, isLoading } = useGetLesson(lessonId, {
    query: { enabled: !!lessonId },
  });
  const { data: progress } = useListProgress();
  const markComplete = useMarkComplete();

  const completedIds = new Set((progress ?? []).map((p) => p.lessonId));
  const isDone = completedIds.has(lessonId);
  const hasLab = !!getScenarioForLesson(lessonId);

  const handleMarkComplete = () => {
    if (isDone) return;
    markComplete.mutate(
      { data: { lessonId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProgressQueryKey() });
        },
      }
    );
  };

  if (isLoading || !lesson) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-muted animate-pulse" />
        <div className="h-40 bg-card border border-border animate-pulse" />
        <div className="h-32 bg-card border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header>
        <Link href={`/modules/${lesson.moduleId}`}>
          <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer mb-4 text-sm" data-testid="link-back-module">
            <ArrowLeft className="w-4 h-4" />
            cd ../module
          </div>
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-primary">{lesson.title}</h1>
          {isDone ? (
            <div className="flex items-center gap-2 text-primary text-sm border border-primary px-4 py-2">
              <CheckCircle className="w-4 h-4" />
              COMPLETED
            </div>
          ) : (
            <button
              data-testid="button-mark-complete"
              onClick={handleMarkComplete}
              disabled={markComplete.isPending}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {markComplete.isPending ? "SAVING..." : "MARK_COMPLETE"}
            </button>
          )}
        </div>
      </header>

      <div className="bg-card border border-border p-6">
        <h2 className="text-xs font-bold text-muted-foreground mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          BRIEFING
        </h2>
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">
          {lesson.content}
        </div>
      </div>

      {/* Lab CTA */}
      {hasLab && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-green-500/40 bg-green-950/20 p-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <FlaskConical className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-green-400 font-bold text-lg">INTERACTIVE LAB</h3>
                <p className="text-green-600 text-sm mt-1">
                  Practice this lesson in a live terminal with a guided simulated environment.
                  Type real Kali Linux commands, get coached through each step, and earn XP when you complete all objectives.
                </p>
              </div>
            </div>
            <Link href={`/lab/${lessonId}`}>
              <div
                data-testid="button-enter-lab"
                className="flex items-center gap-2 bg-green-500 text-black px-6 py-3 font-bold text-sm hover:bg-green-400 transition-colors cursor-pointer"
              >
                <FlaskConical className="w-4 h-4" />
                ENTER LAB
              </div>
            </Link>
          </div>
          {isDone && (
            <p className="text-green-700 text-xs mt-3 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              You already completed this lab — re-enter to practice again.
            </p>
          )}
        </motion.div>
      )}

      {lesson.commands && lesson.commands.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary border-b border-border pb-2">
            COMMANDS_
          </h2>
          {lesson.commands.map((cmd, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border border-border overflow-hidden"
            >
              {cmd.dangerous && (
                <div className="flex items-center gap-2 bg-red-950/40 border-b border-red-900/60 px-4 py-2 text-xs text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  USE ONLY IN AUTHORIZED ENVIRONMENTS
                </div>
              )}
              <div className="bg-black/60 px-4 py-3">
                <div className="flex items-center gap-2 text-primary font-mono text-sm">
                  <span className="text-muted-foreground select-none">root@kali:~#</span>
                  <span className="text-green-400">{cmd.command}</span>
                </div>
              </div>
              <div className="bg-black/30 px-4 py-3 border-t border-border/50">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                  {cmd.output}
                </pre>
              </div>
              <div className="px-4 py-3 border-t border-border bg-card">
                <p className="text-xs text-foreground">{cmd.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        {lesson.prevLessonId ? (
          <Link href={`/lessons/${lesson.prevLessonId}`}>
            <div data-testid="link-prev-lesson" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
              <ArrowLeft className="w-4 h-4" />
              PREV_LESSON
            </div>
          </Link>
        ) : (
          <div />
        )}
        {lesson.nextLessonId ? (
          <Link href={`/lessons/${lesson.nextLessonId}`}>
            <div data-testid="link-next-lesson" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
              NEXT_LESSON
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
