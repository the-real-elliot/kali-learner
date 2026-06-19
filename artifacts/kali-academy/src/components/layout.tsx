import React from "react";
import { Link, useLocation } from "wouter";
import { Terminal, BookOpen, LayoutDashboard, TerminalSquare } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/modules", label: "Modules", icon: BookOpen },
    { href: "/terminal", label: "Terminal", icon: TerminalSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground crt overflow-hidden font-mono relative">
      {/* Scanline effect */}
      <div className="scanline" />

      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card flex flex-col z-10 relative">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <Terminal className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg tracking-wider">KALI_ACADEMY</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 ${isActive ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
          SYS.INFO: ONLINE<br/>
          ROOT ACCESS: GRANTED
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
