import type { OutputLine, LabEnv } from "./lab-scenarios";

function out(text: string): OutputLine { return { text, type: "out" }; }
function err(text: string): OutputLine { return { text, type: "err" }; }
function info(text: string): OutputLine { return { text, type: "info" }; }
function sys(text: string): OutputLine { return { text, type: "system" }; }
function blank(): OutputLine { return { text: "", type: "blank" }; }

function lines(raw: string, type: OutputLine["type"] = "out"): OutputLine[] {
  return raw.split("\n").map(t =>
    t.trim() === "" ? blank() : { text: t, type }
  );
}

// General-purpose command handler — handles basic shell + network commands
// Returns null if the command should be handled by the scenario engine instead
export function handleGeneralCommand(input: string, env: LabEnv): OutputLine[] | null {
  const raw = input.trim();
  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "clear":
      return []; // special — caller should clear lines

    case "help": case "?":
      return [
        sys("┌─ KALI ACADEMY LAB HELP ──────────────────────────────────────┐"),
        sys("│ General Commands:                                             │"),
        sys("│  help | ls | pwd | whoami | id | uname -a | env | ps aux    │"),
        sys("│  cat <file> | echo <text> | clear | history                 │"),
        sys("│                                                               │"),
        sys("│ Network & Recon:                                              │"),
        sys("│  nmap | whois | theHarvester | subfinder | dnsrecon         │"),
        sys("│  dnsenum | netdiscover | arp-scan | curl | wget             │"),
        sys("│                                                               │"),
        sys("│ Web & Exploitation:                                           │"),
        sys("│  nikto | gobuster | sqlmap | searchsploit | msfconsole      │"),
        sys("│                                                               │"),
        sys("│ Password:                                                     │"),
        sys("│  hashcat | john | hydra | hash-identifier | hashid          │"),
        sys("│                                                               │"),
        sys("│ Post-Exploitation:                                            │"),
        sys("│  sudo -l | find | linpeas | nc | cat /etc/passwd            │"),
        sys("│                                                               │"),
        sys("│ TIP: Look at the MISSION PANEL on the left for your tasks.  │"),
        sys("└──────────────────────────────────────────────────────────────┘"),
      ];

    case "whoami":
      return [out(env.user)];

    case "id":
      return env.user === "root"
        ? [out("uid=0(root) gid=0(root) groups=0(root)")]
        : env.user === "www-data"
        ? [out("uid=33(www-data) gid=33(www-data) groups=33(www-data)")]
        : [out(`uid=1000(${env.user}) gid=1000(${env.user}) groups=1000(${env.user}),27(sudo)`)];

    case "pwd":
      return [out(env.currentDir)];

    case "hostname":
      return [out(env.hostname)];

    case "uname":
      if (args.includes("-a") || args.includes("-r")) {
        return [out("Linux " + env.hostname + " 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 GNU/Linux")];
      }
      return [out("Linux")];

    case "ls":
      if (env.currentDir.includes("/etc")) {
        return lines("passwd  shadow  hosts  hostname  fstab  crontab  sudoers  resolv.conf");
      }
      return lines(`notes.txt  hashes.txt  wordlists/  tools/  report.md
drwxr-xr-x  tools/
drwxr-xr-x  wordlists/
-rw-r--r--  hashes.txt
-rw-r--r--  notes.txt
-rw-r--r--  report.md`);

    case "cat":
      if (!args.length) return [err("cat: missing operand")];
      const file = args.join(" ").replace(/^\/home\/hacker\//, "");
      if (file === "notes.txt" || file === "report.md") {
        return [
          sys("=== RECON NOTES ==="),
          blank(),
          info(`Target: ${env.targetDomain} (${env.targetIp})`),
          info("Status: Active engagement"),
          blank(),
          out("Findings:"),
          out("  - WHOIS data gathered"),
          out("  - DNS records enumerated"),
          out("  - Subdomains discovered"),
          blank(),
          out("Next steps: Network scan → Service enum → Exploitation"),
        ];
      }
      if (file === "hashes.txt") {
        return lines(`5f4dcc3b5aa765d61d8327deb882cf99
482c811da5d5b4bc6d497ffa98491e38
7c222fb2927d828af22f592134e8932480637c0d
e10adc3949ba59abbe56e057f20f883e
8afa847f50a716e64932d995c8e7435a`);
      }
      if (file.includes("/etc/passwd")) {
        return lines(`root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
john:x:1000:1000:John Crawford:/home/john:/bin/bash`);
      }
      if (file.includes("/etc/shadow")) {
        return env.user === "root"
          ? lines("root:$6$aaaaaa$HASHxHERExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:18000:0:99999:7:::")
          : [err("cat: /etc/shadow: Permission denied")];
      }
      return [err(`cat: ${args.join(" ")}: No such file or directory`)];

    case "echo":
      return [out(args.join(" ").replace(/^['"]|['"]$/g, ""))];

    case "env":
      return lines(`HOME=/home/${env.user}
USER=${env.user}
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
TERM=xterm-256color
LANG=en_US.UTF-8`);

    case "ps":
      return lines(`USER       PID  %CPU %MEM    VSZ   RSS COMMAND
root         1   0.0  0.1  22572  2344 /sbin/init
root       623   0.0  0.2  29576  4500 sshd: /usr/sbin/sshd -D
www-data  1024   0.1  1.2 365800 25000 /usr/sbin/apache2
root      1102   0.0  0.3  14572  6844 /usr/sbin/cron
mysql     2048   0.2  4.5 1432000 90000 /usr/sbin/mysqld`);

    case "netstat": case "ss":
      return lines(`Proto Recv-Q Send-Q Local Address    Foreign Address   State
tcp        0      0 0.0.0.0:22      0.0.0.0:*         LISTEN
tcp        0      0 0.0.0.0:80      0.0.0.0:*         LISTEN
tcp        0      0 0.0.0.0:443     0.0.0.0:*         LISTEN
tcp        0      0 127.0.0.1:3306  0.0.0.0:*         LISTEN
tcp        0      0 127.0.0.1:6379  0.0.0.0:*         LISTEN`);

    case "history":
      return lines(`  1  nmap -sn 10.10.10.0/24
  2  nmap -sV -sC 10.10.10.50
  3  theHarvester -d megacorp.local -b google
  4  whois megacorp.local
  5  sqlmap -u 'http://10.10.10.50/item?id=1' --dbs`);

    case "sudo":
      if (args[0] === "-l") {
        return lines(`Matching Defaults entries for ${env.user}:
    env_reset, mail_badpass

User ${env.user} may run the following commands:
    (ALL : ALL) NOPASSWD: /usr/bin/vim`);
      }
      if (args[0] === "vim" || args.join(" ").startsWith("vim")) {
        return [
          sys("[sudo] escalating to root via vim..."),
          blank(),
          out("root@" + env.hostname + ":/# whoami"),
          out("root"),
        ];
      }
      if (env.user !== "root") {
        return [err(`[sudo] password for ${env.user}: `)];
      }
      return null;

    case "find":
      if (raw.includes("-perm") && raw.includes("suid")) {
        return lines(`/usr/bin/find
/usr/bin/vim
/usr/bin/python3.6
/usr/bin/passwd
/usr/bin/su
/usr/bin/sudo
/usr/bin/mount`);
      }
      if (args[0] === "/" && raw.includes("-name")) {
        const name = args[args.indexOf("-name") + 1] ?? "*";
        return [out(`/var/www/html/${name}`), out(`/tmp/${name}`)];
      }
      return [err("find: missing argument to '-exec'")];

    case "nc": case "netcat":
      if (raw.includes("-lvnp") || raw.includes("-lvp")) {
        const port = raw.match(/\d{4,5}/)?.[0] ?? "4444";
        return [
          info(`Listening on 0.0.0.0:${port}`),
          blank(),
          info("Waiting for connection... (this is simulated — use this for reverse shells in real Kali)"),
        ];
      }
      return null;

    case "ping":
      const target = args[0] ?? env.targetIp;
      return lines(`PING ${target} (${target}) 56(84) bytes of data.
64 bytes from ${target}: icmp_seq=1 ttl=64 time=1.23 ms
64 bytes from ${target}: icmp_seq=2 ttl=64 time=0.98 ms
64 bytes from ${target}: icmp_seq=3 ttl=64 time=1.05 ms

--- ${target} ping statistics ---
3 packets transmitted, 3 received, 0% packet loss
rtt min/avg/max/mdev = 0.98/1.08/1.23/0.105 ms`);

    case "wget":
      return [
        info(`--2024-01-15 14:32:01--  ${args[0] ?? "http://example.com"}`),
        out("Resolving..."),
        out("Connecting..."),
        out("HTTP request sent, awaiting response... 200 OK"),
        out("Saving to: '" + (args[0]?.split("/").pop() ?? "file") + "'"),
        blank(),
        out("file saved."),
      ];

    case "searchsploit":
      return [
        sys("Exploit Database — searchsploit v7.4.3"),
        blank(),
        ...lines(`--------------------------------------------------------------
 Exploit Title                              |  Path
--------------------------------------------------------------
Apache Tomcat 9.x - AJP Request RCE        | java/remote/48143.py
Apache Tomcat Manager - Authenticated WAR  | java/remote/31433.py  
MySQL 5.7 - Privilege Escalation           | linux/local/45890.sh
OpenSSH < 7.7 - Username Enumeration       | linux/remote/45233.py
--------------------------------------------------------------`),
      ];

    case "ssh":
      return [
        info(`Attempting SSH to ${args[args.length - 1] ?? env.targetIp}...`),
        out("The authenticity of host can't be established."),
        out("Are you sure you want to continue connecting (yes/no)? yes"),
        out("Permission denied (publickey,password)."),
      ];

    case "curl":
      if (raw.includes("linpeas")) {
        return null; // let scenario handle it
      }
      const url = args.find(a => a.startsWith("http")) ?? "http://" + env.targetIp;
      return [
        ...lines(`<!DOCTYPE html>
<html>
<head><title>MegaCorp Industries — Internal Portal</title></head>
<body>
  <h1>Welcome to MegaCorp Portal</h1>
  <p>Please <a href="/login">login</a> to continue.</p>
  <!-- TODO: remove debug endpoint /api/debug before deploy -->
</body>
</html>`),
      ];

    case "python3": case "python":
      if (raw.includes("-c") && raw.includes("import pty")) {
        return [out("$ "), info("Interactive PTY spawned")];
      }
      return [info("Python 3.10.12 — type 'exit()' to quit"), out(">>> ")];

    case "cd":
      return []; // silently succeed

    case "export": case "set":
      return [];

    case "":
      return [];

    default:
      // Check if it looks like a command that belongs to a scenario
      const scenarioCmds = [
        "whois", "theharvester", "subfinder", "dnsrecon", "dnsenum", "fierce",
        "nmap", "nikto", "gobuster", "sqlmap", "hashcat", "john", "hydra",
        "msfconsole", "shodan", "hash-identifier", "hashid", "linpeas",
        "enum4linux", "netdiscover", "arp-scan", "smbclient", "rpcclient",
      ];
      if (scenarioCmds.some(sc => cmd.startsWith(sc))) {
        return null; // pass to scenario engine
      }
      return [err(`bash: ${cmd}: command not found`)];
  }
}
