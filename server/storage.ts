import { randomUUID } from "crypto";
import {
  type User, type InsertUser,
  type OilGrade, type InsertOilGrade,
  type MarketData, type InsertMarketData,
  type ChatMessage, type InsertChatMessage, type ChatChannel, type InsertChatChannel,
} from "@shared/schema";

type ForwardPoint = { period: string; ask: number; code: string };

// --------- NEW types produits (côté storage interne) -----------
type ProductComponent = { gradeName: string; percent: number };
type Product = {
  id: string;
  name: string;
  reference?: string | null;
  composition: ProductComponent[];
  updatedAt: string;
};
// ---------------------------------------------------------------

/** ✅ Données forwards intégrées (ex-Excel), indexées par *nom* de grade (nouvelles étiquettes) */
const FORWARDS: Record<string, ForwardPoint[]> = {
  "RBD PO": [
    { period: "August",        ask: 1000, code: "PO-MYRBD-M1" },
    { period: "September",     ask: 1005, code: "PO-MYRBD-M2" },
    { period: "October",       ask: 1010, code: "PO-MYRBD-M3" },
    { period: "Oct/Nov/Dec",   ask: 1025, code: "PO-MYRBD-Q1" },
    { period: "Jan/Feb/Mar",   ask: 1010, code: "PO-MYRBD-Q2" },
    { period: "Apr/Mai/June",  ask: 1005, code: "PO-MYRBD-Q3" },
  ],
  "RBD POL IV56": [
    { period: "August",        ask: 1015, code: "PO-MYRBD-M1" },
    { period: "September",     ask: 1020, code: "PO-MYRBD-M2" },
    { period: "October",       ask: 1035, code: "PO-MYRBD-M3" },
    { period: "Oct/Nov/Dec",   ask: 1035, code: "PO-MYRBD-Q1" },
    { period: "Jan/Feb/Mar",   ask: 1020, code: "PO-MYRBD-Q2" },
    { period: "Apr/Mai/June",  ask: 1015, code: "PO-MYRBD-Q3" },
  ],
  "RBD PS": [
    { period: "August",        ask: 1010, code: "PO-MYRBD-M1" },
    { period: "September",     ask: 1015, code: "PO-MYRBD-M2" },
  ],
  "RBD CNO": [
    { period: "Jul25/Aug25",   ask: 2200, code: "RBD CNO" },
    { period: "Aug25/Sep25",   ask: 2000, code: "RBD CNO" },
    { period: "Sep25/Oct25",   ask: 2000, code: "RBD CNO" },
    { period: "Oct25/Nov25",   ask: 1950, code: "RBD CNO" },
    { period: "Nov25/Dec25",   ask: 1950, code: "RBD CNO" },
    { period: "Dec25/Jan26",   ask: 1940, code: "RBD CNO" },
  ],
  "RBD PKO": [
    { period: "Jul25/Aug25",   ask: 2200, code: "RBD PKO" },
    { period: "Aug25/Sep25",   ask: 2000, code: "RBD PKO" },
    { period: "Sep25/Oct25",   ask: 2000, code: "RBD PKO" },
    { period: "Oct25/Nov25",   ask: 1950, code: "RBD PKO" },
  ],
  "RBD PKS": [
    { period: "Jul25/Aug25",   ask: 450, code: "RBD PKS" },
    { period: "Aug25/Sep25",   ask: 455, code: "RBD PKS" },
    { period: "Sep25/Oct25",   ask: 460, code: "RBD PKS" },
  ],
};

export interface IStorage {
  // Channels
  getAllChatChannels(): Promise<ChatChannel[]>;
  createChatChannel(data: InsertChatChannel): Promise<ChatChannel>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Oil grades
  getAllOilGrades(): Promise<OilGrade[]>;
  getOilGrade(id: number): Promise<OilGrade | undefined>;
  createOilGrade(grade: InsertOilGrade): Promise<OilGrade>;
  updateOilGradeFreight(id: number, freightUsd: number): Promise<any>;
  updateOilGrade?(id: number, patch: Partial<Omit<OilGrade,"id"> & { freightUsd?: number }>): Promise<OilGrade>;

