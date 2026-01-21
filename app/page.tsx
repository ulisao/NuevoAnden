"use client";

import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar Minimalista */}
      <header className="px-4 md:px-6 h-16 flex items-center justify-between bg-background border-b sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-lg md:text-xl text-foreground">
          <Trophy className="w-5 h-5 text-green-600" />
          <span>F5 Master</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm" className="hidden md:flex">
                Iniciar Sesión
              </Button>
            </SignInButton>
            <SignInButton mode="modal">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                Registrarse
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                Ir a Reservar <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Hero Section - Estilo Clásico */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4 md:p-6 space-y-8 md:space-y-12">
        <div className="max-w-4xl space-y-4 md:space-y-6">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            Reserva tu cancha <span className="text-green-600">al <br className="hidden md:block" /> instante</span>
          </h1>
          <p className="text-base md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto px-4 md:px-0">
            El sistema más rápido para reservar canchas de Fútbol 5 y 7. Sin llamadas, sin esperas. Elige tu horario y jugá.
          </p>
          
          <div className="pt-4 flex justify-center">
            <Link href="/dashboard" className="w-full md:w-auto px-4">
              <Button size="lg" className="w-full md:w-auto h-14 md:h-16 px-8 md:px-12 text-lg md:text-xl font-bold shadow-lg bg-green-600 hover:bg-green-700 text-white transition-all hover:scale-105 active:scale-95">
                Reservar Ahora
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards - Optimizadas para Scroll Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full max-w-5xl px-4">
          <FeatureCard 
            icon={<CalendarDays className="w-8 h-8 text-blue-500" />}
            title="Disponibilidad Real"
            desc="Mira los horarios libres en tiempo real. Si está en verde, es tuya."
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-8 h-8 text-purple-500" />}
            title="Reserva Segura"
            desc="Tus datos y tus turnos están protegidos. Confirmación inmediata."
          />
          <FeatureCard 
            icon={<Trophy className="w-8 h-8 text-orange-500" />}
            title="Canchas Premium"
            desc="Césped sintético de última generación para 5v5 y 7v7."
          />
        </div>
      </main>

      <footer className="py-6 text-center text-slate-500 text-sm border-t">
        © 2026 F5 Master. Todos los derechos reservados.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 bg-card rounded-xl shadow-sm border text-center md:text-left hover:shadow-md transition-shadow">
      <div className="mb-4 flex justify-center md:justify-start">{icon}</div>
      <h3 className="font-bold text-lg mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}