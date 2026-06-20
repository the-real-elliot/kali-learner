import { db } from "@workspace/db";
import { modulesTable, lessonsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding...");
  const [mod1] = await db.insert(modulesTable).values({
    title: "Kali Linux Basics", slug: "kali-basics",
    description: "Learn the fundamentals of Kali Linux.",
    difficulty: "beginner", category: "fundamentals", order: 1,
  }).returning();

  await db.insert(lessonsTable).values([
    { moduleId: mod1.id, title: "Introduction to Kali Linux", slug: "intro-to-kali", order: 1, duration: 15,
      content: "# Introduction to Kali Linux\n\nKali is a Debian-based distro for penetration testing.\n\n## Why Kali?\n- 600+ preinstalled tools\n- Built by Offensive Security\n- Industry standard",
      commands: [
        { command: "whoami", description: "Show current user", output: "kali" },
        { command: "uname -a", description: "Show system info", output: "Linux kali 6.x.x #1 SMP Debian..." },
      ],
    },
    { moduleId: mod1.id, title: "Linux Filesystem Navigation", slug: "filesystem-navigation", order: 2, duration: 20,
      content: "# Linux Filesystem\n\n## Key Directories\n- /etc — config files\n- /var/log — logs\n- /home — user files\n- /tmp — world-writable!",
      commands: [
        { command: "ls -la /", description: "List root", output: "drwxr-xr-x 23 root root 4096 ..." },
        { command: "cat /etc/passwd | head -3", description: "View users", output: "root:x:0:0:root:/root:/bin/bash" },
      ],
    },
  ]);

  const [mod2] = await db.insert(modulesTable).values({
    title: "Nmap & Reconnaissance", slug: "nmap-recon",
    description: "Master network scanning with Nmap.",
    difficulty: "beginner", category: "recon", order: 2,
  }).returning();

  await db.insert(lessonsTable).values([
    { moduleId: mod2.id, title: "Nmap Basics", slug: "nmap-basics", order: 1, duration: 25,
      content: "# Nmap — Network Mapper\n\n## Common Flags\n- -sS — SYN stealth scan\n- -sV — Service version\n- -O — OS detection\n- -A — All of above",
      commands: [
        { command: "nmap 192.168.1.1", description: "Basic scan", output: "PORT   STATE SERVICE\n22/tcp open  ssh\n80/tcp open  http" },
        { command: "nmap -sV 192.168.1.1", description: "Version scan", output: "22/tcp open ssh OpenSSH 8.9p1" },
        { command: "nmap -A -T4 192.168.1.1", description: "Aggressive scan", output: "OS: Linux 4.x", dangerous: true },
      ],
    },
  ]);

  console.log("Done!");
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
