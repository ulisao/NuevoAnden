import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    userId: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    courtType: v.string(),
    date: v.string(),
    hour: v.number(),
    status: v.string(), // "pending_payment", "confirmed", "cancelled"
  })
  .index("by_date_court", ["date", "courtType"])
  .index("by_user", ["userId"])
  // Índice útil para buscar reservas por estado (ej: para limpiar las pendientes viejas)
  .index("by_status", ["status"]),
});