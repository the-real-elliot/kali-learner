import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OutputLine, LabEnv, MissionStep } from "@/lib/lab-scenarios";
import { handleGeneralCommand } from "@/lib/terminal-engine";

type Props = {
  env: LabEnv;
  steps: MissionStep[];
  completedSteps: Set<string>;
  onStepComplete: (stepId: string) => void;
  onClear?: () => void;
};

type Line = OutputLine & { id: number };

let lineCounter = 0;
function mkLine(l: OutputLine): Line {
  return { ...l, id: lineCounter++ };
}

const COLOR: Record<string, string> = {
  cmd: "text-white",
  out: "text-green-300/90",
  err: "text-red-400",
  success: "text-green-400 font-bold",
  info: "text-cyan-400",
  warn: "text-yellow-400",
  system: "text-green-600",
  blank: "",
};

export function InteractiveTerminal({ env, steps, completedSteps, onStepComplete }: Props) {
  const [lines, setLines] = useState<Line[]>([
    mkLine({ text: "┌──────────────────────────────────────────────┐", type: "system" }),
    mkLine({ text: `│  KALI ACADEMY LAB — ${env.os.padEnd(25)}│`, type: "system" }),
    mkLine({ text: `│  Target: ${env.targetIp.padEnd(16)} Domain: ${env.targetDomain.padEnd(12)}│`, type: "system" }),
    mkLine({ text: "│  Type 'help' to see available commands        │", type: "system" }),
    mkLine({ text: "└──────────────────────────────────────────────┘", type: "system" }),
    mkLine({ text: "", type: "blank" }),
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [cursor, setCursor] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Blink cursor
  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const prompt = `${env.user}@${env.hostname}:${env.currentDir.replace(/\/home\/hacker/, "~")}$ `;

  const addLines = useCallback((newLines: OutputLine[]) => {
    setLines(prev => [...prev, ...newLines.map(mkLine)]);
  }, []);

  const processCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;

    setIsProcessing(true);
    setHint(null);

    // Add the prompt+command line
    addLines([{ text: `${prompt}${cmd}`, type: "cmd" }]);

    // Small delay for realism
    await new Promise(r => setTimeout(r, 80 + Math.random() * 120));

    if (cmd === "clear") {
      setLines([]);
      setIsProcessing(false);
      return;
    }

    // First try scenario steps (current step only — ordered)
    const nextStep = steps.find(s => !completedSteps.has(s.id));
    let handled = false;

    if (nextStep && nextStep.validate(cmd.toLowerCase())) {
      // Correct command for this step!
      const output = nextStep.execute(cmd, env);
      await new Promise(r => setTimeout(r, 200));
      addLines(output);
      addLines([
        { text: "", type: "blank" },
        { text: `[✓] OBJECTIVE COMPLETE: ${nextStep.instruction}`, type: "success" },
        { text: "", type: "blank" },
      ]);
      onStepComplete(nextStep.id);
      handled = true;
    }

    if (!handled) {
      // Try general command handler
      const generalOutput = handleGeneralCommand(cmd, env);
      if (generalOutput !== null) {
        if (generalOutput.length > 0) {
          await new Promise(r => setTimeout(r, 50));
          addLines(generalOutput);
        }
        handled = true;
      }
    }

    if (!handled) {
      // Command looks valid but doesn't match the current step
      if (nextStep) {
        const wrongToolHint = getWrongToolHint(cmd, nextStep);
        if (wrongToolHint) {
          addLines([
            { text: `[Running ${cmd.split(" ")[0]}...]`, type: "system" },
            { text: "", type: "blank" },
            { text: wrongToolHint, type: "out" },
            { text: "", type: "blank" },
            { text: `[!] That's valid, but focus on the current objective: "${nextStep.instruction}"`, type: "warn" },
          ]);
        } else {
          // Unknown command
          addLines([{ text: `bash: ${cmd.split(" ")[0]}: command not found`, type: "err" }]);
        }
      } else {
        addLines([{ text: `bash: ${cmd.split(" ")[0]}: command not found`, type: "err" }]);
      }
    }

    addLines([{ text: "", type: "blank" }]);

    // Show hint after 2 failed attempts on same step
    if (!handled && nextStep && !nextStep.validate(cmd.toLowerCase())) {
      setHint(nextStep.hint);
    }

    setIsProcessing(false);
  }, [steps, completedSteps, env, prompt, addLines, onStepComplete]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (!input.trim() || isProcessing) return;
      const cmd = input;
      setHistory(h => [cmd, ...h.slice(0, 49)]);
      setHistIdx(-1);
      setInput("");
      processCommand(cmd);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      if (history[idx]) setInput(history[idx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : history[idx] ?? "");
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Basic tab completion
      const completions = ["nmap", "sqlmap", "hashcat", "msfconsole", "theHarvester",
        "subfinder", "dnsrecon", "whois", "nikto", "hydra", "john", "gobuster",
        "linpeas", "sudo -l", "curl", "cat", "ls", "whoami", "id", "find"];
      const match = completions.find(c => c.startsWith(input));
      if (match) setInput(match + " ");
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-black border border-primary/30 overflow-hidden font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-black border-b border-primary/20 flex-shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="text-xs text-green-600/80 ml-2">
          {env.user}@{env.hostname} — bash
        </span>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0 scroll-smooth" data-testid="lab-terminal-output">
        {lines.map(line => (
          <div key={line.id} className={`leading-5 ${line.type === "blank" ? "h-2" : ""}`}>
            {line.type !== "blank" && (
              <span className={COLOR[line.type] ?? "text-green-300"}>
                {line.type === "cmd" ? (
                  <span className="text-green-300">{line.text}</span>
                ) : (
                  line.text
                )}
              </span>
            )}
          </div>
        ))}

        {/* Input line */}
        {!isProcessing ? (
          <div className="flex items-center mt-1">
            <span className="text-green-500 select-none whitespace-pre">{prompt}</span>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                data-testid="lab-terminal-input"
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-white outline-none border-none caret-transparent"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="none"
              />
              <span
                className="absolute top-0 pointer-events-none text-white"
                style={{ left: `${input.length}ch` }}
              >
                <span className={`inline-block w-2 h-4 bg-green-400 ${cursor ? "opacity-100" : "opacity-0"} transition-opacity duration-100`} />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center mt-1 text-green-500">
            <span className="select-none">{prompt}</span>
            <span className="animate-pulse ml-1">▋</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Hint bar */}
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-4 py-2 bg-yellow-950/40 border-t border-yellow-700/40 text-yellow-400 text-xs"
          >
            <span className="text-yellow-600 mr-2">[HINT]</span>
            <span className="whitespace-pre-wrap">{hint}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Returns a plausible generic output for wrong-but-valid commands
function getWrongToolHint(cmd: string, step: MissionStep): string | null {
  const c = cmd.toLowerCase();
  const validLookingCmds = [
    "nmap", "sqlmap", "hashcat", "john", "hydra", "nikto", "gobuster",
    "msfconsole", "whois", "theHarvester", "theharvester", "subfinder",
    "dnsrecon", "dnsenum", "fierce", "enum4linux", "nc", "netcat",
    "searchsploit", "curl", "wget", "shodan", "hash-identifier", "hashid",
    "linpeas", "sudo", "find", "cat /etc",
  ];
  const isValidLooking = validLookingCmds.some(v => c.startsWith(v));
  if (!isValidLooking) return null;
  return `Command executed. Output noted.`;
}
