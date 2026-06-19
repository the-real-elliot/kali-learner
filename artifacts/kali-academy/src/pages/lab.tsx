import { useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useGetLesson, useMarkComplete, useListProgress, getListProgressQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, ChevronRight, CheckCircle, Circle, ArrowLeft,
  BookOpen, Shield, X, Lightbulb, AlertTriangle,
} from "lucide-react";
import { InteractiveTerminal } from "@/components/interactive-terminal";
import { getScenarioForLesson } from "@/lib/lab-scenarios";

export default function Lab() {
  const { id } = useParams<{ id: string }>();
  const lessonId = parseInt(id);
  const queryClient = useQueryClient();

  const { data: lesson, isLoading } = useGetLesson(lessonId, {
    query: { enabled: !!lessonId },
  });
  const { data: progress } = useListProgress();
  const markComplete = useMarkComplete();

  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showBriefing, setShowBriefing] = useState(true);

  const scenario = getScenarioForLesson(lessonId);
  const isLessonDone = (progress ?? []).some(p => p.lessonId === lessonId);

  const handleStepComplete = useCallback((stepId: string) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      next.add(stepId);
      // Auto-complete lesson when all steps done
      if (scenario && next.size === scenario.steps.length && !isLessonDone) {
        setTimeout(() => {
          markComplete.mutate(
            { data: { lessonId } },
            { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProgressQueryKey() }) }
          );
        }, 1500);
      }
      return next;
    });
  }, [scenario, lessonId, isLessonDone, markComplete, queryClient]);

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-mono text-green-400">
        <span className="animate-pulse">Initializing lab environment...</span>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-mono text-green-400 flex-col gap-4">
        <Terminal className="w-12 h-12" />
        <p>No lab environment for this lesson yet.</p>
        <Link href={`/lessons/${lessonId}`}>
          <span className="text-sm text-green-600 hover:text-green-400 cursor-pointer">← Back to lesson</span>
        </Link>
      </div>
    );
  }

  const steps = scenario.steps;
  const totalSteps = steps.length;
  const doneCount = completedSteps.size;
  const allDone = doneCount === totalSteps;
  const currentStepIdx = steps.findIndex(s => !completedSteps.has(s.id));
  const currentStep = currentStepIdx >= 0 ? steps[currentStepIdx] : null;

  const difficultyColor: Record<string, string> = {
    beginner: "text-green-400",
    intermediate: "text-yellow-400",
    advanced: "text-red-400",
  };

  return (
    <div className="h-screen bg-black flex flex-col font-mono overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-900/40 bg-black flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href={`/lessons/${lessonId}`}>
            <div className="flex items-center gap-1 text-green-700 hover:text-green-400 cursor-pointer text-xs transition-colors" data-testid="link-back-lesson">
              <ArrowLeft className="w-3 h-3" />
              exit lab
            </div>
          </Link>
          <span className="text-green-900">|</span>
          <Terminal className="w-4 h-4 text-green-500" />
          <span className="text-green-400 text-sm font-bold">{scenario.title}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-xs text-green-700">
            <span className="text-green-400 font-bold">{doneCount}</span>
            <span>/</span>
            <span>{totalSteps}</span>
            <span className="ml-1">objectives</span>
          </div>
          <div className="w-32 h-1.5 bg-green-950">
            <motion.div
              className="h-full bg-green-400"
              animate={{ width: `${(doneCount / totalSteps) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {allDone && !isLessonDone && (
            <span className="text-green-400 text-xs animate-pulse">saving progress...</span>
          )}
          {isLessonDone && (
            <span className="text-green-400 text-xs flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> completed
            </span>
          )}
        </div>
      </div>

      {/* Main: sidebar + terminal */}
      <div className="flex flex-1 overflow-hidden">

        {/* Mission panel */}
        <div className="w-80 flex-shrink-0 border-r border-green-900/30 flex flex-col overflow-hidden bg-black">
          {/* Briefing */}
          <div className="border-b border-green-900/30">
            <button
              onClick={() => setShowBriefing(b => !b)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs text-green-600 hover:text-green-400 transition-colors"
              data-testid="toggle-briefing"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                MISSION_BRIEFING
              </span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showBriefing ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showBriefing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-xs text-green-300/70 leading-relaxed border-t border-green-900/20">
                    <p className="mt-3">{scenario.briefing}</p>
                    <div className="mt-3 p-2 border border-yellow-900/40 bg-yellow-950/20">
                      <p className="text-yellow-500 text-xs">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        {scenario.objective}
                      </p>
                    </div>
                    <div className="mt-2 text-green-700 text-xs">
                      <span>Target: </span>
                      <span className="text-green-400">{scenario.env.targetIp}</span>
                      <span className="mx-2">/</span>
                      <span className="text-green-400">{scenario.env.targetDomain}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Steps checklist */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-xs text-green-700 mb-3 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              OBJECTIVES
            </p>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const done = completedSteps.has(step.id);
                const isActive = !done && currentStepIdx === i;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-3 border text-xs transition-all ${
                      done
                        ? "border-green-800/40 bg-green-950/20"
                        : isActive
                        ? "border-green-500/50 bg-green-950/40"
                        : "border-green-900/20 opacity-50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {done ? (
                        <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Circle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${isActive ? "text-green-400" : "text-green-900"}`} />
                      )}
                      <div className="flex-1">
                        <p className={`font-bold ${done ? "text-green-600 line-through" : isActive ? "text-green-400" : "text-green-800"}`}>
                          {String(i + 1).padStart(2, "0")}. {step.instruction}
                        </p>
                        {isActive && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-green-600 mt-1 leading-relaxed"
                          >
                            {step.detail}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* All done banner */}
            <AnimatePresence>
              {allDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 border border-green-500/50 bg-green-950/40 text-center"
                >
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-bold text-sm">LAB COMPLETE</p>
                  <p className="text-green-600 text-xs mt-1">+100 XP earned</p>
                  <Link href={`/lessons/${lessonId}`}>
                    <div className="mt-3 text-xs text-green-700 hover:text-green-400 cursor-pointer transition-colors">
                      ← back to lesson
                    </div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Current step hint */}
          {currentStep && !allDone && (
            <div className="border-t border-green-900/30 px-4 py-3">
              <p className="text-xs text-green-700 flex items-center gap-1 mb-2">
                <Lightbulb className="w-3 h-3" />
                CURRENT TASK
              </p>
              <p className="text-xs text-green-400 leading-relaxed">{currentStep.instruction}</p>
              <p className="text-xs text-green-700 mt-2 leading-relaxed whitespace-pre-line">{currentStep.hint}</p>
            </div>
          )}
        </div>

        {/* Terminal */}
        <div className="flex-1 overflow-hidden">
          <InteractiveTerminal
            env={scenario.env}
            steps={scenario.steps}
            completedSteps={completedSteps}
            onStepComplete={handleStepComplete}
          />
        </div>
      </div>
    </div>
  );
}
