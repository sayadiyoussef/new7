import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import {
  loginSchema,
  insertChatMessageSchema,
  insertChatChannelSchema,
  insertProductSchema,
  // on évite d'importer des ZodEffects (.transform) pour .omit/.partial ici
  // insertClientSchema,
  // insertContractSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  /* ---------------- Auth ---------------- */
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = "demo-token";
      res.json({
        data: {
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          token,
        },
      });
    } catch {
      res.status(400).json({ message: "Invalid login payload" });
    }
  });

  /* --------------- Oil Grades --------------- */
  app.get("/api/grades", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    res.json({ data: grades });
  });

  app.get("/api/grades/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const g = await storage.getOilGrade(id);
    if (!g) return res.status(404).json({ message: "Grade not found" });
    res.json({ data: g });
  });

  app.post("/api/grades", async (req, res) => {
    try {
      const b = req.body || {};
      if (!b.name || typeof b.name !== "string") {
        return res.status(400).json({ message: "name is required" });
      }
      const created = await storage.createOilGrade({
        name: String(b.name).trim(),
        region: b.region ? String(b.region) : undefined,
        ffa: b.ffa ? String(b.ffa) : undefined,
        moisture: b.moisture ? String(b.moisture) : undefined,
        iv: b.iv ? String(b.iv) : undefined,
        dobi: b.dobi ? String(b.dobi) : undefined,
        // @ts-ignore
        freightUsd: b.freightUsd !== undefined ? Number(b.freightUsd) : undefined,
      } as any);
      res.json({ data: created });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Failed to create grade" });
    }
  });

  app.put("/api/grades/:id/freight", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const freightUsd = Number(req.body?.freightUsd);
      if (!Number.isFinite(freightUsd)) {
        return res.status(400).json({ message: "freightUsd must be a number" });
      }
      const updated = await storage.updateOilGradeFreight(id, freightUsd);
      res.json({ data: updated });
    } catch (e: any) {
      res.status(404).json({ message: e?.message || "Grade not found" });
    }
  });

  app.put("/api/grades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const b = req.body || {};
      const patch: any = {};
      if (b.name !== undefined) patch.name = String(b.name).trim();
      if (b.region !== undefined) patch.region = b.region === "" ? undefined : String(b.region);
      if (b.ffa !== undefined) patch.ffa = b.ffa === "" ? undefined : String(b.ffa);
      if (b.moisture !== undefined) patch.moisture = b.moisture === "" ? undefined : String(b.moisture);
      if (b.iv !== undefined) patch.iv = b.iv === "" ? undefined : String(b.iv);
      if (b.dobi !== undefined) patch.dobi = b.dobi === "" ? undefined : String(b.dobi);
      if (b.freightUsd !== undefined) {
        if (b.freightUsd === "" || b.freightUsd === null) patch.freightUsd = undefined;
        else {
          const n = Number(b.freightUsd);
          if (!Number.isFinite(n)) return res.status(400).json({ message: "freightUsd must be a number" });
          patch.freightUsd = n;
        }
      }
      const maybeUpdate = (storage as any)?.updateOilGrade;
      let updated;
      if (typeof maybeUpdate === "function") {
        updated = await maybeUpdate.call(storage, id, patch);
      } else {
        if ("freightUsd" in patch && Object.keys(patch).length === 1) {
          updated = await storage.updateOilGradeFreight(id, patch.freightUsd);
        } else {
          return res.status(501).json({ message: "Generic grade update not supported by storage" });
        }
      }
      res.json({ data: updated });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Failed to update grade" });
    }
  });

  // Forwards pour un grade
  app.get("/api/grades/:id/forwards", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const maybeGet = (storage as any)?.getForwardPricesByGrade;
      if (typeof maybeGet === "function") {
        const rows = await maybeGet.call(storage, id);
        return res.json({ data: rows });
      }
      const series = (await storage.getMarketDataByGrade(id)).sort((a: any, b: any) => a.date.localeCompare(b.date));
      if (!series.length) return res.status(404).json({ message: "No market data for grade" });

      const spot = series[series.length - 1];
      const base = Number(spot.priceUsd);
      const out: Array<{ gradeId: number; gradeName: string; period: string; code: string; askPrice: number }> = [];
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
    } catch {
      res.status(500).json({ message: "Failed to compute forwards" });
    }
  });

  /* --------------- Market --------------- */
  app.get("/api/market/latest", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    const all = await storage.getAllMarketData();
    const latestPerGrade = grades
      .map(g => {
        const items = all.filter(m => m.gradeId === g.id).sort((a, b) => a.date.localeCompare(b.date));
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

  /* --------------- Analytics --------------- */
  app.get("/api/analytics/buying-score/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = (await storage.getMarketDataByGrade(id)).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) return res.status(404).json({ message: "No data for grade" });
    const { computeIndicators, computeBuyingScore } = await import("./analytics.js");
    const ind = computeIndicators(items);
    const result = computeBuyingScore(ind);
    const gradeName = items[0].gradeName;
    res.json({ data: { gradeId: id, gradeName, ...result } });
  });

  app.get("/api/analytics/interpret/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = (await storage.getMarketDataByGrade(id)).sort((a, b) => a.date.localeCompare(b.date));
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
    const out: any[] = [];
    for (const g of grades) {
      const ts = all.filter(m => m.gradeId === g.id).sort((a, b) => a.date.localeCompare(b.date));
      if (ts.length) {
        const ind = computeIndicators(ts);
        const result = computeBuyingScore(ind);
        out.push({ gradeId: g.id, gradeName: g.name, ...result });
      }
    }
    res.json({ data: out });
  });

  /* --------------- Chat --------------- */
  app.get("/api/chat/channels", async (_req, res) => {
    const ch = await storage.getAllChatChannels();
    res.json({ data: ch });
  });

  app.post("/api/chat/channels", async (req, res) => {
    try {
      const { name } = insertChatChannelSchema.parse({ name: String(req.body?.name || "").trim() });
      const ch = await storage.createChatChannel({ name });
      res.json({ data: ch });
    } catch {
      res.status(400).json({ message: "Invalid channel payload" });
    }
  });

  app.get("/api/chat", async (req, res) => {
    const channelId = String(req.query.channelId || "");
    const msgs = channelId
      ? await storage.getChatMessagesByChannel(channelId)
      : await storage.getAllChatMessages();
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

  /* --------------- Fixings --------------- */
  app.get("/api/fixings", async (_req, res) => {
    const rows = await storage.getAllFixings();
    res.json({ data: rows });
  });

  app.post("/api/fixings", async (req, res) => {
    const b = req.body || {};
    if (!b.date || !b.route || !b.grade || !b.volume || !b.priceUsd || !b.counterparty) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const saved = await storage.createFixing(b);
    res.json({ data: saved });
  });

  app.put("/api/fixings/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const updated = await storage.updateFixing(id, req.body || {});
      res.json({ data: updated });
    } catch (e: any) {
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

  /* --------------- Vessels --------------- */
  app.get("/api/vessels", async (_req, res) => {
    const rows = await storage.getAllVessels();
    res.json({ data: rows });
  });

  app.post("/api/vessels", async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name ?? "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });

    // Valeurs par défaut si non fournis depuis l’UI
    const payload = {
      name,
      type: b.type ?? "Tanker",
      dwt: b.dwt ?? 0,                // laissé à 0 si vide
      status: b.status ?? "Planned",
      eta: b.eta ?? undefined,
      origin: b.origin ?? undefined,
      destination: b.destination ?? undefined,
      // si tu ajoutes de nouveaux champs plus tard, ils ne bloqueront pas
    };

    const saved = await storage.createVessel(payload);
    res.json({ data: saved });
  } catch (e: any) {
    res.status(400).json({ message: e?.message || "Failed to create vessel" });
  }
});


  app.put("/api/vessels/:id", async (req, res) => {
    try {
      const updated = await storage.updateVessel(req.params.id, req.body || {});
      res.json({ data: updated });
    } catch (e: any) {
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

  /* --------------- Knowledge & Intel --------------- */
  app.get("/api/knowledge", async (_req, res) => {
    const rows = await storage.getAllKnowledge();
    res.json({ data: rows });
  });

  app.get("/api/market/intel", async (_req, res) => {
    const { getMarketIntel } = await import("./market_intel.js");
    const data = await getMarketIntel();
    res.json({ data });
  });

  app.post("/api/knowledge/upload", async (req, res) => {
    const { title, link, tags = [] } = req.body || {};
    if (!title || !link) return res.status(400).json({ message: "title and link are required" });
    const saved = await storage.createKnowledge({ title, tags, excerpt: link, content: link });
    res.json({ data: saved });
  });

  /* ----------------- Produits API ----------------- */
  app.get("/api/products", async (_req, res) => {
    const rows = await storage.getAllProducts();
    res.json({ data: rows });
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, reference, composition } = insertProductSchema.parse(req.body);
      const saved = await storage.createProduct({ name, reference, composition });
      res.json({ data: saved });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Invalid product payload" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const { name, reference, composition } = insertProductSchema.partial().parse(req.body || {});
      const saved = await storage.updateProduct(id, { name, reference, composition } as any);
      res.json({ data: saved });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      await storage.deleteProduct(id);
      res.json({ data: { id } });
    } catch {
      res.status(404).json({ message: "Product not found" });
    }
  });

  /* ----------------- Clients API ----------------- */
  app.get("/api/clients", async (_req, res) => {
    const rows = await storage.getAllClients();
    res.json({ data: rows });
  });

  // Normalisation manuelle: accepte { terms } ou { paymentTerms } et mappe vers storage (terms)
  app.post("/api/clients", async (req, res) => {
    try {
      const b = req.body || {};
      const market = b.market === "EXPORT" ? "EXPORT" : "LOCAL";
      const name = String(b.name ?? "").trim();
      const terms = String(b.terms ?? b.paymentTerms ?? "").trim();

      if (!name) return res.status(400).json({ message: "name is required" });
      if (!terms) return res.status(400).json({ message: "terms/paymentTerms is required" });

      const payload = {
        market,
        name,
        terms,
        contactName: b.contactName ? String(b.contactName) : undefined,
        email: b.email ? String(b.email) : undefined,
        phone: b.phone ? String(b.phone) : undefined,
        address: b.address ? String(b.address) : undefined,
        city: b.city ? String(b.city) : undefined,
        country: b.country ? String(b.country) : undefined,
        taxId: b.taxId ? String(b.taxId) : undefined,
        incoterm: b.incoterm ? String(b.incoterm) : undefined,
        notes: b.notes ? String(b.notes) : undefined,
      };
      const saved = await storage.createClient(payload as any);
      res.json({ data: saved });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Invalid client payload" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const b = req.body || {};

      const patch: any = {};
      if (b.name !== undefined) patch.name = String(b.name).trim();
      if (b.market !== undefined) patch.market = b.market === "EXPORT" ? "EXPORT" : "LOCAL";
      // normalise terms
      if (b.terms !== undefined || b.paymentTerms !== undefined) {
        const v = String(b.terms ?? b.paymentTerms ?? "").trim();
        if (!v) return res.status(400).json({ message: "terms/paymentTerms cannot be empty" });
        patch.terms = v;
      }
      if (b.contactName !== undefined) patch.contactName = b.contactName ? String(b.contactName) : undefined;
      if (b.email !== undefined) patch.email = b.email ? String(b.email) : undefined;
      if (b.phone !== undefined) patch.phone = b.phone ? String(b.phone) : undefined;
      if (b.address !== undefined) patch.address = b.address ? String(b.address) : undefined;
      if (b.city !== undefined) patch.city = b.city ? String(b.city) : undefined;
      if (b.country !== undefined) patch.country = b.country ? String(b.country) : undefined;
      if (b.taxId !== undefined) patch.taxId = b.taxId ? String(b.taxId) : undefined;
      if (b.incoterm !== undefined) patch.incoterm = b.incoterm ? String(b.incoterm) : undefined;
      if (b.notes !== undefined) patch.notes = b.notes ? String(b.notes) : undefined;

      const saved = await storage.updateClient(id, patch as any);
      res.json({ data: saved });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      await storage.deleteClient(id);
      res.json({ data: { id } });
    } catch {
      res.status(404).json({ message: "Client not found" });
    }
  });

  /* ----------------- Contrats API ----------------- */
  // ---- Normalisation Contrats (UI -> storage) ----
  const toStorageContractPayload = (b: any) => {
    // Marché
    const market: "LOCAL" | "EXPORT" =
      b.market === "EXPORT" ? "EXPORT" : "LOCAL";

    // Dates
    const contractDate: string =
      (typeof b.contractDate === "string" && b.contractDate) ||
      (typeof b.date === "string" && b.date) ||
      new Date().toISOString().slice(0, 10);

    const startDate: string =
      (typeof b.startDate === "string" && b.startDate) ||
      (typeof b.dateStart === "string" && b.dateStart) ||
      contractDate;

    const endDate: string =
      (typeof b.endDate === "string" && b.endDate) ||
      (typeof b.dateEnd === "string" && b.dateEnd) ||
      contractDate;

    // Quantité (UI envoie quantityT)
    const quantityTons: number =
      (b.quantityT != null ? Number(b.quantityT) : undefined) ??
      (b.quantityTons != null ? Number(b.quantityTons) : undefined) ??
      0;

    // Devise & prix
    const inferredCurrency: "USD" | "TND" =
      b.priceCurrency === "TND" ? "TND" : "USD";
    const priceCurrency: "USD" | "TND" =
      b.priceCurrency ?? (b.priceUsd != null ? "USD" : (b.priceTnd != null ? "TND" : inferredCurrency));

    // L’UI peut envoyer pricePerT (USD/T ou TND/T selon priceCurrency)
    const pricePerT = b.pricePerT != null ? Number(b.pricePerT) : undefined;

    const priceUsd =
      priceCurrency === "USD"
        ? (b.priceUsd != null ? Number(b.priceUsd) : pricePerT)
        : undefined;

    const priceTnd =
      priceCurrency === "TND"
        ? (b.priceTnd != null ? Number(b.priceTnd) : pricePerT)
        : undefined;

    const fxRate = b.fxRate != null ? Number(b.fxRate) : undefined;

    return {
      // >>>>> IMPORTANT: le storage attend `contractDate` et `quantityTons`
      contractDate,
      market,
      clientId: String(b.clientId || ""),
      clientName: b.clientName ? String(b.clientName) : undefined,
      productId: String(b.productId || ""),
      productName: b.productName ? String(b.productName) : undefined,
      quantityTons,
      priceCurrency,
      priceUsd,
      priceTnd,
      fxRate,
      startDate,
      endDate,
      code: typeof b.code === "string" ? b.code : undefined,
    };
  };

  // helper to register same handlers on multiple base paths
  const registerContractRoutes = (base: string) => {
    app.get(`${base}`, async (_req, res) => {
      const rows = await storage.getAllContracts();
      res.json({ data: rows });
    });

    app.post(`${base}`, async (req, res) => {
      try {
        const b = req.body || {};
        if (!b.clientId) return res.status(400).json({ message: "clientId is required" });
        if (!b.productId) return res.status(400).json({ message: "productId is required" });

        const payload = toStorageContractPayload(b);

        if (!payload.quantityTons || payload.quantityTons <= 0) {
          return res.status(400).json({ message: "quantityTons must be > 0" });
        }
        // validation prix selon devise
        if (payload.priceCurrency === "USD" && (payload.priceUsd == null)) {
          return res.status(400).json({ message: "priceUsd is required when priceCurrency=USD" });
        }
        if (payload.priceCurrency === "TND" && (payload.priceTnd == null)) {
          return res.status(400).json({ message: "priceTnd is required when priceCurrency=TND" });
        }

        const saved = await storage.createContract(payload as any);
        res.json({ data: saved });
      } catch (e: any) {
        res.status(400).json({ message: e?.message || "Invalid contract payload" });
      }
    });

    app.put(`${base}/:id`, async (req, res) => {
      try {
        const id = String(req.params.id);
        const b = req.body || {};
        const patch = toStorageContractPayload(b);

        // PATCH: ne pas écraser avec undefined
        Object.keys(patch).forEach(k => {
          if ((patch as any)[k] === undefined) delete (patch as any)[k];
        });

        const saved = await storage.updateContract(id, patch as any);
        res.json({ data: saved });
      } catch (e: any) {
        res.status(400).json({ message: e?.message || "Failed to update contract" });
      }
    });

    app.delete(`${base}/:id`, async (req, res) => {
      try {
        const id = String(req.params.id);
        await storage.deleteContract(id);
        res.json({ data: { id } });
      } catch {
        res.status(404).json({ message: "Contract not found" });
      }
    });
  };

  // Primary path + alias FR + singulier
  registerContractRoutes("/api/contracts");
  registerContractRoutes("/api/contrats");
  registerContractRoutes("/api/contract");

  /* --------------- 404 API --------------- */
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
