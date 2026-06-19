import type { OutputLine, LabEnv } from "./lab-scenarios";

function out(text: string): OutputLine { return { text, type: "out" }; }
function ok(text: string): OutputLine { return { text, type: "success" }; }
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
        sys("┌─ KALI ACADEMY LAB HELP ───────────────────────────────────────┐"),
        sys("│ General Commands:                                              │"),
        sys("│  help | ls | pwd | whoami | id | uname -a | env | history    │"),
        sys("│  cat <file> | echo <text> | clear | file | strings | binwalk │"),
        sys("│                                                                │"),
        sys("│ Network & Recon:                                               │"),
        sys("│  nmap | whois | theHarvester | subfinder | dnsrecon | shodan  │"),
        sys("│  dnsenum | netdiscover | arp-scan | curl | wget | ping        │"),
        sys("│  recon-ng | amass | cewl | exiftool | metagoofil              │"),
        sys("│                                                                │"),
        sys("│ Web & Exploitation:                                            │"),
        sys("│  nikto | gobuster | sqlmap | msfconsole | msfvenom            │"),
        sys("│  searchsploit | git-dumper | redis-cli | crackmapexec         │"),
        sys("│                                                                │"),
        sys("│ Password & Brute Force:                                       │"),
        sys("│  hashcat | john | hydra | crunch | medusa                    │"),
        sys("│                                                                │"),
        sys("│ Post-Exploitation:                                             │"),
        sys("│  sudo -l | find | linpeas | nc | ssh | enum4linux             │"),
        sys("│  python3 | gdb | ghidra | binwalk                            │"),
        sys("│                                                                │"),
        sys("│ TIP: Look at the MISSION PANEL on the left for your tasks.   │"),
        sys("└───────────────────────────────────────────────────────────────┘"),
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

    case "file":
      if (!args.length) return [err("file: missing operand")];
      return [out(`${args[0]}: ELF 64-bit LSB executable, x86-64, dynamically linked, not stripped`)];

    case "strings":
      if (!args.length) return [err("strings: missing argument")];
      return [
        ...lines(`Extracting strings from ${args[0]}...

/lib/x86_64-linux-gnu/libc.so.6
GLIBC_2.2.5
Enter password:
Access Granted!
Wrong password!
Tr0ub4dor&3
http://c2.example.com/check
/tmp/.hidden_cache
admin123`),
        blank(),
        info("[*] Tip: pipe through grep for targeted extraction: strings binary | grep -i pass"),
      ];

    case "binwalk":
      if (!args.length) return [err("binwalk: must specify file(s)")];
      return [
        ...lines(`DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             ELF, 64-bit LSB executable, AMD x86-64
51200         0xC800          Zlib compressed data
102400        0x19000         LZMA compressed data
204800        0x32000         Squashfs filesystem, little endian, version 4.0`),
        blank(),
        info("[*] Use -e flag to extract: binwalk -e " + (args[0] ?? "target")),
      ];

    case "exiftool":
      if (!args.length) return [err("exiftool: need to specify a file")];
      return [
        ...lines(`ExifTool Version Number         : 12.67
File Name                       : ${args[0]}
Author                          : John Crawford
Creator                         : Microsoft Word 2016
Last Modified By                : sarah.chen
Company                         : MegaCorp Industries
Create Date                     : 2023-11-14 09:22:18
GPS Latitude                    : 51 deg 30' 26.39" N
GPS Longitude                   : 0 deg  7' 39.87" W`),
        blank(),
        ok("[+] Author and GPS coordinates extracted from metadata!"),
      ];

    case "redis-cli":
      if (args.includes("KEYS") || args.includes("keys")) {
        return [
          out("1) \"admin_password\""),
          out("2) \"session:a3f9d2\""),
          out("3) \"api_token:webhook\""),
          out("4) \"user:j.crawford\""),
        ];
      }
      if (args.includes("PING") || args.includes("ping")) {
        return [out("+PONG"), blank(), ok("[+] Redis responds — no auth required!")];
      }
      if (args.includes("CONFIG") || args.includes("config")) {
        return [out("+OK")];
      }
      return null; // pass to scenario

    case "cewl":
      if (!args.length) return [err("cewl: target URL required")];
      return [
        sys("CeWL 6.1 — Custom Word List Generator"),
        info(`[*] Spidering ${args[0]}...`),
        blank(),
        ...lines(`Pages spidered: 23
Unique words: 412
Words >= 6 chars: 187

Sample words: MegaCorp, Industries, Sentinel, Phoenix, Manchester, Security`),
        blank(),
        ok("[+] Wordlist generated! Use with: hydra -l user -P megacorp-words.txt ssh://target"),
      ];

    case "hydra":
      return null; // always pass to scenario

    case "crackmapexec":
      if (raw.includes("--pass-pol")) {
        return [
          ...lines(`SMB  ${env.targetIp}  445  DC01  [*] Windows Server 2019
SMB  ${env.targetIp}  445  DC01  [+] megacorp.local

Password Info for Domain: MEGACORP
  Minimum password length: 8
  Account Lockout Threshold: 5 attempts
  Account Lockout Window: 30 minutes

[!] SAFE to spray: try at most 4 passwords per account`),
        ];
      }
      return null; // pass to scenario

    case "crunch":
      if (args.length < 2) return [err("crunch: min/max length required")];
      return [
        info(`Crunch will generate ${args[2] ?? "custom"} wordlist...`),
        out(`Length range: ${args[0]}-${args[1]} chars`),
        out("Generating..."),
        blank(),
        out("MegaCorp00aa"),
        out("MegaCorp00ab"),
        out("MegaCorp00ac"),
        blank(),
        out("Total passwords: 6,760,000"),
        ok("[+] Wordlist complete. Pipe to hydra or save with -o flag."),
      ];

    case "recon-ng":
      return [
        sys("Recon-ng v5.1.2 — Full-featured web reconnaissance framework"),
        blank(),
        out("    _/_/_/    _/_/_/_/    _/_/_/    _/_/_/  "),
        out("   _/    _/  _/        _/        _/    _/  "),
        out("  _/_/_/    _/_/_/    _/        _/    _/  "),
        blank(),
        info("[recon-ng][default] > "),
        blank(),
        info("[*] Type: workspaces create <name> to start a new engagement"),
        info("[*] Type: marketplace search to find modules"),
      ];

    case "amass":
      return null; // pass to scenario

    case "msfvenom":
      return null; // always pass to scenario

    case "git-dumper":
      return null; // pass to scenario

    case "enum4linux":
    case "enum4linux-ng":
      return null; // pass to scenario

    case "ghidra":
      return [
        sys("Ghidra 10.4 — Software Reverse Engineering Framework"),
        blank(),
        info("[*] Starting Ghidra GUI..."),
        info("[*] For headless analysis: ghidraRun --headless /tmp/project name -import ./binary"),
        blank(),
        out("GUI mode requires display. In this lab, use the decompiler output shown in lesson examples."),
      ];

    case "gdb":
      return [
        sys("GNU gdb (Ubuntu) 12.1"),
        info("[*] For pwndbg enhanced output: run in real Kali Linux"),
        blank(),
        ...lines(`(gdb) break main
Breakpoint 1 at 0x401180
(gdb) run
Starting program...
Breakpoint 1, 0x0000000000401180 in main ()
(gdb) info registers rax rbx rsp rbp
rax  0x0  0
rbx  0x0  0
rsp  0x7fffffffe4b0  0x7fffffffe4b0
rbp  0x7fffffffe4c0  0x7fffffffe4c0`),
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
        "crackmapexec", "msfvenom", "git-dumper", "amass", "recon-ng",
        "kerbrute", "medusa", "wfuzz", "dirb", "dirbuster", "ffuf",
        "setoolkit", "gophish", "objdump", "readelf", "ltrace", "strace",
        "radare2", "r2", "pwntools", "linux2username", "metagoofil",
        "certutil", "impacket", "psexec", "wmiexec", "smbexec",
      ];
      if (scenarioCmds.some(sc => cmd.startsWith(sc))) {
        return null; // pass to scenario engine
      }
      return [err(`bash: ${cmd}: command not found`)];
  }
}
