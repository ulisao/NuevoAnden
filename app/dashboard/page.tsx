"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";

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
} from "@/components/ui/dialog";
import { Loader2, Trash2, CalendarDays, Plus, Ticket, MessageCircle } from "lucide-react";

const telefono = process.env.TELEFONO;

export default function Dashboard() {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [courtType, setCourtType] = useState<"5v5" | "7v7">("5v5");

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";

  const myBookings = useQuery(api.bookings.getMyBookings);
  const existingBookings = useQuery(api.bookings.getByDate, { date: dateStr, courtType });
  
  const createBooking = useMutation(api.bookings.create);
  const cancelBooking = useMutation(api.bookings.cancel);

  const hours = [18, 19, 20, 21, 22, 23];
  

  const isPastTime = (hour: number) => {
    if (!date) return false;
    const now = new Date();
    if (isSameDay(date, now)) return hour <= now.getHours();
    return date < new Date(now.setHours(0,0,0,0));
  };

  const handleBooking = async (hour: number) => {
    if (!date || !user) return;
    const promise = createBooking({
      courtType,
      date: dateStr,
      hour,
      userName: user.fullName || "Usuario",
      userEmail: user.primaryEmailAddress?.emailAddress || "",
    });

    toast.promise(promise, {
      loading: "Reservando...",
      success: () => {
        setIsModalOpen(false);
        return "¡Reserva confirmada!";
      },
      error: (err) => err.message.includes("Límite") ? "Ya tienes 2 reservas activas" : "Error"
    });
  };

  const handleCancel = async (bookingId: Id<"bookings">) => {
    toast.promise(cancelBooking({ bookingId }), {
      loading: "Cancelando...",
      success: "Turno liberado",
      error: "Error"
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6 bg-background min-h-screen text-foreground">
      {/* Header Responsivo */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">
          MIS RESERVAS
        </h1>
        <div className="flex items-center gap-3">
          
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Botón Nueva Reserva - Siempre visible y cómodo en mobile */}
      <div className="flex justify-start">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black px-8 h-14 md:h-12 shadow-xl shadow-green-600/20">
              <Plus className="w-5 h-5 mr-2" /> NUEVA RESERVA
            </Button>
          </DialogTrigger>
          
          <DialogContent className="w-[95vw] md:max-w-3xl rounded-t-3xl md:rounded-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Reservar Cancha</DialogTitle>
              <DialogDescription>Selecciona fecha y cancha para jugar.</DialogDescription>
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
                        className={`h-14 md:h-16 text-lg font-black relative overflow-hidden transition-all ${
                          disabled 
                            ? "bg-muted/30 border-muted text-muted-foreground/10" 
                            : "border-green-600/20 text-foreground hover:bg-green-600 hover:text-white"
                        }`}
                      >
                        <span className={disabled ? "line-through decoration-2" : ""}>{h}:00</span>
                        {booked && (
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] text-destructive font-black rotate-12 uppercase">
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
      </div>

      {/* Listado de Reservas o Empty State */}
      {!myBookings ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin w-10 h-10 text-green-600 opacity-30" /></div>
      ) : myBookings.length === 0 ? (
        /* CAJA RESTAURADA: Empty State */
        <Card className="border-dashed border-2 bg-muted/10 py-16 md:py-24">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-background p-6 rounded-full shadow-inner border">
              <Ticket className="w-12 h-12 text-muted-foreground opacity-20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold uppercase tracking-tighter opacity-70">SIN RESERVAS ACTIVAS</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">¿Sale un picadito? Reserva tu lugar ahora mismo.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Lista de Tarjetas para Mobile */
        <div className="grid gap-4 md:grid-cols-2">
          {myBookings.map((booking) => (
            <Card key={booking._id} className="bg-card border-none shadow-xl border-l-8 border-l-green-600 group hover:scale-[1.01] transition-transform">
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
                    
                    const msg = encodeURIComponent(`⚽ *Reserva:* ${booking.courtType}\n📅 *Día:* ${booking.date}\n⏰ *Hora:* ${booking.hour}:00hs`);
                    window.open(`https://wa.me/${telefono}?text=${msg}`, '_blank');
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