import { z } from "zod";

// USERS
export const insertUserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin","senior","junior","viewer"]).default("viewer"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export const userSchema = insertUserSchema.extend({
  id: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof userSchema>;

// OIL GRADES
export const insertOilGradeSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  region: z.string().optional(),
  ffa: z.string().optional(),
  moisture: z.string().optional(),
  iv: z.string().optional(),
  dobi: z.string().optional(),
  // on autorise freightUsd côté API (optionnel)
  freightUsd: z.number().optional(),
});
export const oilGradeSchema = insertOilGradeSchema.extend({ id: z.number() });
export type InsertOilGrade = z.infer<typeof insertOilGradeSchema>;
export type OilGrade = z.infer<typeof oilGradeSchema>;

// MARKET DATA
export const insertMarketDataSchema = z.object({
  id: z.string().optional(),
  gradeId: z.number(),
  gradeName: z.string(),
  date: z.string(),        // YYYY-MM-DD
  priceUsd: z.number(),
  usdTnd: z.number(),
  volume: z.string(),      // "1234 MT"
  change24h: z.number(),   // percentage +/- (en points)
});
export const marketDataSchema = insertMarketDataSchema.extend({ id: z.string() });
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = z.infer<typeof marketDataSchema>;

// CHAT CHANNELS
export const insertChatChannelSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  createdAt: z.date().optional(),
});
export const chatChannelSchema = insertChatChannelSchema.extend({
  id: z.string(),
  createdAt: z.date(),
});
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;
export type ChatChannel = z.infer<typeof chatChannelSchema>;

// CHAT
export const insertChatMessageSchema = z.object({
  id: z.string().optional(),
  sender: z.string(),
  message: z.string(),
  channelId: z.string().optional(),
  userId: z.string().nullable().optional(),
  timestamp: z.date().optional(),
});
export const chatMessageSchema = insertChatMessageSchema.extend({
  id: z.string(),
  timestamp: z.date(),
  channelId: z.string(),
});
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

// AUTH
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginSchema>;

// ----------------- NEW: PRODUITS -----------------
export const productComponentSchema = z.object({
  gradeName: z.string(),        // doit correspondre au name du grade
  percent: z.number(),          // ex: 70.5 (pas "70,5%")
});

export const insertProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  reference: z.string().nullable().optional(),
  composition: z.array(productComponentSchema).default([]),
  updatedAt: z.string().optional(),
});
export const productSchema = insertProductSchema.extend({
  id: z.string(),
  updatedAt: z.string(),
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = z.infer<typeof productSchema>;
