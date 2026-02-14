"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import * as XLSX from "xlsx";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, ArrowLeft, Lock, Filter, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function AdminDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [filterToday, setFilterToday] = useState(false);
  
  // Estados para el Bloqueo Manual
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [blockHour, setBlockHour] = useState(18);
  const [blockCourt, setBlockCourt] = useState("5v5");

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const allBookings = useQuery(api.bookings.getAdminBookings);
  const cancelMutation = useMutation(api.bookings.cancel);
  const blockMutation = useMutation(api.bookings.adminBlock);

  const displayedBookings = filterToday 
    ? allBookings?.filter(b => b.date === todayStr)
    : allBookings;

  useEffect(() => {
    if (isLoaded && user && user.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) router.push("/");
  }, [isLoaded, user, router]);

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin" /></div>;
  if (user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) return null;

  const handleBlock = () => {
    toast.promise(blockMutation({ date: blockDate, hour: blockHour, courtType: blockCourt }), {
      loading: "Bloqueando horario...",
      success: () => {
        setIsBlockModalOpen(false);
        return "Horario bloqueado";
      },
      error: "Error al bloquear"
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6 bg-background min-h-screen">
      {/* Header Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black italic tracking-tighter">PANEL ADMIN</h1>
            <p className="text-muted-foreground text-xs uppercase font-bold opacity-50 tracking-widest leading-none">Gestión de Complejo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón de Bloqueo Manual Restaurado */}
          <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" className="font-bold gap-2 flex-1 md:flex-none">
                <Lock className="w-4 h-4" /> BLOQUEAR
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] md:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase">Bloqueo Manual</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase opacity-50">Fecha</label>
                  <input type="date" className="w-full p-3 border rounded-xl bg-background" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase opacity-50">Cancha</label>
                    <select className="p-3 border rounded-xl bg-background font-bold" value={blockCourt} onChange={(e) => setBlockCourt(e.target.value)}>
                      <option value="5v5">Fútbol 5</option>
                      <option value="7v7">Fútbol 7</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase opacity-50">Hora</label>
                    <select className="p-3 border rounded-xl bg-background font-bold" value={blockHour} onChange={(e) => setBlockHour(Number(e.target.value))}>
                      {[18, 19, 20, 21, 22, 23].map(h => <option key={h} value={h}>{h}:00 hs</option>)}
                    </select>
                  </div>
                </div>
                <Button className="w-full h-12 font-black uppercase tracking-widest mt-2" onClick={handleBlock}>Confirmar Bloqueo</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={() => {
            const worksheet = XLSX.utils.json_to_sheet(displayedBookings || []);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reservas");
            XLSX.writeFile(workbook, "Reporte.xlsx");
          }}><Download className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}><ArrowLeft className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatsCard title="Vigentes" value={allBookings?.filter(b => b.status === "confirmed").length || 0} />
        <StatsCard title="F5" value={allBookings?.filter(b => b.courtType === "5v5" && b.status === "confirmed").length || 0} />
        <StatsCard title="F7" value={allBookings?.filter(b => b.courtType === "7v7" && b.status === "confirmed").length || 0} className="col-span-2 md:col-span-1" />
      </div>

      <div className="flex gap-2">
        <Button variant={!filterToday ? "default" : "outline"} size="sm" className="flex-1 font-bold" onClick={() => setFilterToday(false)}>Todos</Button>
        <Button variant={filterToday ? "default" : "outline"} size="sm" className="flex-1 font-bold" onClick={() => setFilterToday(true)}>Hoy ⚽</Button>
      </div>

      {/* VISTA MOBILE: Tarjetas */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {displayedBookings?.map((b) => (
          <Card key={b._id} className={`${b.status === "cancelled" ? "opacity-30 grayscale" : "border-l-4 border-l-green-600 shadow-md"}`}>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black uppercase opacity-50 tracking-tighter">{format(new Date(b.date + "T00:00:00"), "dd/MM")}</p>
                <p className="text-xl font-black leading-none mb-1">{b.hour}:00hs</p>
                <p className="text-xs font-bold text-muted-foreground truncate max-w-[120px]">{b.userName}</p>
                <Badge variant="outline" className="text-[8px] mt-1 h-4 font-black">CANCHA {b.courtType}</Badge>
              </div>
              {b.status === "confirmed" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive/60"><Trash2 className="w-5 h-5"/></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
                      <AlertDialogDescription>Esto liberará el turno de {b.userName} a las {b.hour}:00hs.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2">
                      <AlertDialogAction onClick={() => cancelMutation({bookingId: b._id})} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                      <AlertDialogCancel>Volver</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* VISTA DESKTOP: Tabla */}
      <div className="hidden md:block">
          <Card className="bg-card shadow-xl border-none">
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Hora</TableHead><TableHead>Cancha</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader>
                <TableBody>
                  {displayedBookings?.map((b) => (
                    <TableRow key={b._id} className={b.status === "cancelled" ? "opacity-30" : ""}>
                      <TableCell className="font-bold">{b.date}</TableCell>
                      <TableCell className="font-bold">{b.hour}:00hs</TableCell>
                      <TableCell><Badge variant="outline" className="font-black">CANCHA {b.courtType}</Badge></TableCell>
                      <TableCell className="text-xs font-medium">{b.userName}</TableCell>
                      <TableCell className="text-right">
                        {b.status === "confirmed" && <Button variant="ghost" size="icon" className="text-destructive/50 hover:text-destructive" onClick={() => cancelMutation({bookingId: b._id})}><Trash2 className="w-4 h-4" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, className }: any) {
    return (
        <Card className={`bg-card border-none shadow-lg ${className}`}>
            <CardContent className="p-4">
                <p className="text-[10px] font-black uppercase opacity-40 leading-none mb-1">{title}</p>
                <p className="text-3xl font-black tracking-tighter">{value}</p>
            </CardContent>
        </Card>
    )
}