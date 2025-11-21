import { z } from "zod";

/* ===========================
   USERS
   =========================== */
export const insertUserSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["admin", "senior", "junior", "viewer"]).default("viewer"),
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

/* ===========================
   OIL GRADES
   =========================== */
export const insertOilGradeSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  region: z.string().optional(),
  ffa: z.string().optional(),
  moisture: z.string().optional(),
  iv: z.string().optional(),
  dobi: z.string().optional(),
  freightUsd: z.number().optional(),
});
export const oilGradeSchema = insertOilGradeSchema.extend({ id: z.number() });
export type InsertOilGrade = z.infer<typeof insertOilGradeSchema>;
export type OilGrade = z.infer<typeof oilGradeSchema>;

/* ===========================
   MARKET DATA
   =========================== */
export const insertMarketDataSchema = z.object({
  id: z.string().optional(),
  gradeId: z.number(),
  gradeName: z.string(),
  date: z.string(),        // YYYY-MM-DD
  priceUsd: z.number(),
  usdTnd: z.number(),
  volume: z.string(),      // "1234 MT"
  change24h: z.number(),   // +/- en points
});
export const marketDataSchema = insertMarketDataSchema.extend({ id: z.string() });
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type MarketData = z.infer<typeof marketDataSchema>;

/* ===========================
   CHAT CHANNELS
   =========================== */
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

/* ===========================
   CHAT
   =========================== */
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

/* ===========================
   AUTH
   =========================== */
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginSchema>;

/* ===========================
   PRODUITS
   =========================== */
export const productComponentSchema = z.object({
  gradeName: z.string(),    // doit correspondre au "name" du grade
  percent: z.number(),      // ex: 70.5 (pas "70,5%")
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

/* ===========================
   CLIENTS  (rétro-compat: terms || paymentTerms)
   =========================== */
export const marketEnum = z.enum(["LOCAL", "EXPORT"]);

// Schéma d’entrée tolérant les deux clés. Normalisation -> paymentTerms
const rawInsertClientSchema = z.object({
  id: z.string().optional(),
  market: marketEnum.default("LOCAL"),
  name: z.string().min(1),

  // on accepte les deux, un seul requis
  paymentTerms: z.string().min(1).optional(),
  terms: z.string().min(1).optional(),

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
  updatedAt: z.string().optional(),
})
.superRefine((v, ctx) => {
  if (!v.paymentTerms && !v.terms) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Modalité requise (paymentTerms ou terms).",
      path: ["paymentTerms"],
    });
  }
})
.transform(v => ({
  ...v,
  paymentTerms: v.paymentTerms ?? v.terms!, // normalisation
  terms: undefined,                          // on retire l’alias
}));

export const insertClientSchema = rawInsertClientSchema;

// ⚠️ NE PAS utiliser .extend() sur un ZodEffects.
// On définit le schéma complet explicitement.
export const clientSchema = z.object({
  id: z.string(),
  market: marketEnum.default("LOCAL"),
  name: z.string().min(1),
  paymentTerms: z.string().min(1),

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
  updatedAt: z.string().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client       = z.infer<typeof clientSchema>;

/* ===========================
   CONTRATS (rétro-compat: date/quantityT  || contractDate/quantityTons)
   =========================== */
export const contractMarketEnum = z.enum(["LOCAL", "EXPORT"]);
export const priceCurrencyEnum = z.enum(["USD", "TND"]);

// Schéma d’insert tolérant anciens noms, avec normalisation.
const rawInsertContractSchema = z.object({
  id: z.string().optional(),

  // métadonnées
  code: z.string().optional(),
  market: contractMarketEnum,

  // ancien: date / nouveau: contractDate
  contractDate: z.string().optional(),
  date: z.string().optional(),

  // liaisons
  clientId: z.string(),
  clientName: z.string().optional(),
  productId: z.string(),
  productName: z.string().optional(),

  // ancien: quantityT / nouveau: quantityTons
  quantityTons: z.number().positive().optional(),
  quantityT: z.number().positive().optional(),

  // prix
  priceCurrency: priceCurrencyEnum.optional(),
  priceUsd: z.number().optional(),
  priceTnd: z.number().optional(),
  fxRate: z.number().positive().optional(),

  // période
  startDate: z.string(),
  endDate: z.string(),

  // divers
  notes: z.string().optional(),

  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
.transform(v => {
  const contractDate = v.contractDate ?? v.date ?? new Date().toISOString().slice(0, 10);
  const quantityTons = v.quantityTons ?? v.quantityT ?? 0;

  const priceCurrency: "USD" | "TND" =
    v.priceCurrency ?? (v.priceUsd != null ? "USD" : "TND");

  return {
    ...v,
    contractDate,
    quantityTons,
    priceCurrency,
  };
})
.superRefine((v, ctx) => {
  if (v.priceCurrency === "USD" && (v.priceUsd == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "priceUsd est requis lorsque priceCurrency = USD",
      path: ["priceUsd"],
    });
  }
  if (v.priceCurrency === "TND" && (v.priceTnd == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "priceTnd est requis lorsque priceCurrency = TND",
      path: ["priceTnd"],
    });
  }
  if (!v.contractDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "contractDate est requis",
      path: ["contractDate"],
    });
  }
  if (!v.quantityTons || v.quantityTons <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "quantityTons doit être > 0",
      path: ["quantityTons"],
    });
  }
});

export const insertContractSchema = rawInsertContractSchema;

// Schéma “persisté” (pas d’extend sur ZodEffects)
export const contractSchema = z.object({
  id: z.string(),
  code: z.string(),

  // métadonnées normalisées
  market: contractMarketEnum,
  contractDate: z.string(),

  // liaisons
  clientId: z.string(),
  clientName: z.string().optional(),
  productId: z.string(),
  productName: z.string().optional(),

  // commerce
  quantityTons: z.number().positive(),
  priceCurrency: priceCurrencyEnum,
  priceUsd: z.number().optional(),
  priceTnd: z.number().optional(),
  fxRate: z.number().positive().optional(),

  // période
  startDate: z.string(),
  endDate: z.string(),

  // divers
  notes: z.string().optional(),

  createdAt: z.string(),
  updatedAt: z.string(),
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract       = z.infer<typeof contractSchema>;
