
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Leaf, BookHeart, User as UserIcon, LogOut, Sun, Users, Calendar, Share2, Heart, Moon, BookOpen, Video } from 'lucide-react';
import { getMantra, type MantraOutput } from '@/ai/flows/mantra-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"


interface DashboardProps {
  user: User;
}

const journeySlides = [
  {
    icon: Heart,
    title: "Recordatorio de Autocuidado",
    description: "Tómate 3 minutos para respirar conscientemente y conectar contigo."
  },
  {
    icon: Moon,
    title: "Frase del Alma",
    description: "Eres parte del todo, y el todo vive en ti. Confía en tu proceso."
  },
  {
    icon: BookOpen,
    title: "Tu Diario te Espera",
    description: "Aún no escribiste en tu Diario del Alma hoy. ¡Es un buen momento!"
  }
];

export default function Dashboard({ user }: DashboardProps) {
  const router = useRouter();
  const [mantra, setMantra] = useState<MantraOutput | null>(null);
  const [loadingMantra, setLoadingMantra] = useState(true);
  const { toast } = useToast();
  
  const plugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  );

  useEffect(() => {
    const fetchMantra = async () => {
      setLoadingMantra(true);
      const today = new Date().toISOString().split('T')[0];
      const storedMantraData = localStorage.getItem('dailyMantra');
      
      if (storedMantraData) {
        try {
          const { date, mantra: storedMantra } = JSON.parse(storedMantraData);
          if (date === today) {
            setMantra(storedMantra);
            setLoadingMantra(false);
            return;
          }
        } catch (error) {
           console.error("Error parsing stored mantra:", error);
           localStorage.removeItem('dailyMantra');
        }
      }

      try {
        const mantraData = await getMantra();
        setMantra(mantraData);
        localStorage.setItem('dailyMantra', JSON.stringify({ date: today, mantra: mantraData }));
      } catch (error) {
        console.error("Error fetching mantra:", error);
        setMantra({ mantra: "Respiro paz, exhalo amor.", description: "Encuentra la calma en tu interior." });
      } finally {
        setLoadingMantra(false);
      }
    };

    fetchMantra();

    const intervalId = setInterval(fetchMantra, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  }
  
  const handleShare = (platform: 'whatsapp' | 'facebook' | 'instagram') => {
    if (mantra) {
      const text = `"${mantra.mantra}" - ${mantra.description}`;
      const encodedText = encodeURIComponent(text);
      
      switch (platform) {
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodedText}`, '_blank');
          break;
        case 'facebook':
          const url = 'https://vibra-tkbqo.web.app'; // You can replace this with a specific page URL if you have one
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodedText}`, '_blank');
          break;
        case 'instagram':
          navigator.clipboard.writeText(text).then(() => {
            toast({
              title: "¡Mantra copiado!",
              description: "Ya puedes pegarlo en tu publicación de Instagram.",
            })
          });
          break;
      }
    }
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-72 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
           <Link href="/app" className="flex items-center gap-2 font-headline text-xl font-semibold text-primary px-4">
            <Leaf className="h-7 w-7" />
            <span>Vibraciones del Alma</span>
          </Link>
          <div className="flex-1 w-full mt-8 flex flex-col gap-2">
            <Button asChild variant="secondary" className="w-full justify-start gap-3 text-base">
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
                <Link href="/taller">
                    <Video className="h-5 w-5" />
                    Talleres
                </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
              <Link href="/diario">
                <BookHeart className="h-5 w-5" />
                Diario
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
                  <AvatarImage src={`https://placehold.co/32x32.png`} alt="Avatar" data-ai-hint="woman portrait" />
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="relative flex-1">
             <h1 className="text-2xl font-headline text-foreground/80">Bienvenida, {user.email?.split('@')[0] || 'Alma Radiante'}</h1>
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
            <Card className="shadow-lg transition-transform hover:scale-[1.02] duration-300 flex flex-col">
               <CardHeader className="pb-2">
                <CardDescription className="font-headline text-xl text-foreground/70">Mantra del Día</CardDescription>
                {loadingMantra ? (
                  <Skeleton className="h-8 w-3/4" />
                ) : (
                  <CardTitle className="text-3xl font-body text-primary tracking-wide">"{mantra?.mantra}"</CardTitle>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                {loadingMantra ? (
                  <Skeleton className="h-5 w-full" />
                ) : (
                  <div className="text-sm text-muted-foreground">{mantra?.description}</div>
                )}
              </CardContent>
              <CardFooter className="flex items-center gap-2">
                 {!loadingMantra && (
                   <>
                    <Button onClick={() => handleShare('whatsapp')} variant="ghost" size="icon" className="h-8 w-8">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-whatsapp" viewBox="0 0 16 16">
                        <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                      </svg>
                    </Button>
                    <Button onClick={() => handleShare('facebook')} variant="ghost" size="icon" className="h-8 w-8">
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-facebook" viewBox="0 0 16 16">
                        <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0 0 3.603 0 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"/>
                      </svg>
                    </Button>
                    <Button onClick={() => handleShare('instagram')} variant="ghost" size="icon" className="h-8 w-8">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="bi bi-instagram" viewBox="0 0 16 16">
                        <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.198-.51.333-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.942a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm0 1.442c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.095.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.598-.92c-.11-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.232s.008-2.389.046-3.232c.035-.78.166-1.204.275-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.843-.038 1.096-.047 3.232-.047zM8 4.938a3.062 3.062 0 1 0 0 6.125 3.062 3.062 0 0 0 0-6.125zm0 5a1.938 1.938 0 1 1 0-3.875 1.938 1.938 0 0 1 0 3.875zm4.885-6.232a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5z"/>
                      </svg>
                    </Button>
                   </>
                 )}
              </CardFooter>
            </Card>
            <Card className="shadow-lg transition-transform hover:scale-[1.02] duration-300 flex flex-col justify-center">
              <Carousel 
                className="w-full"
                plugins={[plugin.current]}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
              >
                <CarouselContent>
                  {journeySlides.map((slide, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                            <slide.icon className="h-10 w-10 text-primary" />
                            <div className="text-center">
                              <p className="font-headline text-lg">{slide.title}</p>
                              <p className="text-sm text-muted-foreground">{slide.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </Card>

          </div>
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-2">
             <Card className="shadow-lg transition-transform hover:scale-[1.02] duration-300 flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-2xl font-semibold text-primary/90">Espacio de Encuentro</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                  <Link href="/pacientes" className="relative group cursor-pointer overflow-hidden rounded-lg p-4 border flex items-center justify-center h-32 bg-secondary/50 transition-transform hover:scale-105 duration-300">
                    <h3 className="font-headline text-xl font-semibold text-primary text-center">Pacientes</h3>
                  </Link>
                  <Link href="/agenda" className="relative group cursor-pointer overflow-hidden rounded-lg p-4 border flex items-center justify-center h-32 bg-secondary/50 transition-transform hover:scale-105 duration-300">
                    <h3 className="font-headline text-xl font-semibold text-primary text-center">Agenda</h3>
                  </Link>
              </CardContent>
            </Card>
            <Card className="shadow-lg transition-transform hover:scale-[1.02] duration-300 flex flex-col">
              <CardHeader>
                <CardTitle className="font-headline text-2xl font-semibold text-primary/90">Diario del Alma</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex">
                 <Link href="/diario" className="relative group cursor-pointer overflow-hidden rounded-lg p-4 border flex items-center justify-center h-full w-full bg-secondary/50 transition-transform hover:scale-105 duration-300">
                    <h3 className="font-headline text-xl font-semibold text-primary text-center">Ingresar al Diario</h3>
                  </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
    
