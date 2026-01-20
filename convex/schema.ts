import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  bookings: defineTable({
    userId: v.string(),        // ID de Clerk
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    courtType: v.string(),     // "5v5" o "7v7"
    date: v.string(),          // "YYYY-MM-DD"
    hour: v.number(),          // 18, 19, 20...
    status: v.string(),        // "confirmed", "cancelled"
  })
  .index("by_date_court", ["date", "courtType"]) // Para ver disponibilidad
  .index("by_user", ["userId"]),                 // Para ver mis reservas
});