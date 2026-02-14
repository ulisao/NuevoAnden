import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

function isPast(dateStr: string, hour: number) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const currentHour = now.getHours();

  if (dateStr < todayStr) return true;
  if (dateStr === todayStr && hour <= currentHour) return true;
  return false;
}

export const create = mutation({
  args: {
    courtType: v.string(),
    date: v.string(),
    hour: v.number(),
    userName: v.string(),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Debes estar logueado");

    const myActiveBookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();

    if (myActiveBookings.length >= 2) {
      throw new Error("Límite alcanzado: No puedes tener más de 2 reservas activas al mismo tiempo.");
    }

    // 1. VALIDACIÓN: Chequear pasado
    if (isPast(args.date, args.hour)) {
      throw new Error("No puedes reservar en el pasado");
    }

    // 2. Verificar duplicados (Solo nos importan las CONFIRMADAS)
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_date_court", (q) => 
        q.eq("date", args.date).eq("courtType", args.courtType)
      )
      .filter((q) => q.eq(q.field("hour"), args.hour))
      .filter((q) => q.eq(q.field("status"), "confirmed")) // <--- CAMBIO IMPORTANTE
      .first();

    if (existing) {
      throw new Error("Horario ya reservado");
    }

    // 3. Crear reserva en estado PENDIENTE DE PAGO
    const bookingId = await ctx.db.insert("bookings", {
      userId: identity.subject,
      userName: args.userName,
      userEmail: args.userEmail,
      courtType: args.courtType,
      date: args.date,
      hour: args.hour,
      status: "pending_payment", // <--- Nace pendiente
    });

    return bookingId; // Retornamos el ID para usarlo en MercadoPago
  },
});

// Nueva mutación para confirmar el pago
export const confirmBooking = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Reserva no encontrada");
    
    // Solo confirmamos si estaba pendiente
    if (booking.status === "pending_payment") {
      await ctx.db.patch(args.bookingId, { status: "confirmed" });
    }
  },
});

export const getByDate = query({
  args: { date: v.string(), courtType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_date_court", (q) => 
        q.eq("date", args.date).eq("courtType", args.courtType)
      )
      // Solo mostramos las confirmadas como "Ocupadas" en el calendario
      .filter((q) => q.eq(q.field("status"), "confirmed")) 
      .collect();
  },
});

export const getAdminBookings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.email !== ADMIN_EMAIL) return [];
    
    return await ctx.db.query("bookings").order("desc").take(100);
  },
});

export const getMyBookings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      // Opcional: Si queres que el usuario vea sus intentos fallidos, quitá este filtro
      .filter((q) => q.eq(q.field("status"), "confirmed")) 
      .collect();
      
    return bookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});

export const cancel = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autorizado");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Reserva no encontrada");

    const isOwner = booking.userId === identity.subject;
    const isAdmin = identity.email === ADMIN_EMAIL;

    if (!isOwner && !isAdmin) {
      throw new Error("No tienes permisos para cancelar esta reserva");
    }

    await ctx.db.patch(args.bookingId, { status: "cancelled" });
  },
});

export const adminBlock = mutation({
  args: {
    courtType: v.string(),
    date: v.string(),
    hour: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.email !== ADMIN_EMAIL) {
      throw new Error("Solo el dueño puede bloquear canchas");
    }

    await ctx.db.insert("bookings", {
      userId: "ADMIN_BLOCK",
      userName: "BLOQUEO MANUAL",
      userEmail: "ADMIN",
      courtType: args.courtType,
      date: args.date,
      hour: args.hour,
      status: "confirmed",
    });
  },
});