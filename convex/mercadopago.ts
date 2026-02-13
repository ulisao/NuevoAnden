"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import MercadoPagoConfig, { Preference } from "mercadopago";

export const createPreference = action({
  args: {
    bookingId: v.id("bookings"),
    title: v.string(),
    price: v.number(),
    platformUrl: v.string(), 
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
    if (!accessToken) {
      throw new Error("Falta MP_ACCESS_TOKEN en variables de entorno");
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);
    
    // 1. Limpiamos la URL y el ID
    const baseUrl = args.platformUrl.replace(/\/$/, "").trim();
    const cleanId = String(args.bookingId);
    
    // 2. DETECTAMOS SI ES PRODUCCIÓN O LOCAL
    // Si la URL NO tiene localhost ni 127.0.0.1, asumimos que es Producción
    const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

    const successUrl = `${baseUrl}/dashboard?status=success&bookingId=${cleanId}`;
    const failureUrl = `${baseUrl}/dashboard?status=failure`;
    const pendingUrl = `${baseUrl}/dashboard?status=pending`;

    // 3. Construimos el objeto de preferencia
    const preferenceBody: any = {
      items: [
        {
          id: cleanId,
          title: args.title,
          quantity: 1,
          unit_price: Number(args.price),
          currency_id: "ARS",
        },
      ],
      back_urls: {
        success: successUrl,
        failure: failureUrl,
        pending: pendingUrl,
      },
      // NOTA: 'auto_return' se agrega condicionalmente abajo
    };

    // 4. LÓGICA DE RETORNO AUTOMÁTICO
    // En Producción (Vercel) -> ACTIVADO (El usuario vuelve solo)
    // En Localhost -> DESACTIVADO (Para evitar errores de MP, el usuario clickea "Volver")
    if (!isLocalhost) {
      preferenceBody.auto_return = "approved";
    }

    console.log(`📦 Creando preferencia MP. URL: ${baseUrl}. AutoReturn: ${!isLocalhost ? 'ACTIVADO' : 'DESACTIVADO'}`);

    try {
      const result = await preference.create({
        body: preferenceBody,
      });

      if (!result.init_point) throw new Error("No init_point");

      return result.init_point;

    } catch (error: any) {
      console.error("❌ ERROR MP:", JSON.stringify(error, null, 2));
      throw new Error(`Fallo MP: ${error.message || "Error desconocido"}`);
    }
  },
});