import React from "react";
import { useGetStats, useGetFeed } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, Award, Terminal as TerminalIcon, BookOpen, Clock, Zap } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: feed, isLoading: feedLoading } = useGetFeed();

  if (statsLoading || feedLoading) {
    return (
      <div className="flex flex-col space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-card border border-border animate-pulse" />)}
        </div>
      </div>
    );
  }

  const getFeedIcon = (type: string) => {
    switch(type) {
      case 'tip': return <TerminalIcon className="w-4 h-4 text-accent-foreground" />;
      case 'achievement': return <Award className="w-4 h-4 text-primary" />;
      case 'lesson_complete': return <BookOpen className="w-4 h-4 text-primary" />;
      case 'module_complete': return <ShieldAlert className="w-4 h-4 text-destructive" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
          <TerminalIcon className="w-8 h-8" />
          DASHBOARD_
        </h1>
        <p className="text-muted-foreground text-sm border-l-2 border-primary pl-4 py-1 italic">
          "A bug is never just a mistake. It represents something bigger. An error of thinking. That makes you who you are."
        </p>
      </header>

      {stats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <div className="bg-card border border-border p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-16 h-16" />
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-bold">LEVEL [{stats.level}]</p>
            <div className="text-4xl font-bold text-primary">{stats.xp} <span className="text-sm font-normal text-muted-foreground">XP</span></div>
            <div className="mt-4 h-1 w-full bg-muted">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(stats.xp % 1000) / 10}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>

          <div className="bg-card border border-border p-5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <BookOpen className="w-16 h-16" />
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-bold">MODULES COMPLETED</p>
            <div className="text-4xl font-bold text-primary">{stats.completedModules}<span className="text-sm font-normal text-muted-foreground">/{stats.totalModules}</span></div>
          </div>

          <div className="bg-card border border-border p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Award className="w-16 h-16" />
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-bold">LESSONS MASTERED</p>
            <div className="text-4xl font-bold text-primary">{stats.completedLessons}<span className="text-sm font-normal text-muted-foreground">/{stats.totalLessons}</span></div>
          </div>

          <div className="bg-card border border-border p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-16 h-16" />
            </div>
            <p className="text-xs text-muted-foreground mb-1 font-bold">TIME IN SHELL</p>
            <div className="text-4xl font-bold text-primary">{stats.totalHours}<span className="text-sm font-normal text-muted-foreground">H</span></div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-primary border-b border-border pb-2">SYSTEM_LOGS</h2>
          
          <div className="bg-card border border-border">
            {feed?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No logs found.</div>
            ) : (
              <div className="divide-y divide-border">
                {feed?.map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={item.id} 
                    className="p-4 hover:bg-muted/50 transition-colors flex gap-4"
                  >
                    <div className="mt-1">{getFeedIcon(item.type)}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-primary text-sm">{item.title}</p>
                        <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      {item.lessonId && (
                        <Link href={`/lessons/${item.lessonId}`}>
                          <div className="inline-flex mt-2 text-xs text-primary hover:underline cursor-pointer">
                            &gt; VIEW_LESSON
                          </div>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary border-b border-border pb-2">QUICK_ACCESS</h2>
          <Link href="/modules">
            <div className="bg-card border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary group-hover:text-primary-foreground group-hover:bg-primary px-2 transition-colors">./modules</span>
                <TerminalIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Browse all learning paths and challenges.</p>
            </div>
          </Link>
          <Link href="/terminal">
             <div className="bg-card border border-border p-4 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary group-hover:text-primary-foreground group-hover:bg-primary px-2 transition-colors">./terminal</span>
                <TerminalIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Access the interactive shell playground.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
