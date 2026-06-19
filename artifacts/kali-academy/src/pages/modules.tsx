import { useListModules, useListProgress } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { BookOpen, Shield, ChevronRight, Lock } from "lucide-react";
import { Link } from "wouter";

export default function Modules() {
  const { data: modules, isLoading } = useListModules();
  const { data: progress } = useListProgress();

  const completedIds = new Set((progress ?? []).map((p) => p.lessonId));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-card border border-border animate-pulse" />
        ))}
      </div>
    );
  }

  const difficultyColor: Record<string, string> = {
    beginner: "text-green-400 border-green-400",
    intermediate: "text-yellow-400 border-yellow-400",
    advanced: "text-red-400 border-red-400",
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8" />
          MODULES_
        </h1>
        <p className="text-muted-foreground text-sm border-l-2 border-primary pl-4 py-1">
          Select a learning path. Each module is a step deeper into the system.
        </p>
      </header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        {(modules ?? []).map((module, i) => {
          const percent =
            module.lessonCount > 0
              ? Math.round((module.completedCount! / module.lessonCount) * 100)
              : 0;
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Link href={`/modules/${module.id}`}>
                <div
                  data-testid={`card-module-${module.id}`}
                  className="bg-card border border-border hover:border-primary transition-all cursor-pointer group p-6 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/3 transition-colors" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-bold border px-2 py-0.5 ${difficultyColor[module.difficulty] ?? "text-muted-foreground border-muted"}`}>
                          {module.difficulty.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">{module.category}</span>
                      </div>
                      <h2 className="text-lg font-bold text-primary group-hover:text-primary mb-1">
                        {module.title}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {module.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-1 bg-muted">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.8, delay: i * 0.07 + 0.3 }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {module.completedCount}/{module.lessonCount} lessons
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
