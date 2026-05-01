import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cron from "node-cron";
import { visitTarget } from "./src/lib/visitor";
import { collection, query, orderBy, limit, getDocs, where, addDoc } from "firebase/firestore";
import { db } from "./src/lib/firebase";

// State to hold today's planned visits
let todayVisits: number[] = [];

async function planDailyVisits() {
  console.log("[Scheduler] Planning daily visits...");
  const visits = [];
  for (let i = 0; i < 3; i++) {
    // Pick a random minute in the 24h day (0 to 1439)
    const randomMinute = Math.floor(Math.random() * 1440);
    visits.push(randomMinute);
  }
  todayVisits = visits.sort((a, b) => a - b);
  console.log(`[Scheduler] Planned visits at (minutes from midnight): ${todayVisits.join(", ")}`);
}

async function checkAndRunVisitor() {
  const now = new Date();
  const currentMinute = now.getHours() * 60 + now.getMinutes();

  if (now.getHours() === 0 && now.getMinutes() === 0) {
    await planDailyVisits();
  }

  // If today's visits haven't been planned (e.g. server started mid-day)
  if (todayVisits.length === 0) {
    await planDailyVisits();
  }

  // Check if current minute matches any planned visit
  if (todayVisits.includes(currentMinute)) {
    console.log(`[Scheduler] Time matches planned visit (${currentMinute}). Executing...`);
    // Remove this minute so we don't double-trigger if the check runs faster than a minute
    todayVisits = todayVisits.filter(m => m !== currentMinute);
    await visitTarget();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Plan visits immediately on start
  await planDailyVisits();

  // Run scheduler every minute
  cron.schedule("* * * * *", () => {
    checkAndRunVisitor().catch(err => console.error("[Scheduler Error]", err));
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/visit/now", async (req, res) => {
    try {
      await visitTarget();
      res.json({ status: "initiated" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/plan", (req, res) => {
    res.json({ plannedMinutes: todayVisits });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