  // Market
  getAllMarketData(): Promise<MarketData[]>;
  getMarketDataByGrade(gradeId: number): Promise<MarketData[]>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;
  getForwardPricesByGrade(gradeId: number): Promise<Array<{ gradeId: number; gradeName: string; code: string; period: string; ask: number }>>;
  seedMarketForGrade(gradeId: number, days?: number): Promise<void>;

  // Chat
  getAllChatMessages(): Promise<ChatMessage[]>;
  getChatMessagesByChannel(channelId: string): Promise<ChatMessage[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;

  // Ops
  getAllFixings(): Promise<any[]>;
  getAllVessels(): Promise<any[]>;
  getAllKnowledge(): Promise<any[]>;
  createFixing(data:any): Promise<any>;
  updateFixing(id:string, data:any): Promise<any>;
  deleteFixing(id:string): Promise<void>;
  createVessel(data:any): Promise<any>;
  updateVessel(id:string, data:any): Promise<any>;
  deleteVessel(id:string): Promise<void>;
  createKnowledge(data:any): Promise<any>;

  // --------- NEW: Produits ----------
  getAllProducts(): Promise<Product[]>;
  createProduct(data: { name: string; reference?: string | null; composition: ProductComponent[] }): Promise<Product>;
  updateProduct(id: string, data: Partial<Omit<Product,"id"|"updatedAt">>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
}

class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private oilGrades = new Map<number, OilGrade>();
  private marketData = new Map<string, MarketData>();
  private fixings = new Map<string, any>();
  private vessels = new Map<string, any>();
  private knowledge = new Map<string, any>();

  private chatMessages = new Map<string, ChatMessage>();
  private chatChannels = new Map<string, ChatChannel>();

  private forwardPrices = new Map<number, Array<{ gradeId: number; gradeName: string; code: string; period: string; ask: number }>>();
  private forwardCurves = new Map<string, ForwardPoint[]>();

  // --------- NEW: stockage Produits ----------
  private products = new Map<string, Product>();

  /** ✅ codes courts adaptés aux nouveaux noms */
  private codeFromGradeName(name: string): string {
    const map: Record<string,string> = {
      "RBD PO": "RBDPO",
      "RBD PS": "RBDPS",
      "RBD POL IV56": "RBDPOL56",
      "RBD POL IV64": "RBDPOL64",
      "RBD PKO": "PKO",
      "RBD CNO": "CNO",
      "RBD PKS": "PKS",
      "CDSBO": "CDSBO",
    };
    return map[name] ?? name.toUpperCase().replace(/\s+/g, "_");
  }

  // util -> convertit "70,5%" ou "101,50%" en nombre 70.5 / 101.5
  private parsePercentCell(v: string | number | null | undefined): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return v;
    const cleaned = v.replace(/\s+/g, "").replace("%", "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  constructor() {
    // Seed users
    const seedUsers: User[] = [
      { id: "1", name: "Youssef SAYADI", email: "y.sayadi@direct-medical.net", password: "admin123", role: "admin" },
      { id: "2", name: "Senior Buyer", email: "senior@oiltracker.com", password: "senior123", role: "senior" },
      { id: "3", name: "Junior Buyer", email: "junior@oiltracker.com", password: "junior123", role: "junior" },
      { id: "4", name: "Viewer", email: "viewer@oiltracker.com", password: "viewer123", role: "viewer" },
    ];
    seedUsers.forEach(u => this.users.set(u.id, u));

    // ✅ Seed grades
    const grades: Array<Omit<OilGrade, "id"> & { freightUsd?: number }> = [
      { name: "RBD PO",         region: "Malaysia",   ffa: "< 0.1%", moisture: "< 0.1%", iv: "52-56", dobi: "2.4+", freightUsd: 120 },
      { name: "RBD PS",         region: "Malaysia",   ffa: "< 0.1%",                                        freightUsd: 100 },
      { name: "RBD POL IV56",   region: "Malaysia",   iv: "56",                                              freightUsd: 130 },
      { name: "RBD POL IV64",   region: "Malaysia",   iv: "64",                                              freightUsd: 140 },
      { name: "RBD PKO",        region: "Indonesia",                                                          freightUsd: 180 },
      { name: "RBD CNO",        region: "Philippines",                                                        freightUsd: 200 },
      { name: "CDSBO",          region: "USA",                                                                freightUsd: 0   },
      { name: "RBD PKS",        region: "Indonesia",   ffa: "~",                                              freightUsd: 170 },
    ];
    grades.forEach((g, idx) => this.oilGrades.set(idx + 1, { id: idx + 1, ...g }));

    // Seed market data: 30 jours par grade
    const today = new Date();
    for (const grade of this.oilGrades.values()) {
      for (let d = 0; d < 30; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (29 - d));
        const base = 900 + (grade.id % 5) * 50;
        const noise = (Math.random() - 0.5) * 30;
        const trend = Math.sin(d / 5) * 12;
        const priceUsd = Math.round((base + noise + trend) * 100) / 100;
        const usdTnd = Math.round((3.1 + Math.random() * 0.4) * 1000) / 1000;
        const change24h = Math.round(((Math.random() - 0.5) * 6) * 10) / 10;
        const id = randomUUID();
        this.marketData.set(id, {
          id,
          gradeId: grade.id,
          gradeName: grade.name,
          date: date.toISOString().split("T")[0],
          priceUsd,
          usdTnd,
          volume: `${Math.floor(Math.random() * 2000 + 400)} MT`,
          change24h,
        });
      }
    }

    // Seed fixings / vessels / knowledge
    [
      { date: new Date().toISOString().slice(0,10), route: "MAL → TUN", grade: "RBD PO",  volume: "5,000 MT", priceUsd: 980, counterparty: "Wilmar",    vessel: "June shipment 25" },
      { date: new Date(Date.now()-86400000).toISOString().slice(0,10), route: "IDN → TUN", grade: "RBD PKO", volume: "3,000 MT", priceUsd: 1210, counterparty: "Musim Mas", vessel: "August shipment 25" },
      { date: new Date(Date.now()-3*86400000).toISOString().slice(0,10), route: "USA → TUN", grade: "CDSBO",   volume: "8,000 MT", priceUsd: 890, counterparty: "Bunge",     vessel: "January shipment 26" },
    ].forEach((f) => { const id = randomUUID(); this.fixings.set(id, { id, ...f }); });

    [
      { name: "June shipment 25",    type: "Tanker", dwt: 45000, status: "Laden",    eta: "2025-09-02", origin: "Port Klang",  destination: "Rades" },
      { name: "August shipment 25",  type: "Tanker", dwt: 38000, status: "Ballast",  eta: "2025-08-28", origin: "Belawan",     destination: "Rades" },
      { name: "January shipment 26", type: "Tanker", dwt: 52000, status: "At anchor", eta: "2025-09-10", origin: "New Orleans", destination: "Rades" },
    ].forEach((v) => { const id = randomUUID(); this.vessels.set(id, { id, ...v }); });

    [
      { title: "Spec RBD PO",         tags: ["spec","quality"], excerpt: "FFA < 0.1%, Moisture < 0.1%, DOBI 2.4+", content: "Detailed spec for RBD PO used by DMA." },
      { title: "Contract Template (CIF)", tags: ["contract","legal"], excerpt: "Standard CIF template for palm products", content: "Clause set for CIF DMA imports." },
      { title: "Ops Checklist: Discharge Rades", tags: ["ops","port"], excerpt: "Pre-arrival docs, draft survey, sampling", content: "Operational checklist for Rades discharge." },
    ].forEach(k => { const id = randomUUID(); this.knowledge.set(id, { id, updatedAt: new Date().toISOString(), ...k }); });

    // Channels + Chat
    const chGeneralId = randomUUID();
    const chTradingId = randomUUID();
    const chOpsId = randomUUID();
    const now = new Date();
    this.chatChannels.set(chGeneralId, { id: chGeneralId, name: "general", createdAt: now });
    this.chatChannels.set(chTradingId, { id: chTradingId, name: "trading", createdAt: now });
    this.chatChannels.set(chOpsId, { id: chOpsId, name: "ops", createdAt: now });

    const seedChat: Omit<ChatMessage,"id"|"timestamp">[] = [
      { sender: "System",       message: "Welcome to OilTracker team chat", userId: null },
      { sender: "Senior Buyer", message: "Palm oil prices rallied this week. Should we increase our position?", userId: "2" },
      { sender: "Youssef SAYADI", message: "Agreed. Let's align on risk and TND exposure tomorrow.", userId: "1" },
      { sender: "Junior Buyer", message: "I uploaded a basis spreadsheet from Malaysia.", userId: "3" },
    ];
    seedChat.forEach(m => {
      const id = randomUUID();
      this.chatMessages.set(id, { id, timestamp: new Date(), channelId: chGeneralId, ...m });
    });

    // ▶︎ Seed des forwards intégrés (avec les nouveaux noms)
    for (const [name, points] of Object.entries(FORWARDS)) {
      this.forwardCurves.set(name.trim(), points);
    }

    // ▶︎ NEW: Seed Produits (à partir du tableau fourni)
    const seed = (name: string, obj: Partial<Record<string, string | number>>) => {
      const id = randomUUID();
      const composition: ProductComponent[] = Object.entries(obj)
        .map(([gradeName, v]) => ({
          gradeName,
          percent: this.parsePercentCell(v),
        }))
        .filter(c => c.percent !== 0);
      const p: Product = {
        id,
        name,
        reference: null,
        composition,
        updatedAt: new Date().toISOString(),
      };
      this.products.set(id, p);
    };

    seed("EMAS 360-7", { "RBD PO": "70,5%", "RBD POL IV56": "20,5%", "RBD PS": "10,5%" });
    seed("EMAS 360-9", { "RBD PO": "70,5%", "RBD POL IV56": "10,5%", "RBD PS": "20,5%" });
    seed("EMAS 404",   { "RBD PO": "101,50%" });
    seed("KERNEL 357", { "RBD PKO": "101,50%" });
    seed("HELIOS 360-7", { "RBD PO": "65,5%", "RBD POL IV56": "5,5%", "RBD CNO": "30,5%" });
    seed("ALBA 304-3", { "RBD POL IV64": "101,50%" });
    seed("CBS PREMIUM", { "RBD PKS": "101,50%" });
    seed("IRIS-204", { "RBD POL IV56": "101,50%" });
    seed("HVSJ", { "CDSBO": "105%" });
  }

