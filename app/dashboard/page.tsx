"use client";

import { useState, useEffect, Suspense } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";
import { useRouter, useSearchParams } from "next/navigation";

import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trash2, CalendarDays, Plus, Ticket, MessageCircle, CreditCard, ArrowRight } from "lucide-react";

const TELEFONO_DUEÑO = process.env.NEXT_PUBLIC_TELEFONO || "5493472430136";
const PRECIO_SEÑA = 2000; 

function DashboardContent() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Estados para manejo de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // NUEVO: Estados para manejar el fallback de pago móvil
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [courtType, setCourtType] = useState<"5v5" | "7v7">("5v5");

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";

  // --- QUERIES Y MUTACIONES ---
  const myBookings = useQuery(api.bookings.getMyBookings);
  const existingBookings = useQuery(api.bookings.getByDate, { date: dateStr, courtType });
  
  const createBooking = useMutation(api.bookings.create);
  const cancelBooking = useMutation(api.bookings.cancel);
  const confirmBooking = useMutation(api.bookings.confirmBooking);
  
  // Acción de MercadoPago (Backend)
  const createPreference = useAction(api.mercadopago.createPreference);

  // --- MANEJO DEL RETORNO DE MERCADOPAGO ---
  useEffect(() => {
    const status = searchParams.get("status");
    const bookingId = searchParams.get("bookingId");

    if (status === "success" && bookingId) {
      toast.promise(confirmBooking({ bookingId: bookingId as Id<"bookings"> }), {
        loading: "Confirmando tu reserva...",
        success: "¡Pago exitoso! Reserva confirmada.",
        error: "Hubo un error al confirmar la reserva."
      });
      router.replace("/dashboard");
    } else if (status === "failure") {
      toast.error("El pago no se completó. Intenta nuevamente.");
      router.replace("/dashboard");
    }
  }, [searchParams, confirmBooking, router]);

  const hours = [18, 19, 20, 21, 22, 23];

  const isPastTime = (hour: number) => {
    if (!date) return false;
    const now = new Date();
    if (isSameDay(date, now)) return hour <= now.getHours();
    return date < new Date(now.setHours(0,0,0,0));
  };

  const handleBooking = async (hour: number) => {
    if (!date || !user) return;

    try {
      toast.loading("Procesando...", { id: "payment-toast" });

      // 1. Crear reserva temporal
      const bookingId = await createBooking({
        courtType,
        date: dateStr,
        hour,
        userName: user.fullName || "Usuario",
        userEmail: user.primaryEmailAddress?.emailAddress || "",
      });

      // 2. Generar Link
      const currentUrl = window.location.origin; 
      const generatedUrl = await createPreference({
        bookingId,
        title: `Seña Cancha ${courtType} - ${format(date, "dd/MM")} ${hour}:00hs`,
        price: PRECIO_SEÑA,
        platformUrl: currentUrl, 
      });

      if (!generatedUrl) throw new Error("No se recibió el link de pago.");

      // 3. ESTRATEGIA MÓVIL "ANTI-BLOQUEO"
      // A. Guardamos la URL y abrimos el modal de confirmación por si el redireccionamiento falla
      setPaymentUrl(generatedUrl);
      setIsModalOpen(false); // Cerramos el de horarios
      setIsPaymentModalOpen(true); // Abrimos el de pago manual

      // B. Intentamos redirigir automáticamente igual (para PC)
      toast.dismiss("payment-toast");
      toast.success("¡Reserva iniciada!");
      
      // eslint-disable-next-line
      window.location.href = generatedUrl;

    } catch (error: any) {
      toast.dismiss("payment-toast");
      const msg = error.message.includes("Límite") 
        ? "Ya tienes 2 reservas activas." 
        : error.message.includes("reservado") 
        ? "Ese horario acaba de ocuparse."
        : "Error al iniciar la reserva.";
      toast.error(msg);
    }
  };

  const handleCancel = async (bookingId: Id<"bookings">) => {
    toast.promise(cancelBooking({ bookingId }), {
      loading: "Cancelando...",
      success: "Turno liberado",
      error: "Error"
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6 bg-background min-h-screen text-foreground transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">
          MIS RESERVAS
        </h1>
        <div className="flex items-center gap-3">
          <ModeToggle />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="flex justify-start">
        {/* DIALOG DE SELECCIÓN DE HORARIOS */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black px-8 h-14 md:h-12 shadow-xl shadow-green-600/20 transition-transform active:scale-95">
              <Plus className="w-5 h-5 mr-2" /> NUEVA RESERVA
            </Button>
          </DialogTrigger>
          
          <DialogContent className="w-[95vw] md:max-w-3xl rounded-t-3xl md:rounded-lg max-h-[90vh] overflow-y-auto bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-center md:text-left">Reservar Cancha</DialogTitle>
              <DialogDescription className="text-center md:text-left">
                Se requiere una seña de <span className="font-bold text-green-600">${PRECIO_SEÑA}</span> para confirmar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-4">
                <Tabs value={courtType} onValueChange={(v) => setCourtType(v as "5v5" | "7v7")}>
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="5v5" className="font-bold">Fútbol 5</TabsTrigger>
                    <TabsTrigger value="7v7" className="font-bold">Fútbol 7</TabsTrigger>
                  </TabsList>
                </Tabs>
                
                <div className="border rounded-2xl p-2 flex justify-center bg-card shadow-inner scale-95 md:scale-100 origin-top">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    locale={es}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md border shadow"
                    modifiersClassNames={{
                      selected: "!bg-green-600 !text-white hover:!bg-green-500 rounded-md",
                      today: "text-green-600 font-bold border border-green-600 rounded-md"
                    }}
                  />
                </div>
              </div>

              <div className="space-y-4 pb-4">
                <label className="text-[10px] font-black uppercase opacity-50 tracking-widest text-center block md:text-left">
                  Horarios para el {date ? format(date, "dd/MM") : "..."}
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  {hours.map((h) => {
                    const booked = existingBookings?.some(b => b.hour === h);
                    const past = isPastTime(h);
                    const disabled = booked || past;
                    
                    return (
                      <Button
                        key={h}
                        variant="outline"
                        disabled={disabled}
                        onClick={() => handleBooking(h)}
                        className={`h-14 md:h-16 text-lg font-black relative overflow-hidden transition-all flex flex-col justify-center gap-0 ${
                          disabled 
                            ? "bg-muted/30 border-muted text-muted-foreground/10" 
                            : "border-green-600/20 text-foreground hover:bg-green-600 hover:text-white hover:border-green-600"
                        }`}
                      >
                        <span className={disabled ? "line-through decoration-2" : ""}>{h}:00</span>
                        
                        {!disabled && !booked && (
                          <div className="flex items-center gap-1 mt-1">
                            <CreditCard className="w-3 h-3 opacity-70" />
                            <span className="text-[10px] font-normal opacity-90">Señar ${PRECIO_SEÑA}</span>
                          </div>
                        )}

                        {booked && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-destructive font-black rotate-12 uppercase bg-background/80">
                            Ocupado
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* --- NUEVO DIALOG: CONFIRMACIÓN DE PAGO (FALLBACK MÓVIL) --- */}
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="w-[90vw] md:max-w-md rounded-xl bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase text-center">¡Casi Listo!</DialogTitle>
              <DialogDescription className="text-center">
                Tu reserva está guardada. Si no se abrió MercadoPago automáticamente, usa el botón de abajo.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 flex justify-center">
              {paymentUrl && (
                <Button 
                  size="lg" 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold h-14 text-lg shadow-xl shadow-blue-500/20 animate-pulse"
                  onClick={() => {
                    // Clic manual: Esto NUNCA falla en móviles
                    window.location.href = paymentUrl;
                  }}
                >
                  PAGAR AHORA <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              )}
            </div>
            <DialogFooter>
               <p className="text-xs text-center text-muted-foreground w-full">
                 Tenés 5 minutos para completar el pago antes de que se libere el turno.
               </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!myBookings ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-10 h-10 text-green-600 opacity-30" /></div>
      ) : myBookings.length === 0 ? (
        <Card className="border-dashed border-2 bg-muted/10 py-16 md:py-24">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-background p-6 rounded-full shadow-inner border">
              <Ticket className="w-12 h-12 text-muted-foreground opacity-20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold uppercase tracking-tighter opacity-70">SIN RESERVAS ACTIVAS</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">¿Sale un picadito? Reserva y pagá tu seña online.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myBookings.map((booking) => (
            <Card key={booking._id} className="bg-card border-none shadow-xl border-l-8 border-l-green-600 group">
              <CardContent className="pt-6 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase tracking-widest">
                      <CalendarDays className="w-4 h-4" />
                      {format(new Date(booking.date + "T00:00:00"), "EEEE d MMMM", { locale: es })}
                    </div>
                    <div className="text-4xl font-black tracking-tighter">{booking.hour}:00hs</div>
                    <div className="inline-flex px-2 py-0.5 rounded bg-muted font-bold text-[9px] uppercase tracking-widest opacity-60">
                      Cancha {booking.courtType}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleCancel(booking._id)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                <Button 
                  onClick={() => {
                    const fechaFormateada = format(new Date(booking.date + "T00:00:00"), "dd/MM");
                    const msg = encodeURIComponent(
                      `⚽ *¡RESERVA CONFIRMADA Y PAGADA!*\n` +
                      `🏟️ *Cancha:* ${booking.courtType}\n` +
                      `📅 *Día:* ${fechaFormateada}\n` +
                      `⏰ *Hora:* ${booking.hour}:00hs\n` +
                      `👤 *Jugador:* ${user?.fullName || "Cliente"}`
                    );
                    const url = `https://api.whatsapp.com/send?phone=${TELEFONO_DUEÑO}&text=${msg}`;
                    window.location.href = url;
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase text-xs h-12 gap-2 shadow-lg shadow-green-600/20"
                >
                  <MessageCircle className="w-5 h-5" /> Avisar al Dueño
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin w-10 h-10 text-green-600" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}