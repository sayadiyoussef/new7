var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/storage.ts
import { randomUUID } from "crypto";
var FORWARDS, MemStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    FORWARDS = {
      "RBD PO": [
        { period: "August", ask: 1e3, code: "PO-MYRBD-M1" },
        { period: "September", ask: 1005, code: "PO-MYRBD-M2" },
        { period: "October", ask: 1010, code: "PO-MYRBD-M3" },
        { period: "Oct/Nov/Dec", ask: 1025, code: "PO-MYRBD-Q1" },
        { period: "Jan/Feb/Mar", ask: 1010, code: "PO-MYRBD-Q2" },
        { period: "Apr/Mai/June", ask: 1005, code: "PO-MYRBD-Q3" }
      ],
      "RBD POL IV56": [
        { period: "August", ask: 1015, code: "PO-MYRBD-M1" },
        { period: "September", ask: 1020, code: "PO-MYRBD-M2" },
        { period: "October", ask: 1035, code: "PO-MYRBD-M3" },
        { period: "Oct/Nov/Dec", ask: 1035, code: "PO-MYRBD-Q1" },
        { period: "Jan/Feb/Mar", ask: 1020, code: "PO-MYRBD-Q2" },
        { period: "Apr/Mai/June", ask: 1015, code: "PO-MYRBD-Q3" }
      ],
      "RBD PS": [
        { period: "August", ask: 1010, code: "PO-MYRBD-M1" },
        { period: "September", ask: 1015, code: "PO-MYRBD-M2" }
      ],
      "RBD CNO": [
        { period: "Jul25/Aug25", ask: 2200, code: "RBD CNO" },
        { period: "Aug25/Sep25", ask: 2e3, code: "RBD CNO" },
        { period: "Sep25/Oct25", ask: 2e3, code: "RBD CNO" },
        { period: "Oct25/Nov25", ask: 1950, code: "RBD CNO" },
        { period: "Nov25/Dec25", ask: 1950, code: "RBD CNO" },
        { period: "Dec25/Jan26", ask: 1940, code: "RBD CNO" }
      ],
      "RBD PKO": [
        { period: "Jul25/Aug25", ask: 2200, code: "RBD PKO" },
        { period: "Aug25/Sep25", ask: 2e3, code: "RBD PKO" },
        { period: "Sep25/Oct25", ask: 2e3, code: "RBD PKO" },
        { period: "Oct25/Nov25", ask: 1950, code: "RBD PKO" }
      ],
      "RBD PKS": [
        { period: "Jul25/Aug25", ask: 450, code: "RBD PKS" },
        { period: "Aug25/Sep25", ask: 455, code: "RBD PKS" },
        { period: "Sep25/Oct25", ask: 460, code: "RBD PKS" }
      ]
    };
    MemStorage = class {
      users = /* @__PURE__ */ new Map();
      oilGrades = /* @__PURE__ */ new Map();
      marketData = /* @__PURE__ */ new Map();
      fixings = /* @__PURE__ */ new Map();
      vessels = /* @__PURE__ */ new Map();
      knowledge = /* @__PURE__ */ new Map();
      chatMessages = /* @__PURE__ */ new Map();
      chatChannels = /* @__PURE__ */ new Map();
      forwardPrices = /* @__PURE__ */ new Map();
      forwardCurves = /* @__PURE__ */ new Map();
      // --------- Produits ----------
      products = /* @__PURE__ */ new Map();
      // --------- ✅ Clients ----------
      clients = /* @__PURE__ */ new Map();
      /** ✅ codes courts adaptés aux nouveaux noms */
      codeFromGradeName(name) {
        const map = {
          "RBD PO": "RBDPO",
          "RBD PS": "RBDPS",
          "RBD POL IV56": "RBDPOL56",
          "RBD POL IV64": "RBDPOL64",
          "RBD PKO": "PKO",
          "RBD CNO": "CNO",
          "RBD PKS": "PKS",
          "CDSBO": "CDSBO"
        };
        return map[name] ?? name.toUpperCase().replace(/\s+/g, "_");
      }
      // util -> convertit "70,5%" ou "101,50%" en nombre 70.5 / 101.5
      parsePercentCell(v) {
        if (v === null || v === void 0) return 0;
        if (typeof v === "number") return v;
        const cleaned = v.replace(/\s+/g, "").replace("%", "").replace(",", ".");
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
      }
      constructor() {
        const seedUsers = [
          { id: "1", name: "Youssef SAYADI", email: "y.sayadi@direct-medical.net", password: "admin123", role: "admin" },
          { id: "2", name: "Senior Buyer", email: "senior@oiltracker.com", password: "senior123", role: "senior" },
          { id: "3", name: "Junior Buyer", email: "junior@oiltracker.com", password: "junior123", role: "junior" },
          { id: "4", name: "Viewer", email: "viewer@oiltracker.com", password: "viewer123", role: "viewer" }
        ];
        seedUsers.forEach((u) => this.users.set(u.id, u));
        const grades = [
          { name: "RBD PO", region: "Malaysia", ffa: "< 0.1%", moisture: "< 0.1%", iv: "52-56", dobi: "2.4+", freightUsd: 120 },
          { name: "RBD PS", region: "Malaysia", ffa: "< 0.1%", freightUsd: 100 },
          { name: "RBD POL IV56", region: "Malaysia", iv: "56", freightUsd: 130 },
          { name: "RBD POL IV64", region: "Malaysia", iv: "64", freightUsd: 140 },
          { name: "RBD PKO", region: "Indonesia", freightUsd: 180 },
          { name: "RBD CNO", region: "Philippines", freightUsd: 200 },
          { name: "CDSBO", region: "USA", freightUsd: 0 },
          { name: "RBD PKS", region: "Indonesia", ffa: "~", freightUsd: 170 }
        ];
        grades.forEach((g, idx) => this.oilGrades.set(idx + 1, { id: idx + 1, ...g }));
        const today = /* @__PURE__ */ new Date();
        for (const grade of this.oilGrades.values()) {
          for (let d = 0; d < 30; d++) {
            const date = new Date(today);
            date.setDate(today.getDate() - (29 - d));
            const base = 900 + grade.id % 5 * 50;
            const noise = (Math.random() - 0.5) * 30;
            const trend = Math.sin(d / 5) * 12;
            const priceUsd = Math.round((base + noise + trend) * 100) / 100;
            const usdTnd = Math.round((3.1 + Math.random() * 0.4) * 1e3) / 1e3;
            const change24h = Math.round((Math.random() - 0.5) * 6 * 10) / 10;
            const id = randomUUID();
            this.marketData.set(id, {
              id,
              gradeId: grade.id,
              gradeName: grade.name,
              date: date.toISOString().split("T")[0],
              priceUsd,
              usdTnd,
              volume: `${Math.floor(Math.random() * 2e3 + 400)} MT`,
              change24h
            });
          }
        }
        [
          { date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), route: "MAL \u2192 TUN", grade: "RBD PO", volume: "5,000 MT", priceUsd: 980, counterparty: "Wilmar", vessel: "June shipment 25" },
          { date: new Date(Date.now() - 864e5).toISOString().slice(0, 10), route: "IDN \u2192 TUN", grade: "RBD PKO", volume: "3,000 MT", priceUsd: 1210, counterparty: "Musim Mas", vessel: "August shipment 25" },
          { date: new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10), route: "USA \u2192 TUN", grade: "CDSBO", volume: "8,000 MT", priceUsd: 890, counterparty: "Bunge", vessel: "January shipment 26" }
        ].forEach((f) => {
          const id = randomUUID();
          this.fixings.set(id, { id, ...f });
        });
        [
          { name: "June shipment 25", type: "Tanker", dwt: 45e3, status: "Laden", eta: "2025-09-02", origin: "Port Klang", destination: "Rades" },
          { name: "August shipment 25", type: "Tanker", dwt: 38e3, status: "Ballast", eta: "2025-08-28", origin: "Belawan", destination: "Rades" },
          { name: "January shipment 26", type: "Tanker", dwt: 52e3, status: "At anchor", eta: "2025-09-10", origin: "New Orleans", destination: "Rades" }
        ].forEach((v) => {
          const id = randomUUID();
          this.vessels.set(id, { id, ...v });
        });
        [
          { title: "Spec RBD PO", tags: ["spec", "quality"], excerpt: "FFA < 0.1%, Moisture < 0.1%, DOBI 2.4+", content: "Detailed spec for RBD PO used by DMA." },
          { title: "Contract Template (CIF)", tags: ["contract", "legal"], excerpt: "Standard CIF template for palm products", content: "Clause set for CIF DMA imports." },
          { title: "Ops Checklist: Discharge Rades", tags: ["ops", "port"], excerpt: "Pre-arrival docs, draft survey, sampling", content: "Operational checklist for Rades discharge." }
        ].forEach((k) => {
          const id = randomUUID();
          this.knowledge.set(id, { id, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), ...k });
        });
        const chGeneralId = randomUUID();
        const chTradingId = randomUUID();
        const chOpsId = randomUUID();
        const now = /* @__PURE__ */ new Date();
        this.chatChannels.set(chGeneralId, { id: chGeneralId, name: "general", createdAt: now });
        this.chatChannels.set(chTradingId, { id: chTradingId, name: "trading", createdAt: now });
        this.chatChannels.set(chOpsId, { id: chOpsId, name: "ops", createdAt: now });
        const seedChat = [
          { sender: "System", message: "Welcome to OilTracker team chat", userId: null },
          { sender: "Senior Buyer", message: "Palm oil prices rallied this week. Should we increase our position?", userId: "2" },
          { sender: "Youssef SAYADI", message: "Agreed. Let's align on risk and TND exposure tomorrow.", userId: "1" },
          { sender: "Junior Buyer", message: "I uploaded a basis spreadsheet from Malaysia.", userId: "3" }
        ];
        seedChat.forEach((m) => {
          const id = randomUUID();
          this.chatMessages.set(id, { id, timestamp: /* @__PURE__ */ new Date(), channelId: chGeneralId, ...m });
        });
        for (const [name, points] of Object.entries(FORWARDS)) {
          this.forwardCurves.set(name.trim(), points);
        }
        const seed = (name, obj) => {
          const id = randomUUID();
          const composition = Object.entries(obj).map(([gradeName, v]) => ({
            gradeName,
            percent: this.parsePercentCell(v)
          })).filter((c) => c.percent !== 0);
          const p = {
            id,
            name,
            reference: null,
            composition,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          this.products.set(id, p);
        };
        seed("EMAS 360-7", { "RBD PO": "70,5%", "RBD POL IV56": "20,5%", "RBD PS": "10,5%" });
        seed("EMAS 360-9", { "RBD PO": "70,5%", "RBD POL IV56": "10,5%", "RBD PS": "20,5%" });
        seed("EMAS 404", { "RBD PO": "101,50%" });
        seed("KERNEL 357", { "RBD PKO": "101,50%" });
        seed("HELIOS 360-7", { "RBD PO": "65,5%", "RBD POL IV56": "5,5%", "RBD CNO": "30,5%" });
        seed("ALBA 304-3", { "RBD POL IV64": "101,50%" });
        seed("CBS PREMIUM", { "RBD PKS": "101,50%" });
        seed("IRIS-204", { "RBD POL IV56": "101,50%" });
        seed("HVSJ", { "CDSBO": "105%" });
        const seedClient = (market, name, paymentTerms) => {
          const id = randomUUID();
          this.clients.set(id, {
            id,
            market,
            name,
            paymentTerms,
            updatedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        };
        seedClient("LOCAL", "SOTUBI", "120 j");
        seedClient("LOCAL", "GEPACO", "90 j");
        seedClient("EXPORT", "FDD", "A vue");
        seedClient("EXPORT", "AIGUEBELLE", "60 j");
      }
      // Users
      async getUser(id) {
        return this.users.get(id);
      }
      async getUserByEmail(email) {
        for (const u of this.users.values()) if (u.email === email) return u;
        return void 0;
      }
      async createUser(user) {
        const id = randomUUID();
        const u = { id, name: user.name, email: user.email, password: user.password, role: user.role ?? "viewer" };
        this.users.set(id, u);
        return u;
      }
      // Grades
      async getAllOilGrades() {
        return Array.from(this.oilGrades.values());
      }
      async getOilGrade(id) {
        return this.oilGrades.get(id);
      }
      async createOilGrade(grade) {
        const id = Math.max(0, ...this.oilGrades.keys()) + 1;
        const g = { id, ...grade, name: grade.name || `Grade ${id}` };
        this.oilGrades.set(id, g);
        await this.seedMarketForGrade(id, 30);
        const forwards = FORWARDS[(g.name || "").trim()];
        if (forwards && forwards.length) {
          this.forwardCurves.set(g.name.trim(), forwards);
        }
        return g;
      }
      async updateOilGradeFreight(id, freightUsd) {
        const g = this.oilGrades.get(id);
        if (!g) throw new Error("Grade not found");
        const updated = { ...g, freightUsd: Number(freightUsd) };
        this.oilGrades.set(id, updated);
        return updated;
      }
      async updateOilGrade(id, patch) {
        const current = this.oilGrades.get(id);
        if (!current) throw new Error("Grade not found");
        const next = { ...current };
        for (const k of ["name", "region", "ffa", "moisture", "iv", "dobi"]) {
          if (patch[k] !== void 0) next[k] = patch[k];
        }
        if (patch.freightUsd !== void 0) next.freightUsd = Number(patch.freightUsd);
        const nameChanged = patch.name && patch.name !== current.name;
        if (nameChanged) {
          for (const m of this.marketData.values()) {
            if (m.gradeId === id) m.gradeName = patch.name;
          }
          this.forwardPrices.delete(id);
          const fwd = FORWARDS[(patch.name || "").trim()];
          if (fwd && fwd.length) this.forwardCurves.set(String(patch.name).trim(), fwd);
        }
        this.oilGrades.set(id, next);
        return next;
      }
      // Market
      async getAllMarketData() {
        return Array.from(this.marketData.values()).sort((a, b) => a.date.localeCompare(b.date));
      }
      async getMarketDataByGrade(gradeId) {
        return Array.from(this.marketData.values()).filter((m) => m.gradeId === gradeId).sort((a, b) => a.date.localeCompare(b.date));
      }
      async createMarketData(data) {
        const id = randomUUID();
        const m = { id, ...data };
        this.marketData.set(id, m);
        return m;
      }
      async seedMarketForGrade(gradeId, days = 30) {
        const grade = this.oilGrades.get(gradeId);
        if (!grade) return;
        const today = /* @__PURE__ */ new Date();
        for (let d = 0; d < days; d++) {
          const date = new Date(today);
          date.setDate(today.getDate() - (days - 1 - d));
          const base = 900 + grade.id % 5 * 50;
          const noise = (Math.random() - 0.5) * 30;
          const trend = Math.sin(d / 5) * 12;
          const priceUsd = Math.round((base + noise + trend) * 100) / 100;
          const usdTnd = Math.round((3.1 + Math.random() * 0.4) * 1e3) / 1e3;
          const change24h = Math.round((Math.random() - 0.5) * 6 * 10) / 10;
          const id = randomUUID();
          this.marketData.set(id, {
            id,
            gradeId: grade.id,
            gradeName: grade.name,
            date: date.toISOString().split("T")[0],
            priceUsd,
            usdTnd,
            volume: `${Math.floor(Math.random() * 2e3 + 400)} MT`,
            change24h
          });
        }
        this.forwardPrices.delete(gradeId);
      }
      async getForwardPricesByGrade(gradeId) {
        const g = this.oilGrades.get(gradeId);
        if (!g) return [];
        const curve = this.forwardCurves.get((g.name || "").trim());
        if (curve && curve.length) {
          return curve.map((p) => ({
            gradeId,
            gradeName: g.name,
            code: p.code,
            period: p.period,
            ask: p.ask
          }));
        }
        const cached = this.forwardPrices.get(gradeId);
        if (cached) return cached;
        const series = await this.getMarketDataByGrade(gradeId);
        if (!series.length) return [];
        const last = series[series.length - 1];
        const base = Number(last.priceUsd) || 0;
        const code = this.codeFromGradeName(last.gradeName);
        const rows = [
          { gradeId, gradeName: last.gradeName, code, period: "Spot (M)", ask: Math.round(base * 100) / 100 },
          { gradeId, gradeName: last.gradeName, code, period: "M+1", ask: Math.round((base + 10) * 100) / 100 },
          { gradeId, gradeName: last.gradeName, code, period: "M+2", ask: Math.round((base + 20) * 100) / 100 },
          { gradeId, gradeName: last.gradeName, code, period: "M+3", ask: Math.round((base + 30) * 100) / 100 }
        ];
        this.forwardPrices.set(gradeId, rows);
        return rows;
      }
      // Chat
      async getAllChatMessages() {
        return Array.from(this.chatMessages.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      async getChatMessagesByChannel(channelId) {
        return Array.from(this.chatMessages.values()).filter((m) => m.channelId === channelId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      }
      async createChatMessage(data) {
        const id = randomUUID();
        const anyGeneral = Array.from(this.chatChannels.values()).find((c) => c.name === "general");
        const channelId = data.channelId ?? anyGeneral?.id ?? Array.from(this.chatChannels.keys())[0];
        const m = { id, sender: data.sender, message: data.message, userId: data.userId ?? null, timestamp: /* @__PURE__ */ new Date(), channelId };
        this.chatMessages.set(id, m);
        return m;
      }
      // Fixings + Vessels + Knowledge
      async getAllFixings() {
        return Array.from(this.fixings.values()).sort((a, b) => String(b.date).localeCompare(String(a.date)));
      }
      async getAllVessels() {
        return Array.from(this.vessels.values());
      }
      async getAllKnowledge() {
        return Array.from(this.knowledge.values()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      }
      async createFixing(data) {
        const id = randomUUID();
        const f = {
          id,
          date: data.date,
          route: data.route,
          grade: data.grade,
          volume: data.volume,
          priceUsd: Number(data.priceUsd),
          counterparty: data.counterparty,
          vessel: data.vessel || void 0
        };
        this.fixings.set(id, f);
        if (f.vessel && !Array.from(this.vessels.values()).some((v) => v.name === f.vessel)) {
          const vId = randomUUID();
          this.vessels.set(vId, { id: vId, name: f.vessel, type: "Tanker", dwt: 0, status: "Planned" });
        }
        return f;
      }
      async updateFixing(id, data) {
        const existing = this.fixings.get(id);
        if (!existing) throw new Error("Fixing not found");
        const updated = { ...existing, ...data, id };
        this.fixings.set(id, updated);
        if (updated.vessel && !Array.from(this.vessels.values()).some((v) => v.name === updated.vessel)) {
          const vId = randomUUID();
          this.vessels.set(vId, { id: vId, name: updated.vessel, type: "Tanker", dwt: 0, status: "Unknown" });
        }
        return updated;
      }
      async deleteFixing(id) {
        this.fixings.delete(id);
      }
      async createVessel(data) {
        const id = randomUUID();
        const v = { id, name: data.name, type: data.type || "Tanker", dwt: Number(data.dwt || 0), status: data.status || "Unknown", eta: data.eta, origin: data.origin, destination: data.destination };
        this.vessels.set(id, v);
        return v;
      }
      async updateVessel(id, data) {
        const existing = this.vessels.get(id);
        if (!existing) throw new Error("Vessel not found");
        const updated = { ...existing, ...data, id };
        updated.dwt = Number(updated.dwt ?? existing.dwt ?? 0);
        updated.type = updated.type || "Tanker";
        updated.status = updated.status || "Unknown";
        this.vessels.set(id, updated);
        return updated;
      }
      async deleteVessel(id) {
        this.vessels.delete(id);
      }
      async createKnowledge(data) {
        const id = randomUUID();
        const k = { id, title: data.title || "Untitled", tags: data.tags || [], excerpt: data.excerpt || data.link || "", content: data.content || data.link || "", updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
        this.knowledge.set(id, k);
        return k;
      }
      // Channels
      async getAllChatChannels() {
        return Array.from(this.chatChannels.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
      async createChatChannel(data) {
        const id = randomUUID();
        const ch = { id, name: data.name, createdAt: /* @__PURE__ */ new Date() };
        this.chatChannels.set(id, ch);
        return ch;
      }
      // ------------------- Produits -------------------
      async getAllProducts() {
        return Array.from(this.products.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
      async createProduct(data) {
        const id = randomUUID();
        const composition = (data.composition || []).map((c) => ({ gradeName: String(c.gradeName), percent: Number(c.percent) || 0 })).filter((c) => c.percent !== 0);
        const p = {
          id,
          name: data.name,
          reference: data.reference ?? null,
          composition,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.products.set(id, p);
        return p;
      }
      async updateProduct(id, data) {
        const existing = this.products.get(id);
        if (!existing) throw new Error("Product not found");
        const next = {
          ...existing,
          ..."name" in data ? { name: String(data.name) } : {},
          ..."reference" in data ? { reference: data.reference ?? null } : {},
          ...data.composition ? { composition: data.composition.map((c) => ({ gradeName: String(c.gradeName), percent: Number(c.percent) || 0 })).filter((c) => c.percent !== 0) } : {},
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.products.set(id, next);
        return next;
      }
      async deleteProduct(id) {
        this.products.delete(id);
      }
      // ------------------- ✅ Clients -------------------
      async getAllClients() {
        return Array.from(this.clients.values()).sort((a, b) => a.name.localeCompare(b.name));
      }
      async createClient(data) {
        const id = randomUUID();
        const c = {
          id,
          name: data.name,
          market: data.market,
          paymentTerms: data.paymentTerms,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.clients.set(id, c);
        return c;
      }
      async updateClient(id, data) {
        const existing = this.clients.get(id);
        if (!existing) throw new Error("Client not found");
        const next = {
          ...existing,
          ..."name" in data ? { name: String(data.name) } : {},
          ..."market" in data ? { market: data.market } : {},
          ..."paymentTerms" in data ? { paymentTerms: String(data.paymentTerms) } : {},
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        this.clients.set(id, next);
        return next;
      }
      async deleteClient(id) {
        this.clients.delete(id);
      }
    };
    storage = new MemStorage();
  }
});

// server/analytics.ts
var analytics_exports = {};
__export(analytics_exports, {
  computeBuyingScore: () => computeBuyingScore,
  computeIndicators: () => computeIndicators,
  interpretIndicators: () => interpretIndicators
});
function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function stddev(arr) {
  const m = mean(arr);
  return arr.length ? Math.sqrt(mean(arr.map((x) => (x - m) * (x - m)))) : 0;
}
function linearRegressionSlope(y) {
  const n = y.length;
  if (n < 2) return 0;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const xmean = mean(x);
  const ymean = mean(y);
  const num = x.reduce((s, xi, i) => s + (xi - xmean) * (y[i] - ymean), 0);
  const den = x.reduce((s, xi) => s + (xi - xmean) * (xi - xmean), 0);
  if (den === 0) return 0;
  return num / den;
}
function computeIndicators(ts) {
  const prices = ts.map((t) => t.priceUsd);
  const n = prices.length;
  const last = prices[n - 1] ?? 0;
  const window20 = prices.slice(Math.max(0, n - 20));
  const ma20 = mean(window20);
  const std20 = stddev(window20);
  const bollLow = ma20 - 2 * std20;
  const returns = [];
  for (let i = 1; i < n; i++) {
    const prev = prices[i - 1];
    const cur = prices[i];
    if (prev > 0) {
      returns.push((cur - prev) / prev);
    }
  }
  const vol30 = stddev(returns.slice(Math.max(0, returns.length - 30)));
  const last10 = prices.slice(Math.max(0, n - 10));
  const slope = linearRegressionSlope(last10);
  const resid = last10.map((p, i) => {
    const x = i + 1;
    const yhat = last10[0] + slope * (x - 1);
    return p - yhat;
  });
  const residStd = stddev(resid);
  const forecasts = Array.from({ length: 7 }, (_, h) => last + slope * (h + 1));
  const fmin = Math.min(...forecasts) - residStd;
  const fmax = Math.max(...forecasts) + residStd;
  const f1 = last + slope * 1;
  return {
    P_today: last,
    MA_20: ma20,
    Bollinger_low: bollLow,
    Forecast_min: fmin,
    Forecast_max: fmax,
    Volatility: vol30,
    Trend_slope: slope,
    Forecast_1d: f1
  };
}
function computeBuyingScore(ind) {
  const base = 50;
  let bonus_boll = 0;
  if (ind.P_today < ind.Bollinger_low) {
    const diff = Math.max(0, ind.Bollinger_low - ind.P_today);
    const denom = Math.max(1e-9, ind.MA_20 - ind.Bollinger_low);
    const proximity = Math.min(1, diff / denom);
    bonus_boll = 10 + 5 * proximity;
  }
  let bonus_forecast = 0;
  if (ind.P_today <= ind.Forecast_min) {
    bonus_forecast = 20;
  } else if (ind.P_today <= ind.MA_20) {
    bonus_forecast = 10;
  }
  let bonus_trend = 0;
  if (ind.Trend_slope < 0) {
    const rel = Math.min(1, Math.abs(ind.Trend_slope) / Math.max(1, ind.MA_20) / 15e-4);
    bonus_trend = 5 + 5 * rel;
  }
  const threshold = 0.025;
  let malus_vol = 0;
  if (ind.Volatility > threshold) {
    const over = Math.min(1, (ind.Volatility - threshold) / 0.025);
    malus_vol = 10 + 10 * over;
  }
  let score = base + bonus_boll + bonus_forecast + bonus_trend - malus_vol;
  score = Math.max(0, Math.min(100, Math.round(score)));
  let bucket;
  if (score >= 85) bucket = "strong_buy";
  else if (score >= 65) bucket = "buy";
  else if (score >= 50) bucket = "watch";
  else bucket = "avoid";
  const bits = [];
  if (bonus_boll > 0) bits.push("Prix sous la bande de Bollinger");
  if (bonus_forecast === 20) bits.push("\u2264 pr\xE9vision min 7j");
  else if (bonus_forecast === 10) bits.push("\u2264 MA20");
  if (bonus_trend > 0) bits.push("tendance r\xE9cente baissi\xE8re");
  if (malus_vol > 0) bits.push("volatilit\xE9 \xE9lev\xE9e");
  const comment = bits.length ? bits.join(" + ") + " = opportunit\xE9" : "Situation neutre";
  return { indicators: ind, score, bucket, comment };
}
function interpretIndicators(ind) {
  const notes = {};
  const width = ind.MA_20 - ind.Bollinger_low;
  const dist = ind.MA_20 - ind.P_today;
  const pct = width ? dist / width : 0;
  if (pct > 1.1) notes.bollinger = "Prix nettement sous la bande inf\xE9rieure \u2192 possible survente / opportunit\xE9 d'achat contrarien";
  else if (pct > 0.6) notes.bollinger = "Prix proche de la bande basse \u2192 biais haussier \xE0 court terme si rebond";
  else if (pct < -0.1) notes.bollinger = "Prix au-dessus de la moyenne mobile \u2192 momentum positif";
  else notes.bollinger = "Prix autour de la MA20 \u2192 situation neutre";
  if (ind.Volatility >= 0.03) notes.volatility = "Volatilit\xE9 >3% (30j) \u2192 risque \xE9lev\xE9; adapter la taille des positions";
  else if (ind.Volatility >= 0.02) notes.volatility = "Volatilit\xE9 mod\xE9r\xE9e (2\u20133%)";
  else notes.volatility = "Volatilit\xE9 faible (<2%) \u2192 conditions calmes";
  if (ind.Trend_slope < -2) notes.trend = "Tendance baissi\xE8re marqu\xE9e (r\xE9gression 10j)";
  else if (ind.Trend_slope < 0) notes.trend = "Tendance l\xE9g\xE8rement baissi\xE8re";
  else if (ind.Trend_slope > 2) notes.trend = "Tendance haussi\xE8re marqu\xE9e";
  else notes.trend = "Tendance lat\xE9rale";
  const diff = ind.Forecast_1d - ind.P_today;
  if (diff > 5) notes.forecast = "Projection 1j haussi\xE8re (> +$5)";
  else if (diff > 0) notes.forecast = "Projection 1j l\xE9g\xE8rement haussi\xE8re";
  else if (diff < -5) notes.forecast = "Projection 1j baissi\xE8re (< -$5)";
  else notes.forecast = "Projection 1j neutre";
  const positives = ["bollinger", "trend", "forecast"].filter((k) => /haussi|survente|au-dessus/.test(notes[k] || "")).length;
  const negatives = ["volatility", "trend", "forecast"].filter((k) => /risque|baissi/.test(notes[k] || "")).length;
  let summary = "Signal neutre";
  if (positives >= 2 && negatives === 0) summary = "Contexte favorable";
  else if (negatives >= 2 && positives === 0) summary = "Contexte d\xE9favorable";
  else if (positives > negatives) summary = "L\xE9g\xE8re pr\xE9f\xE9rence \xE0 l'achat";
  else if (negatives > positives) summary = "L\xE9g\xE8re pr\xE9f\xE9rence \xE0 la prudence";
  notes.summary = summary;
  return notes;
}
var init_analytics = __esm({
  "server/analytics.ts"() {
    "use strict";
  }
});

// server/market_intel.ts
var market_intel_exports = {};
__export(market_intel_exports, {
  getLogistics: () => getLogistics,
  getMarketIntel: () => getMarketIntel,
  getOilHistory: () => getOilHistory,
  getPolitics: () => getPolitics,
  getTickers: () => getTickers,
  getWeather: () => getWeather
});
async function safeFetchJSON(url, timeoutMs = 5e3) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}
async function getOilHistory() {
  const endpoints = {
    brent: "https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?range=1mo&interval=1d",
    wti: "https://query1.finance.yahoo.com/v8/finance/chart/CL=F?range=1mo&interval=1d"
  };
  const out = {};
  for (const [k, url] of Object.entries(endpoints)) {
    const j = await safeFetchJSON(url);
    if (j && j.chart?.result?.[0]) {
      const r = j.chart.result[0];
      const ts = r.timestamp || [];
      const closes = r.indicators?.quote?.[0]?.close || [];
      out[k] = ts.map((t, i) => ({ date: new Date(t * 1e3).toISOString().slice(0, 10), price: Number(closes[i] || 0) })).filter((x) => x.price);
    } else {
      out[k] = [];
    }
  }
  return out;
}
async function getTickers(symbols = ["ZL=F", "BO=F", "BZ=F", "CL=F"]) {
  const res = [];
  for (const s of symbols) {
    const j = await safeFetchJSON(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?range=5d&interval=1d`);
    if (j && j.chart?.result?.[0]) {
      const r = j.chart.result[0];
      const closes = r.indicators?.quote?.[0]?.close || [];
      const price = Number(closes[closes.length - 1] || 0);
      const prev = Number(closes[closes.length - 2] || 0);
      const change = prev ? (price - prev) / prev * 100 : 0;
      res.push({ symbol: s, price: Number(price.toFixed(2)), change: Number(change.toFixed(2)) });
    } else {
      res.push({ symbol: s, price: 0, change: 0 });
    }
  }
  return res;
}
async function getWeather(locations = [
  { name: "Rades", lat: 36.8, lon: 10.18 },
  { name: "Port Klang", lat: 3, lon: 101.4 },
  { name: "Belawan", lat: 3.77, lon: 98.68 }
]) {
  const out = [];
  for (const l of locations) {
    const j = await safeFetchJSON(`https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}&current_weather=true`);
    if (j && j.current_weather) {
      out.push({ location: l.name, temperature: j.current_weather.temperature, windspeed: j.current_weather.windspeed, weathercode: j.current_weather.weathercode });
    } else {
      out.push({ location: l.name, temperature: null, windspeed: null, weathercode: null });
    }
  }
  return out;
}
async function getLogistics() {
  const vessels = await storage.getAllVessels();
  const fixings = await storage.getAllFixings();
  const nextVessel = vessels.slice().sort((a, b) => String(a.eta || "").localeCompare(String(b.eta || "")))[0];
  return { nextVessel, recentFixings: fixings.slice(0, 3), vessels: vessels.slice(0, 5) };
}
async function getPolitics() {
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  return [
    { source: "DMA Intel", title: "Malaysia mulls export policy tweaks for palm oil derivatives", date: today, url: "#" },
    { source: "DMA Intel", title: "Indonesian biodiesel mandate update expected", date: today, url: "#" }
  ];
}
async function getMarketIntel() {
  const [oilHistory, tickers, weather, logistics, politics] = await Promise.all([
    getOilHistory(),
    getTickers(),
    getWeather(),
    getLogistics(),
    getPolitics()
  ]);
  return { oilHistory, tickers, weather, logistics, politics };
}
var init_market_intel = __esm({
  "server/market_intel.ts"() {
    "use strict";
    init_storage();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_storage();
import { createServer } from "http";

// shared/schema.ts
import { z } from "zod";
var insertUserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "senior", "junior", "viewer"]).default("viewer"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});
var userSchema = insertUserSchema.extend({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});
var insertOilGradeSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  region: z.string().optional(),
  ffa: z.string().optional(),
  moisture: z.string().optional(),
  iv: z.string().optional(),
  dobi: z.string().optional(),
  // on autorise freightUsd côté API (optionnel)
  freightUsd: z.number().optional()
});
var oilGradeSchema = insertOilGradeSchema.extend({ id: z.number() });
var insertMarketDataSchema = z.object({
  id: z.string().optional(),
  gradeId: z.number(),
  gradeName: z.string(),
  date: z.string(),
  // YYYY-MM-DD
  priceUsd: z.number(),
  usdTnd: z.number(),
  volume: z.string(),
  // "1234 MT"
  change24h: z.number()
  // percentage +/- (en points)
});
var marketDataSchema = insertMarketDataSchema.extend({ id: z.string() });
var insertChatChannelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  createdAt: z.date().optional()
});
var chatChannelSchema = insertChatChannelSchema.extend({
  id: z.string(),
  createdAt: z.date()
});
var insertChatMessageSchema = z.object({
  id: z.string().optional(),
  sender: z.string(),
  message: z.string(),
  channelId: z.string().optional(),
  userId: z.string().nullable().optional(),
  timestamp: z.date().optional()
});
var chatMessageSchema = insertChatMessageSchema.extend({
  id: z.string(),
  timestamp: z.date(),
  channelId: z.string()
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
var productComponentSchema = z.object({
  gradeName: z.string(),
  // doit correspondre au name du grade
  percent: z.number()
  // ex: 70.5 (pas "70,5%")
});
var insertProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  reference: z.string().nullable().optional(),
  composition: z.array(productComponentSchema).default([]),
  updatedAt: z.string().optional()
});
var productSchema = insertProductSchema.extend({
  id: z.string(),
  updatedAt: z.string()
});
var marketEnum = z.enum(["LOCAL", "EXPORT"]);
var insertClientSchema = z.object({
  id: z.string().optional(),
  // Colonnes du tableau
  market: marketEnum.default("LOCAL"),
  // "Marché"
  name: z.string().min(1),
  // "Client"
  paymentTerms: z.string().min(1),
  // "Modalité" (ex: "120 j", "A vue")
  // Champs optionnels (extensibilité future, non utilisés obligatoirement)
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  taxId: z.string().optional(),
  incoterm: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
var clientSchema = insertClientSchema.extend({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

// server/routes.ts
async function registerRoutes(app) {
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
          token
        }
      });
    } catch {
      res.status(400).json({ message: "Invalid login payload" });
    }
  });
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
        region: b.region ? String(b.region) : void 0,
        ffa: b.ffa ? String(b.ffa) : void 0,
        moisture: b.moisture ? String(b.moisture) : void 0,
        iv: b.iv ? String(b.iv) : void 0,
        dobi: b.dobi ? String(b.dobi) : void 0,
        // @ts-ignore
        freightUsd: b.freightUsd !== void 0 ? Number(b.freightUsd) : void 0
      });
      res.json({ data: created });
    } catch (e) {
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
    } catch (e) {
      res.status(404).json({ message: e?.message || "Grade not found" });
    }
  });
  app.put("/api/grades/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const b = req.body || {};
      const patch = {};
      if (b.name !== void 0) patch.name = String(b.name).trim();
      if (b.region !== void 0) patch.region = b.region === "" ? void 0 : String(b.region);
      if (b.ffa !== void 0) patch.ffa = b.ffa === "" ? void 0 : String(b.ffa);
      if (b.moisture !== void 0) patch.moisture = b.moisture === "" ? void 0 : String(b.moisture);
      if (b.iv !== void 0) patch.iv = b.iv === "" ? void 0 : String(b.iv);
      if (b.dobi !== void 0) patch.dobi = b.dobi === "" ? void 0 : String(b.dobi);
      if (b.freightUsd !== void 0) {
        if (b.freightUsd === "" || b.freightUsd === null) patch.freightUsd = void 0;
        else {
          const n = Number(b.freightUsd);
          if (!Number.isFinite(n)) return res.status(400).json({ message: "freightUsd must be a number" });
          patch.freightUsd = n;
        }
      }
      const maybeUpdate = storage?.updateOilGrade;
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
    } catch (e) {
      res.status(400).json({ message: e?.message || "Failed to update grade" });
    }
  });
  app.get("/api/grades/:id/forwards", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const maybeGet = storage?.getForwardPricesByGrade;
      if (typeof maybeGet === "function") {
        const rows = await maybeGet.call(storage, id);
        return res.json({ data: rows });
      }
      const series = (await storage.getMarketDataByGrade(id)).sort((a, b) => a.date.localeCompare(b.date));
      if (!series.length) return res.status(404).json({ message: "No market data for grade" });
      const spot = series[series.length - 1];
      const base = Number(spot.priceUsd);
      const out = [];
      const monthAbbr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const today = /* @__PURE__ */ new Date();
      for (let i = 1; i <= 6; i++) {
        const d = new Date(today);
        d.setMonth(d.getMonth() + i);
        const m = monthAbbr[d.getMonth()];
        const y = (d.getFullYear() % 100).toString().padStart(2, "0");
        const period = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        const code = `${m}${y}`;
        const ask = Math.round((base * (1 + 25e-4 * i) + 5 * i) * 100) / 100;
        out.push({ gradeId: id, gradeName: spot.gradeName, period, code, askPrice: ask });
      }
      res.json({ data: out });
    } catch {
      res.status(500).json({ message: "Failed to compute forwards" });
    }
  });
  app.get("/api/market/latest", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    const all = await storage.getAllMarketData();
    const latestPerGrade = grades.map((g) => {
      const items = all.filter((m) => m.gradeId === g.id).sort((a, b) => a.date.localeCompare(b.date));
      return items[items.length - 1];
    }).filter(Boolean);
    res.json({ data: latestPerGrade });
  });
  app.get("/api/market/by-grade/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = await storage.getMarketDataByGrade(id);
    res.json({ data: items });
  });
  app.get("/api/analytics/buying-score/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = (await storage.getMarketDataByGrade(id)).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) return res.status(404).json({ message: "No data for grade" });
    const { computeIndicators: computeIndicators2, computeBuyingScore: computeBuyingScore2 } = await Promise.resolve().then(() => (init_analytics(), analytics_exports));
    const ind = computeIndicators2(items);
    const result = computeBuyingScore2(ind);
    const gradeName = items[0].gradeName;
    res.json({ data: { gradeId: id, gradeName, ...result } });
  });
  app.get("/api/analytics/interpret/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = (await storage.getMarketDataByGrade(id)).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) return res.status(404).json({ message: "No data for grade" });
    const { computeIndicators: computeIndicators2, interpretIndicators: interpretIndicators2 } = await Promise.resolve().then(() => (init_analytics(), analytics_exports));
    const ind = computeIndicators2(items);
    const notes = interpretIndicators2(ind);
    const gradeName = items[0].gradeName;
    res.json({ data: { gradeId: id, gradeName, indicators: ind, notes } });
  });
  app.get("/api/analytics/buying-score", async (_req, res) => {
    const grades = await storage.getAllOilGrades();
    const all = await storage.getAllMarketData();
    const { computeIndicators: computeIndicators2, computeBuyingScore: computeBuyingScore2 } = await Promise.resolve().then(() => (init_analytics(), analytics_exports));
    const out = [];
    for (const g of grades) {
      const ts = all.filter((m) => m.gradeId === g.id).sort((a, b) => a.date.localeCompare(b.date));
      if (ts.length) {
        const ind = computeIndicators2(ts);
        const result = computeBuyingScore2(ind);
        out.push({ gradeId: g.id, gradeName: g.name, ...result });
      }
    }
    res.json({ data: out });
  });
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
    const msgs = channelId ? await storage.getChatMessagesByChannel(channelId) : await storage.getAllChatMessages();
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
    } catch (e) {
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
  app.get("/api/vessels", async (_req, res) => {
    const rows = await storage.getAllVessels();
    res.json({ data: rows });
  });
  app.post("/api/vessels", async (req, res) => {
    const b = req.body || {};
    if (!b.name || !b.type || !b.dwt || !b.status) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const saved = await storage.createVessel(b);
    res.json({ data: saved });
  });
  app.put("/api/vessels/:id", async (req, res) => {
    try {
      const updated = await storage.updateVessel(req.params.id, req.body || {});
      res.json({ data: updated });
    } catch (e) {
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
  app.get("/api/knowledge", async (_req, res) => {
    const rows = await storage.getAllKnowledge();
    res.json({ data: rows });
  });
  app.get("/api/market/intel", async (_req, res) => {
    const { getMarketIntel: getMarketIntel2 } = await Promise.resolve().then(() => (init_market_intel(), market_intel_exports));
    const data = await getMarketIntel2();
    res.json({ data });
  });
  app.post("/api/knowledge/upload", async (req, res) => {
    const { title, link, tags = [] } = req.body || {};
    if (!title || !link) return res.status(400).json({ message: "title and link are required" });
    const saved = await storage.createKnowledge({ title, tags, excerpt: link, content: link });
    res.json({ data: saved });
  });
  app.get("/api/products", async (_req, res) => {
    const rows = await storage.getAllProducts();
    res.json({ data: rows });
  });
  app.post("/api/products", async (req, res) => {
    try {
      const { name, reference, composition } = insertProductSchema.parse(req.body);
      const saved = await storage.createProduct({ name, reference, composition });
      res.json({ data: saved });
    } catch (e) {
      res.status(400).json({ message: e?.message || "Invalid product payload" });
    }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const { name, reference, composition } = insertProductSchema.partial().parse(req.body || {});
      const saved = await storage.updateProduct(id, { name, reference, composition });
      res.json({ data: saved });
    } catch (e) {
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
  app.get("/api/clients", async (_req, res) => {
    const rows = await storage.getAllClients();
    res.json({ data: rows });
  });
  app.post("/api/clients", async (req, res) => {
    try {
      const payload = insertClientSchema.omit({ id: true }).parse(req.body);
      const saved = await storage.createClient(payload);
      res.json({ data: saved });
    } catch (e) {
      res.status(400).json({ message: e?.message || "Invalid client payload" });
    }
  });
  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = String(req.params.id);
      const patch = insertClientSchema.omit({ id: true }).partial().parse(req.body || {});
      const saved = await storage.updateClient(id, patch);
      res.json({ data: saved });
    } catch (e) {
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
  app.all("/api/*", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });
  const httpServer = createServer(app);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createVite, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  const id = nanoid(5);
  viteLogger.info(`[${formattedTime}][${source}:${id}] ${message}`);
}
async function setupVite(app, server) {
  const vite = await createVite({
    ...vite_config_default,
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
    optimizeDeps: { entries: ["client/index.html"] }
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const indexHtml = fs.readFileSync(path2.resolve("client/index.html"), "utf-8");
      const transformed = await vite.transformIndexHtml(url, indexHtml);
      res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve("dist/public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, build the client first`);
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/knowledge.store.ts
import fs2 from "node:fs";
import path3 from "node:path";
var DATA_DIR = path3.resolve(process.cwd(), "knowledge");
var DB_PATH = path3.join(DATA_DIR, "knowledge.db.json");
function ensureDirs() {
  if (!fs2.existsSync(DATA_DIR)) fs2.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs2.existsSync(DB_PATH)) fs2.writeFileSync(DB_PATH, JSON.stringify({ items: [] }, null, 2));
}
function loadAll() {
  ensureDirs();
  try {
    const raw = fs2.readFileSync(DB_PATH, "utf8");
    const json = JSON.parse(raw);
    return json.items || [];
  } catch {
    return [];
  }
}
function saveAll(items) {
  ensureDirs();
  fs2.writeFileSync(DB_PATH, JSON.stringify({ items }, null, 2));
}
function addLinkDoc(title, link, tags) {
  const items = loadAll();
  const now = Date.now();
  const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const item = {
    id,
    title,
    link,
    tags,
    excerpt: link,
    content: "",
    updatedAt: now
  };
  items.unshift(item);
  saveAll(items);
  return item;
}
function tokenize(s) {
  return (s || "").toLowerCase().replace(/[^a-zà-ÿ0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}
function search(q) {
  const items = loadAll();
  const s = (q || "").trim().toLowerCase();
  if (!s) return items;
  return items.filter((it) => {
    const hay = `${it.title} ${(it.tags || []).join(" ")} ${it.excerpt || ""} ${it.content || ""}`.toLowerCase();
    return hay.includes(s);
  });
}
function topContexts(question, k = 6) {
  const items = loadAll();
  const qTokens = new Set(tokenize(question));
  const scored = [];
  for (const it of items) {
    const txt = `${it.title} ${(it.tags || []).join(" ")} ${it.excerpt || ""} ${it.content || ""}`;
    const t = tokenize(txt);
    let sc = 0;
    for (const tok of t) if (qTokens.has(tok)) sc += 1;
    if (sc > 0) scored.push({ it, score: sc });
  }
  scored.sort((a, b) => b.score - a.score);
  const take = scored.slice(0, k).map((s) => s.it);
  const contexts = take.map((t) => `# ${t.title}
${t.excerpt || ""}
${t.content || ""}`.trim()).filter(Boolean);
  const sources = take.map((t) => ({ title: t.title, path: t.link || t.id }));
  return { contexts, sources };
}

// server/knowledge.routes.ts
async function askLLM(question, context) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const first = context.split(/\n/).filter(Boolean).slice(0, 20).join("\n");
    return `R\xE9sum\xE9 (fallback, OPENAI_API_KEY absent):
${first}`;
  }
  try {
    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu es un assistant qui r\xE9pond UNIQUEMENT \xE0 partir du contexte fourni. Si l'info n'est pas dans le contexte, dis-le et propose o\xF9 chercher." },
        { role: "user", content: `Question:
${question}

Contexte:
${context}` }
      ],
      temperature: 0.2
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      return `Erreur LLM (${res.status}): ${t}`;
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "Pas de r\xE9ponse.";
  } catch (e) {
    return `Erreur appel LLM: ${e?.message || e}`;
  }
}
function registerKnowledgeRoutes(app) {
  app.get("/api/knowledge", (req, res) => {
    const q = (req.query.q || "").toString();
    const rows = search(q);
    res.json({ data: rows });
  });
  app.post("/api/knowledge/upload", (req, res) => {
    const title = (req.body?.title || "").toString();
    const link = (req.body?.link || "").toString();
    const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
    if (!title.trim() || !link.trim()) return res.status(400).json({ error: "title & link required" });
    const it = addLinkDoc(title, link, tags);
    res.json({ ok: true, item: it });
  });
  app.post("/api/knowledge/ask", async (req, res) => {
    const question = (req.body?.question || "").toString();
    if (!question.trim()) return res.status(400).json({ error: "Missing question" });
    const { contexts, sources } = topContexts(question, 6);
    const context = contexts.join("\n\n");
    const answer = await askLLM(question, context);
    const suggestions = [];
    if (/bollinger|bande/i.test(question)) suggestions.push("Voir r\xE9glage standard Bollinger 20/2.");
    if (/volatilité|volatility/i.test(question)) suggestions.push("Comparer volatilit\xE9 r\xE9alis\xE9e vs implicite.");
    if (/stocks|stock|inventaire/i.test(question)) suggestions.push("Corr\xE9ler stocks et courbe des prix.");
    if (/baril|brent|wti/i.test(question)) suggestions.push("Suivre calendrier OPEP et rapports EIA.");
    res.json({ answer, sources, suggestions });
  });
}

// server/index.ts
(async () => {
  const app = express2();
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: false }));
  app.use((req, res, next) => {
    const start = Date.now();
    const path4 = req.path;
    let capturedJson;
    const json = res.json.bind(res);
    res.json = (body) => {
      capturedJson = body;
      return json(body);
    };
    res.on("finish", () => {
      const ms = Date.now() - start;
      log(`${req.method} ${path4} -> ${res.statusCode} in ${ms}ms`);
      if (process.env.NODE_ENV === "development" && path4.startsWith("/api/")) {
        log(`response: ${JSON.stringify(capturedJson)?.slice(0, 400)}...`);
      }
    });
    next();
  });
  const server = await registerRoutes(app);
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  registerKnowledgeRoutes(app);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