  // Users
  async getUser(id: string) { return this.users.get(id); }
  async getUserByEmail(email: string) {
    for (const u of this.users.values()) if (u.email === email) return u;
    return undefined;
  }
  async createUser(user: InsertUser) {
    const id = randomUUID();
    const u: User = { id, name: user.name, email: user.email, password: user.password, role: user.role ?? "viewer" };
    this.users.set(id, u);
    return u;
  }

  // Grades
  async getAllOilGrades() { return Array.from(this.oilGrades.values()); }
  async getOilGrade(id: number) { return this.oilGrades.get(id); }

  async createOilGrade(grade: InsertOilGrade) {
    const id = Math.max(0, ...this.oilGrades.keys()) + 1;
    const g: OilGrade = { id, ...grade, name: grade.name || `Grade ${id}` };
    this.oilGrades.set(id, g);

    await this.seedMarketForGrade(id, 30);

    const forwards = FORWARDS[(g.name || "").trim()];
    if (forwards && forwards.length) {
      this.forwardCurves.set(g.name.trim(), forwards);
    }

    return g;
  }

  async updateOilGradeFreight(id: number, freightUsd: number) {
    const g = this.oilGrades.get(id);
    if (!g) throw new Error("Grade not found");
    const updated = { ...(g as any), freightUsd: Number(freightUsd) };
    this.oilGrades.set(id, updated as any);
    return updated;
  }

