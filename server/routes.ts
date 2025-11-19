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

  // ✅ Mettre à jour le Freight d’un grade (nombre en USD)
  app.put("/api/grades/:id/freight", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const freightUsd = Number(req.body?.freightUsd);
      if (!Number.isFinite(freightUsd)) {
        return res.status(400).json({ message: "freightUsd must be a number" });
      }
      // @ts-ignore - méthode ajoutée côté storage
      const updated = await storage.updateOilGradeFreight(id, freightUsd);
      res.json({ data: updated });
    } catch (e: any) {
      res.status(404).json({ message: e?.message || "Grade not found" });
    }
  });

  // ✅ Forwards pour un grade (Spot + M+1..M+6)
  app.get("/api/grades/:id/forwards", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);

      // Si storage expose une méthode dédiée, on l’utilise
      const maybeGet = (storage as any)?.getForwardPricesByGrade;
      if (typeof maybeGet === "function") {
        const rows = await maybeGet.call(storage, id);
        return res.json({ data: rows });
      }

      // Fallback: on génère une petite courbe forward à partir du dernier spot
      const series = (await storage.getMarketDataByGrade(id)).sort(
        (a: any, b: any) => a.date.localeCompare(b.date)
      );
      if (!series.length) return res.status(404).json({ message: "No market data for grade" });

      const spot = series[series.length - 1];
      const base = Number(spot.priceUsd);
      const out: Array<{ gradeId:number; gradeName:string; period:string; code:string; askPrice:number }> = [];

      const monthAbbr = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
      const today = new Date();

      for (let i = 1; i <= 6; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + i);
        const m = monthAbbr[d.getMonth()];
        const y = (d.getFullYear() % 100).toString().padStart(2, "0");
        const period = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        const code = `${m}${y}`;
        const ask = Math.round((base * (1 + 0.0025 * i) + 5 * i) * 100) / 100;
        out.push({ gradeId: id, gradeName: spot.gradeName, period, code, askPrice: ask });
      }

      res.json({ data: out });
    } catch (e) {
      res.status(500).json({ message: "Failed to compute forwards" });
    }
  });

  // Market
  app.get("/api/market/latest", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    const all = await storage.getAllMarketData();
    const latestPerGrade = grades
      .map(g => {
        const items = all.filter(m => m.gradeId === g.id).sort((a,b) => a.date.localeCompare(b.date));
        return items[items.length - 1];
      })
      .filter(Boolean);
    res.json({ data: latestPerGrade });
  });

  app.get("/api/market/by-grade/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = await storage.getMarketDataByGrade(id);
    res.json({ data: items });
  });

  // Analytics
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

  // Chat
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

  // Fixings
  app.get("/api/fixings", async (_req, res) => {
    const rows = await storage.getAllFixings();
    res.json({ data: rows });
  });

  app.post("/api/fixings", async (req, res) => {
    const b = req.body||{};
    if (!b.date||!b.route||!b.grade||!b.volume||!b.priceUsd||!b.counterparty) {
      return res.status(400).json({ message:"Missing required fields" });
    }
    const saved = await storage.createFixing(b);
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

  // Vessels
  app.get("/api/vessels", async (_req, res) => {
    const rows = await storage.getAllVessels();
    res.json({ data: rows });
  });

  app.post("/api/vessels", async (req, res) => {
    const b = req.body||{};
    if (!b.name||!b.type||!b.dwt||!b.status) {
      return res.status(400).json({ message:"Missing required fields" });
    }
    const saved = await storage.createVessel(b);
    res.json({ data: saved });
  });

  app.put("/api/vessels/:id", async (req, res) => {
    try {
      const updated = await storage.updateVessel(req.params.id, req.body||{});
      res.json({ data: updated });
    } catch (e:any) {
      res.status(404).json({ message: e?.message || "Vessel not found" });
    }
  });

  app.delete("/api/vessels/:id", async (req, res) => {
    try {
      await storage.deleteVessel(req.params.id);
      res.json({ data: { id: req.params.id } });
    } catch {
      res.status(404).json({ message: "Vessel not found" });
    }
  });

  // Knowledge
  app.get("/api/knowledge", async (_req, res) => {
    const rows = await storage.getAllKnowledge();
    res.json({ data: rows });
  });

  // Market Intelligence
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

  // ✅ JSON 404 pour toute route /api/* inconnue (évite de renvoyer index.html)
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
