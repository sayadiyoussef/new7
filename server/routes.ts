import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { loginSchema, insertChatMessageSchema, insertChatChannelSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = "demo-token";
      res.json({ data: { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token } });
    } catch (e) {
      res.status(400).json({ message: "Invalid login payload" });
    }
  });

  // Oil grades
  app.get("/api/grades", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    res.json({ data: grades });
  });

  // Market
  app.get("/api/market/latest", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    const all = await storage.getAllMarketData();
    // prendre le dernier en date par grade
    const latestPerGrade = grades.map(g => {
      const items = all.filter(m => m.gradeId === g.id).sort((a,b) => a.date.localeCompare(b.date));
      return items[items.length - 1];
    }).filter(Boolean);
    res.json({ data: latestPerGrade });
  });

  
// Analytics: buying score & indicators for a grade

app.get("/api/analytics/buying-score/:id", async (req, res) => {

  const id = parseInt(req.params.id, 10);
  const items = (await storage.getMarketDataByGrade(id)).sort((a,b)=>a.date.localeCompare(b.date));
  if (!items.length) return res.status(404).json({ message: "No data for grade" });
  const { computeIndicators, computeBuyingScore } = await import("./analytics.js");
  const ind = computeIndicators(items);
  const result = computeBuyingScore(ind);
  const gradeName = items[0].gradeName;
  res.json({ data: { gradeId: id, gradeName, ...result } });
});

// Analytics: interpretations for a grade
app.get("/api/analytics/interpret/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const items = (await storage.getMarketDataByGrade(id)).sort((a,b)=>a.date.localeCompare(b.date));
  if (!items.length) return res.status(404).json({ message: "No data for grade" });
  const { computeIndicators, interpretIndicators } = await import("./analytics.js");
  const ind = computeIndicators(items);
  const notes = interpretIndicators(ind);
  const gradeName = items[0].gradeName;
  res.json({ data: { gradeId: id, gradeName, indicators: ind, notes } });
});

// Analytics: list for all grades (last value)
app.get("/api/analytics/buying-score", async (_req, res) => {
  const grades = await storage.getAllOilGrades();
  const all = await storage.getAllMarketData();
  const { computeIndicators, computeBuyingScore } = await import("./analytics.js");
  const out:any[] = [];
  for (const g of grades) {
    const ts = all.filter(m => m.gradeId===g.id).sort((a,b)=>a.date.localeCompare(b.date));
    if (ts.length) {
      const ind = computeIndicators(ts);
      const result = computeBuyingScore(ind);
      out.push({ gradeId: g.id, gradeName: g.name, ...result });
    }
  }
  res.json({ data: out });
});
app.get("/api/market/by-grade/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = await storage.getMarketDataByGrade(id);
    res.json({ data: items });
  });

  // Chat

// Chat Channels
app.get("/api/chat/channels", async (_req, res) => {
  const ch = await storage.getAllChatChannels();
  res.json({ data: ch });
});
app.post("/api/chat/channels", async (req, res) => {
  try {
    const { name } = insertChatChannelSchema.parse({ name: String(req.body?.name||'').trim() });
    const ch = await storage.createChatChannel({ name });
    res.json({ data: ch });
  } catch {
    res.status(400).json({ message: "Invalid channel payload" });
  }
});

// Chat (now channel-aware)
app.get("/api/chat", async (req, res) => {
  const channelId = String(req.query.channelId || "");
  let msgs;
  if (channelId) msgs = await storage.getChatMessagesByChannel(channelId);
  else msgs = await storage.getAllChatMessages();
  res.json({ data: msgs });
});

  app.post("/api/chat", async (req, res) => {
    try {
      const msg = insertChatMessageSchema.parse(req.body);
      const saved = await storage.createChatMessage(msg);
      res.json({ data: saved });
    } catch {
      res.status(400).json({ message: "Invalid message payload" });
    }
  });


  app.get("/api/fixings", async (_req, res) => {
    const rows = await storage.getAllFixings();
    res.json({ data: rows });
  });
  app.post("/api/fixings", async (req, res) => {
    const b = req.body||{};
    if (!b.date||!b.route||!b.grade||!b.volume||!b.priceUsd||!b.counterparty) return res.status(400).json({ message:"Missing required fields" });
    const saved = await storage.createFixing(b);
    res.json({ data: saved });
  });

  app.get("/api/vessels", async (_req, res) => {
    const rows = await storage.getAllVessels();
    res.json({ data: rows });
  });
  app.post("/api/vessels", async (req, res) => {
    const b = req.body||{};
    if (!b.name||!b.type||!b.dwt||!b.status) return res.status(400).json({ message:"Missing required fields" });
    const saved = await storage.createVessel(b);
    res.json({ data: saved });
  });

  app.get("/api/knowledge", async (_req, res) => {
    const rows = await storage.getAllKnowledge();
    res.json({ data: rows });
  });


// Market Intelligence (benchmarks, stocks, weather, logistics, politics)
app.get("/api/market/intel", async (_req, res) => {
  const { getMarketIntel } = await import("./market_intel.js");
  const data = await getMarketIntel();
  res.json({ data });
});

  app.post("/api/knowledge/upload", async (req, res) => {
    const { title, link, tags=[] } = req.body||{};
    if (!title||!link) return res.status(400).json({ message:"title and link are required" });
    const saved = await storage.createKnowledge({ title, tags, excerpt: link, content: link });
    res.json({ data: saved });
  });


  app.put("/api/fixings/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updated = await storage.updateFixing(id, req.body||{});
      res.json({ data: updated });
    } catch (e:any) {
      res.status(404).json({ message: e?.message || "Fixing not found" });
    }
  });

  app.delete("/api/fixings/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteFixing(id);
      res.json({ data: { id } });
    } catch {
      res.status(404).json({ message: "Fixing not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
