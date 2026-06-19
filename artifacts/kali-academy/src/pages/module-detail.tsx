import { useGetModule, useListProgress, getListProgressQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Circle, ChevronRight, ArrowLeft, Clock } from "lucide-react";
import { Link, useParams } from "wouter";

export default function ModuleDetail() {
  const { id } = useParams<{ id: string }>();
  const moduleId = parseInt(id);

  const { data: module, isLoading } = useGetModule(moduleId, {
    query: { enabled: !!moduleId },
  });
  const { data: progress } = useListProgress();
  const completedIds = new Set((progress ?? []).map((p) => p.lessonId));

  if (isLoading || !module) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse" />
        <div className="h-24 bg-card border border-border animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const difficultyColor: Record<string, string> = {
    beginner: "text-green-400 border-green-400",
    intermediate: "text-yellow-400 border-yellow-400",
    advanced: "text-red-400 border-red-400",
  };

  const completedCount = module.lessons.filter((l) => completedIds.has(l.id)).length;
  const percent = module.lessons.length > 0 ? Math.round((completedCount / module.lessons.length) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      <header>
        <Link href="/modules">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-pointer mb-4 text-sm" data-testid="link-back-modules">
            <ArrowLeft className="w-4 h-4" />
            cd ../modules
          </div>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-xs font-bold border px-2 py-0.5 ${difficultyColor[module.difficulty] ?? ""}`}>
            {module.difficulty.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">{module.category}</span>
        </div>
        <h1 className="text-3xl font-bold text-primary mb-2">{module.title}</h1>
        <p className="text-muted-foreground text-sm border-l-2 border-primary pl-4 py-1">
          {module.description}
        </p>
      </header>

      <div className="bg-card border border-border p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-primary">PROGRESS</span>
          <span className="text-sm text-muted-foreground">{completedCount}/{module.lessons.length}</span>
        </div>
        <div className="h-2 bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1 }}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-primary border-b border-border pb-2 mb-4">
          LESSONS_
        </h2>
        <div className="space-y-2">
          {module.lessons.map((lesson, i) => {
            const done = completedIds.has(lesson.id);
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={`/lessons/${lesson.id}`}>
                  <div
                    data-testid={`card-lesson-${lesson.id}`}
                    className={`flex items-center gap-4 p-4 border cursor-pointer transition-all group ${done ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary"}`}
                  >
                    {done ? (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {String(i + 1).padStart(2, "0")}. {lesson.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.duration}m</span>
                      <ChevronRight className="w-4 h-4 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
