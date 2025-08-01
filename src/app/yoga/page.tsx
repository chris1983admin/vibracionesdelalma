
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Leaf, BookHeart, Sun, Wind, Users, Calendar } from 'lucide-react';
import { Loader } from '@/components/loader';

export default function YogaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        router.push('/');
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  }

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <aside className="fixed inset-y-0 left-0 z-10 hidden w-72 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
           <Link href="/app" className="flex items-center gap-2 font-headline text-xl font-semibold text-primary px-4">
            <Leaf className="h-7 w-7" />
            <span>Vibraciones del Alma</span>
          </Link>
          <div className="flex-1 w-full mt-8 flex flex-col gap-2">
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                <Link href="/app">
                    <Home className="h-5 w-5" />
                    Inicio
                </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                 <Link href="/meditaciones">
                    <Sun className="h-5 w-5" />
                    Meditaciones
                </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                <Link href="/diario">
                    <BookHeart className="h-5 w-5" />
                    Diario
                </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full justify-start gap-3 text-base">
                <Link href="/yoga">
                    <Wind className="h-5 w-5" />
                    Yoga
                </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                <Link href="/pacientes">
                    <Users className="h-5 w-5" />
                    Pacientes
                </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                <Link href="/agenda">
                    <Calendar className="h-5 w-5" />
                    Agenda
                </Link>
            </Button>
          </div>
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 text-base px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Configuración</DropdownMenuItem>
              <DropdownMenuItem>Soporte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Cerrar Sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-72">
        <header className="sticky top-0 z-30 flex h-auto flex-col items-center gap-4 border-b bg-background px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="flex-1 text-center">
             <h1 className="text-4xl font-title text-foreground/80" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem' }}>Yoga Restaurativo</h1>
          </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Próximamente: ¡Sesiones de yoga para restaurar cuerpo y alma!</p>
          </div>
        </main>
      </div>
    </div>
  );
}