  async updateOilGrade(id: number, patch: Partial<Omit<OilGrade,"id"> & { freightUsd?: number }>) {
    const current = this.oilGrades.get(id);
    if (!current) throw new Error("Grade not found");

    const next: any = { ...current };
    for (const k of ["name","region","ffa","moisture","iv","dobi"] as const) {
      if (patch[k] !== undefined) next[k] = patch[k];
    }
    if (patch.freightUsd !== undefined) next.freightUsd = Number(patch.freightUsd);

    const nameChanged = patch.name && patch.name !== current.name;

    if (nameChanged) {
      for (const m of this.marketData.values()) {
        if (m.gradeId === id) (m as any).gradeName = patch.name;
      }
      this.forwardPrices.delete(id);
      const fwd = FORWARDS[(patch.name || "").trim()];
      if (fwd && fwd.length) this.forwardCurves.set(String(patch.name).trim(), fwd);
    }

    this.oilGrades.set(id, next);
    return next as OilGrade;
  }

  // Market
  async getAllMarketData() {
    return Array.from(this.marketData.values()).sort((a,b) => a.date.localeCompare(b.date));
  }
  async getMarketDataByGrade(gradeId: number) {
    return Array.from(this.marketData.values()).filter(m => m.gradeId === gradeId).sort((a,b) => a.date.localeCompare(b.date));
  }
  async createMarketData(data: InsertMarketData) {
    const id = randomUUID();
    const m: MarketData = { id, ...data };
    this.marketData.set(id, m);
    return m;
  }

