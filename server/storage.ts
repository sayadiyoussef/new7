import { randomUUID } from "crypto";
import {
  type User, type InsertUser,
  type OilGrade, type InsertOilGrade,
  type MarketData, type InsertMarketData,
  type ChatMessage, type InsertChatMessage, type ChatChannel, type InsertChatChannel,
} from "@shared/schema";

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

  // Market
  getAllMarketData(): Promise<MarketData[]>;
  getMarketDataByGrade(gradeId: number): Promise<MarketData[]>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;

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
  createKnowledge(data:any): Promise<any>;
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

  constructor() {
    // Seed users
    const seedUsers: User[] = [
      { id: "1", name: "Youssef SAYADI", email: "y.sayadi@direct-medical.net", password: "admin123", role: "admin" },
      { id: "2", name: "Senior Buyer", email: "senior@oiltracker.com", password: "senior123", role: "senior" },
      { id: "3", name: "Junior Buyer", email: "junior@oiltracker.com", password: "junior123", role: "junior" },
      { id: "4", name: "Viewer", email: "viewer@oiltracker.com", password: "viewer123", role: "viewer" },
    ];
    seedUsers.forEach(u => this.users.set(u.id, u));

    // Seed grades
    const grades: Omit<OilGrade,"id">[] = [
      { name: "RBD Palm Oil", region: "Malaysia", ffa: "< 0.1%", moisture: "< 0.1%", iv: "52-56", dobi: "2.4+" },
      { name: "RBD Palm Stearin", region: "Malaysia", ffa: "< 0.1%" },
      { name: "RBD Palm Olein IV56", region: "Malaysia", iv: "56" },
      { name: "Olein IV64", region: "Malaysia", iv: "64" },
      { name: "RBD PKO", region: "Indonesia" },
      { name: "RBD CNO", region: "Philippines" },
      { name: "CDSBO", region: "USA" },
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

    
    // Seed fixings
    [
      { date: new Date().toISOString().slice(0,10), route: "MAL → TUN", grade: "RBD Palm Oil", volume: "5,000 MT", priceUsd: 980, counterparty: "Wilmar", vessel: "Pacific Dawn" },
      { date: new Date(Date.now()-86400000).toISOString().slice(0,10), route: "IDN → TUN", grade: "RBD PKO", volume: "3,000 MT", priceUsd: 1210, counterparty: "Musim Mas", vessel: "Eastern Star" },
      { date: new Date(Date.now()-3*86400000).toISOString().slice(0,10), route: "USA → TUN", grade: "CDSBO", volume: "8,000 MT", priceUsd: 890, counterparty: "Bunge", vessel: "Atlantic Pearl" },
    ].forEach((f) => { const id = randomUUID(); this.fixings.set(id, { id, ...f }); });

    // Seed vessels
    [
      { name: "Pacific Dawn", type: "Tanker", dwt: 45000, status: "Laden", eta: "2025-09-02", origin: "Port Klang", destination: "Rades" },
      { name: "Eastern Star", type: "Tanker", dwt: 38000, status: "Ballast", eta: "2025-08-28", origin: "Belawan", destination: "Rades" },
      { name: "Atlantic Pearl", type: "Tanker", dwt: 52000, status: "At anchor", eta: "2025-09-10", origin: "New Orleans", destination: "Rades" },
    ].forEach((v) => { const id = randomUUID(); this.vessels.set(id, { id, ...v }); });

    // Seed knowledge
    [
      { title: "Spec RBD Palm Oil", tags: ["spec","quality"], excerpt: "FFA < 0.1%, Moisture < 0.1%, DOBI 2.4+", content: "Detailed spec for RBD Palm Oil used by DMA." },
      { title: "Contract Template (CIF)", tags: ["contract","legal"], excerpt: "Standard CIF template for palm products", content: "Clause set for CIF DMA imports." },
      { title: "Ops Checklist: Discharge Rades", tags: ["ops","port"], excerpt: "Pre-arrival docs, draft survey, sampling", content: "Operational checklist for Rades discharge." },
    ].forEach(k => { const id = randomUUID(); this.knowledge.set(id, { id, updatedAt: new Date().toISOString(), ...k }); });

    // Seed channels
    const chGeneralId = randomUUID();
    const chTradingId = randomUUID();
    const chOpsId = randomUUID();
    const now = new Date();
    this.chatChannels.set(chGeneralId, { id: chGeneralId, name: "general", createdAt: now });
    this.chatChannels.set(chTradingId, { id: chTradingId, name: "trading", createdAt: now });
    this.chatChannels.set(chOpsId, { id: chOpsId, name: "ops", createdAt: now });

    // Seed chat
    const seedChat: Omit<ChatMessage,"id"|"timestamp">[] = [
      { sender: "System", message: "Welcome to OilTracker team chat", userId: null },
      { sender: "Senior Buyer", message: "Palm oil prices rallied this week. Should we increase our position?", userId: "2" },
      { sender: "Youssef SAYADI", message: "Agreed. Let's align on risk and TND exposure tomorrow.", userId: "1" },
      { sender: "Junior Buyer", message: "I uploaded a basis spreadsheet from Malaysia.", userId: "3" },
    ];
    seedChat.forEach(m => {
      const id = randomUUID();
      this.chatMessages.set(id, { id, timestamp: new Date(), channelId: chGeneralId, ...m });
    });
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
    return g;
  }

  // Market
  async getAllMarketData() { return Array.from(this.marketData.values()).sort((a,b) => a.date.localeCompare(b.date)); }
  async getMarketDataByGrade(gradeId: number) {
    return Array.from(this.marketData.values()).filter(m => m.gradeId === gradeId).sort((a,b) => a.date.localeCompare(b.date));
  }
  async createMarketData(data: InsertMarketData) {
    const id = randomUUID();
    const m: MarketData = { id, ...data };
    this.marketData.set(id, m);
    return m;
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

  async getAllFixings() { return Array.from(this.fixings.values()).sort((a,b)=>b.date.localeCompare(a.date)); }
  async getAllVessels() { return Array.from(this.vessels.values()); }
  async getAllKnowledge() { return Array.from(this.knowledge.values()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)); }
  async createFixing(data:any){ const id = randomUUID(); const f={ id, date:data.date, route:data.route, grade:data.grade, volume:data.volume, priceUsd:Number(data.priceUsd), counterparty:data.counterparty, vessel:data.vessel||undefined }

  async updateFixing(id:string, data:any){
    const existing = this.fixings.get(id);
    if (!existing) throw new Error("Fixing not found");
    const updated = { ...existing, ...data, id };
    this.fixings.set(id, updated);
    // ensure vessel exists if provided
    if (updated.vessel) {
      const vs = Array.from(this.vessels.values());
      if (!vs.find(v=>v.name===updated.vessel)) {
        const { randomUUID } = await import("node:crypto");
        const vId = randomUUID();
        this.vessels.set(vId, { id:vId, name: updated.vessel, type:"Tanker", dwt: "—", status: "Unknown" });
      }
    }
    return updated;
  }

  async deleteFixing(id:string){
    this.fixings.delete(id);
  }
; if (f.vessel && !Array.from(this.vessels.values()).some((v:any)=>v.name===f.vessel)){ const vId = randomUUID(); this.vessels.set(vId,{ id:vId, name:f.vessel, type:"Tanker", dwt:40000, status:"Planned" }); } this.fixings.set(id,f); return f; }
  async createVessel(data:any){ const id = randomUUID(); const v={ id, name:data.name, type:data.type||"Tanker", dwt:Number(data.dwt||0), status:data.status||"Unknown", eta:data.eta, origin:data.origin, destination:data.destination }; this.vessels.set(id,v); return v; }
  async createKnowledge(data:any){ const id = randomUUID(); const k={ id, title:data.title||"Untitled", tags:data.tags||[], excerpt:data.excerpt||data.link||"", content:data.content||data.link||"", updatedAt:new Date().toISOString() }; this.knowledge.set(id,k); return k; }

async getAllChatChannels(): Promise<ChatChannel[]> {
  return Array.from(this.chatChannels.values()).sort((a,b)=>a.name.localeCompare(b.name));
}
async createChatChannel(data: InsertChatChannel): Promise<ChatChannel> {
  const id = randomUUID();
  const ch: ChatChannel = { id, name: data.name, createdAt: new Date() };
  this.chatChannels.set(id, ch);
  return ch;
}
}

export const storage = new MemStorage();
