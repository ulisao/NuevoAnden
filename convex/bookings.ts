import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Email del dueño (CAMBIALO POR EL TUYO REAL)
const ADMIN_EMAIL = "ulisessbaretta@gmail.com"; 

function isPast(dateStr: string, hour: number) {
  const now = new Date();
  // Creamos fecha del turno (asumiendo hora local o UTC manejo simple)
  // Ojo: Para simplicidad comparamos strings y horas locales del servidor
  const todayStr = now.toISOString().split("T")[0];
  const currentHour = now.getHours();

  if (dateStr < todayStr) return true; // Fecha pasada
  if (dateStr === todayStr && hour <= currentHour) return true; // Hora pasada hoy
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

    // 1. VALIDACIÓN NUEVA: Chequear pasado
    if (isPast(args.date, args.hour)) {
      throw new Error("No puedes reservar en el pasado");
    }

    // 2. Verificar duplicados (código anterior...)
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_date_court", (q) => 
        q.eq("date", args.date).eq("courtType", args.courtType)
      )
      .filter((q) => q.eq(q.field("hour"), args.hour))
      .first();

    if (existing && existing.status === "confirmed") {
      throw new Error("Horario ya reservado");
    }

    await ctx.db.insert("bookings", {
      userId: identity.subject,
      userName: args.userName,
      userEmail: args.userEmail,
      courtType: args.courtType,
      date: args.date,
      hour: args.hour,
      status: "confirmed",
    });
  },
});

// 1. Obtener reservas de un día específico (Para el calendario)
export const getByDate = query({
  args: { date: v.string(), courtType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_date_court", (q) => 
        q.eq("date", args.date).eq("courtType", args.courtType)
      )
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();
  },
});

// 3. Obtener TODAS las reservas (Solo Admin)
export const getAdminBookings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.email !== ADMIN_EMAIL) return []; // Retorna vacío si no es admin
    
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
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .collect();
      
    // Opcional: Ordenarlas por fecha (las más recientes primero)
    return bookings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
});

// 4. Cancelar reserva
export const cancel = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("No autorizado");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Reserva no encontrada");

    // LÓGICA ACTUALIZADA: 
    // Puede cancelar si: es el dueño de la reserva O es el Administrador
    const isOwner = booking.userId === identity.subject;
    const isAdmin = identity.email === ADMIN_EMAIL;

    if (!isOwner && !isAdmin) {
      throw new Error("No tienes permisos para cancelar esta reserva");
    }

    // En lugar de borrar, marcamos como cancelado para mantener historial
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
    // Reemplaza con tu email real
    if (!identity || identity.email !== "ulisessbaretta@gmail.com") {
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