  async seedMarketForGrade(gradeId: number, days = 30) {
    const grade = this.oilGrades.get(gradeId);
    if (!grade) return;

    const today = new Date();
    for (let d = 0; d < days; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - d));
      const base = 900 + (grade.id % 5) * 50;
      const noise = (Math.random() - 0.5) * 30;
      const trend = Math.sin(d / 5) * 12;
      const priceUsd = Math.round((base + noise + trend) * 100) / 100;
      const usdTnd = Math.round((3.1 + Math.random() * 0.4) * 1000) / 1000;
      const change24h = Math.round(((Math.random() - 0.5) * 6) * 10) / 10;
      const id = randomUUID();
      this.marketData.set(id, {
        id,
        gradeId: grade.id,
        gradeName: grade.name,
        date: date.toISOString().split("T")[0],
        priceUsd,
        usdTnd,
        volume: `${Math.floor(Math.random() * 2000 + 400)} MT`,
        change24h,
      });
    }

    this.forwardPrices.delete(gradeId);
  }

  async getForwardPricesByGrade(gradeId: number) {
    const g = this.oilGrades.get(gradeId);
    if (!g) return [];

    const curve = this.forwardCurves.get((g.name || "").trim());
    if (curve && curve.length) {
      return curve.map(p => ({
        gradeId,
        gradeName: g.name,
        code: p.code,
        period: p.period,
        ask: p.ask,
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
      { gradeId, gradeName: last.gradeName, code, period: "M+1",     ask: Math.round((base + 10) * 100) / 100 },
      { gradeId, gradeName: last.gradeName, code, period: "M+2",     ask: Math.round((base + 20) * 100) / 100 },
      { gradeId, gradeName: last.gradeName, code, period: "M+3",     ask: Math.round((base + 30) * 100) / 100 },
    ];

    this.forwardPrices.set(gradeId, rows);
    return rows;
  }

  // Chat
  async getAllChatMessages() {
    return Array.from(this.chatMessages.values()).sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  async getChatMessagesByChannel(channelId: string) {
    return Array.from(this.chatMessages.values())
      .filter(m => m.channelId === channelId)
      .sort((a,b)=>a.timestamp.getTime()-b.timestamp.getTime());
  }
  async createChatMessage(data: InsertChatMessage) {
    const id = randomUUID();
    const anyGeneral = Array.from(this.chatChannels.values()).find(c => c.name==='general');
    const channelId = data.channelId ?? anyGeneral?.id ?? Array.from(this.chatChannels.keys())[0];
    const m: ChatMessage = { id, sender: data.sender, message: data.message, userId: data.userId ?? null, timestamp: new Date(), channelId };
    this.chatMessages.set(id, m);
    return m;
  }

  // Fixings + Vessels + Knowledge
  async getAllFixings() {
    return Array.from(this.fixings.values()).sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  }
  async getAllVessels() { return Array.from(this.vessels.values()); }
  async getAllKnowledge() {
    return Array.from(this.knowledge.values()).sort((a,b)=> String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }
  async createFixing(data:any){
    const id = randomUUID();
    const f = {
      id,
      date: data.date,
      route: data.route,
      grade: data.grade,
      volume: data.volume,
      priceUsd: Number(data.priceUsd),
      counterparty: data.counterparty,
      vessel: data.vessel || undefined
    };
    this.fixings.set(id, f);
    if (f.vessel && !Array.from(this.vessels.values()).some((v:any)=>v.name===f.vessel)) {
      const vId = randomUUID();
      this.vessels.set(vId, { id:vId, name:f.vessel, type:"Tanker", dwt:0, status:"Planned" });
    }
    return f;
  }
  async updateFixing(id:string, data:any){
    const existing = this.fixings.get(id);
    if (!existing) throw new Error("Fixing not found");
    const updated = { ...existing, ...data, id };
    this.fixings.set(id, updated);
    if (updated.vessel && !Array.from(this.vessels.values()).some((v:any)=>v.name===updated.vessel)) {
      const vId = randomUUID();
      this.vessels.set(vId, { id:vId, name:updated.vessel, type:"Tanker", dwt:0, status:"Unknown" });
    }
    return updated;
  }
  async deleteFixing(id:string){
    this.fixings.delete(id);
  }
  async createVessel(data:any){
    const id = randomUUID();
    const v = { id, name:data.name, type:data.type||"Tanker", dwt:Number(data.dwt||0), status:data.status||"Unknown", eta:data.eta, origin:data.origin, destination:data.destination };
    this.vessels.set(id, v);
    return v;
  }
  async updateVessel(id:string, data:any){
    const existing = this.vessels.get(id);
    if (!existing) throw new Error("Vessel not found");
    const updated = { ...existing, ...data, id };
    updated.dwt = Number(updated.dwt ?? existing.dwt ?? 0);
    updated.type = updated.type || "Tanker";
    updated.status = updated.status || "Unknown";
    this.vessels.set(id, updated);
    return updated;
  }
  async deleteVessel(id:string){
    this.vessels.delete(id);
  }
  async createKnowledge(data:any){
    const id = randomUUID();
    const k = { id, title:data.title||"Untitled", tags:data.tags||[], excerpt:data.excerpt||data.link||"", content:data.content||data.link||"", updatedAt: new Date().toISOString() };
    this.knowledge.set(id, k);
    return k;
  }

  // Channels
  async getAllChatChannels(): Promise<ChatChannel[]> {
    return Array.from(this.chatChannels.values()).sort((a,b)=>a.name.localeCompare(b.name));
  }
  async createChatChannel(data: InsertChatChannel): Promise<ChatChannel> {
    const id = randomUUID();
    const ch: ChatChannel = { id, name: data.name, createdAt: new Date() };
    this.chatChannels.set(id, ch);
    return ch;
  }

  // ------------------- Produits -------------------
  async getAllProducts() {
    return Array.from(this.products.values()).sort((a,b)=> a.name.localeCompare(b.name));
  }
  async createProduct(data: { name: string; reference?: string | null; composition: ProductComponent[] }) {
    const id = randomUUID();
    const composition = (data.composition || [])
      .map(c => ({ gradeName: String(c.gradeName), percent: Number(c.percent) || 0 }))
      .filter(c => c.percent !== 0);
    const p: Product = {
      id,
      name: data.name,
      reference: data.reference ?? null,
      composition,
      updatedAt: new Date().toISOString(),
    };
    this.products.set(id, p);
    return p;
  }
  async updateProduct(id: string, data: Partial<Omit<Product,"id"|"updatedAt">>) {
    const existing = this.products.get(id);
    if (!existing) throw new Error("Product not found");
    const next: Product = {
      ...existing,
      ...("name" in data ? { name: String(data.name) } : {}),
      ...("reference" in data ? { reference: (data as any).reference ?? null } : {}),
      ...(data.composition
        ? { composition: data.composition.map(c => ({ gradeName: String(c.gradeName), percent: Number(c.percent)||0 })).filter(c => c.percent !== 0) }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    this.products.set(id, next);
    return next;
    }
  async deleteProduct(id: string) {
    this.products.delete(id);
  }
}

export const storage = new MemStorage();
