
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Leaf, BookHeart, User as UserIcon, LogOut, Sun, Pencil, Trash2, PlusCircle, Users, Calendar, Megaphone } from 'lucide-react';
import { Loader } from '@/components/loader';
import { ScrollArea } from '@/components/ui/scroll-area';

const initialMeditations = [
  {
    title: 'Meditación de Atención Plena',
    description: 'Enfócate en tu respiración y encuentra la calma en el momento presente.',
    duration: '10 min',
    content: 'Siéntate en una posición cómoda, con la espalda recta pero no rígida. Cierra suavemente los ojos. Lleva tu atención a tu respiración. Siente cómo el aire entra y sale de tu cuerpo. No intentes cambiar tu respiración, solo obsérvala. Nota las sensaciones en tu nariz, tu pecho y tu abdomen con cada inhalación y exhalación. Si tu mente se distrae, no te preocupes. Es normal. Simplemente, con amabilidad, redirige tu atención de nuevo a tu respiración. Permanece así durante unos minutos, anclado en el presente a través del ritmo natural de tu respiración.'
  },
  {
    title: 'Visualización de la Montaña',
    description: 'Conéctate con tu fuerza interior y estabilidad a través de esta visualización.',
    duration: '15 min',
    content: 'Encuentra una postura cómoda. Imagina una majestuosa montaña. Observa su forma, su pico alto, su base ancha y sólida. Siente cómo esta montaña es inamovible, resistiendo vientos, lluvias y el paso de las estaciones. Ahora, siente que tú eres esa montaña. Tu cabeza es el pico, tus brazos y hombros las laderas, y tu cuerpo la base firme. Siente tu propia estabilidad y fuerza interior. Aunque los pensamientos y emociones pasen como nubes en el cielo, tú permaneces fuerte y estable, como la montaña. Conecta con esa sensación de solidez y permanencia.'
  },
  {
    title: 'Escaneo Corporal para la Relajación',
    description: 'Libera la tensión de tu cuerpo, parte por parte, para una relajación profunda.',
    duration: '20 min',
    content: 'Acuéstate cómodamente y cierra los ojos. Lleva tu atención a los dedos de tus pies. Siente cualquier sensación: hormigueo, calor, tensión. Con cada exhalación, imagina que liberas cualquier tensión acumulada en esa zona. Lentamente, sube tu atención por tus pies, tus tobillos, tus pantorrillas, tus rodillas. Continúa este recorrido por todo tu cuerpo: muslos, caderas, abdomen, pecho, espalda, manos, brazos, hombros, cuello y cara. Dedica un momento a cada parte, liberando la tensión con la respiración. Al finalizar, siente tu cuerpo completamente relajado y en paz.'
  },
    {
    title: 'Amor y Bondad',
    description: 'Cultiva sentimientos de amor y compasión hacia ti y hacia los demás.',
    duration: '12 min',
    content: 'Siéntate cómodamente y coloca una mano sobre tu corazón. Respira profundamente. Comienza dirigiendo sentimientos de amor y bondad hacia ti mismo. Repite en silencio frases como: "Que yo esté bien. Que yo sea feliz. Que yo esté en paz". Siente la calidez de estas palabras. Luego, piensa en un ser querido y envíale los mismos deseos: "Que estés bien. Que seas feliz. Que estés en paz". Expande este sentimiento a tus amigos, a personas neutrales, e incluso a aquellos con quienes tienes dificultades. Finalmente, irradia este amor y compasión a todos los seres del universo.'
  },
];

type Meditation = {
  title: string;
  description: string;
  duration: string;
  content: string;
};

const newMeditationInitialState: Meditation = {
  title: '',
  description: '',
  duration: '',
  content: ''
};


export default function MeditacionesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [meditations, setMeditations] = useState<Meditation[]>(initialMeditations);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReadModalOpen, setIsReadModalOpen] = useState(false);
  const [selectedMeditation, setSelectedMeditation] = useState<Meditation | null>(null);
  const [selectedMeditationIndex, setSelectedMeditationIndex] = useState<number | null>(null);
  const [newMeditation, setNewMeditation] = useState<Meditation>(newMeditationInitialState);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  }
  
  const handleReadClick = (meditation: Meditation) => {
    setSelectedMeditation(meditation);
    setIsReadModalOpen(true);
  }

  const handleEditClick = (e: React.MouseEvent, meditation: Meditation, index: number) => {
    e.stopPropagation();
    setSelectedMeditation({ ...meditation });
    setSelectedMeditationIndex(index);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedMeditationIndex(index);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (selectedMeditationIndex !== null) {
      setMeditations(meditations.filter((_, i) => i !== selectedMeditationIndex));
      setIsDeleteModalOpen(false);
      setSelectedMeditationIndex(null);
    }
  };

  const handleSaveEdit = () => {
    if (selectedMeditation && selectedMeditationIndex !== null) {
      const updatedMeditations = [...meditations];
      updatedMeditations[selectedMeditationIndex] = selectedMeditation;
      setMeditations(updatedMeditations);
      setIsEditModalOpen(false);
      setSelectedMeditation(null);
      setSelectedMeditationIndex(null);
    }
  };

  const handleSaveNewMeditation = () => {
    setMeditations([...meditations, newMeditation]);
    setNewMeditation(newMeditationInitialState);
    setIsAddModalOpen(false);
  };


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
            <Button asChild variant="secondary" className="w-full justify-start gap-3 text-base">
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
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                <Link href="/difusion">
                    <Megaphone className="h-5 w-5" />
                    Difusión
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
             <h1 className="text-4xl font-title text-foreground/80" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem' }}>Meditaciones</h1>
          </div>
          <button onClick={() => setIsAddModalOpen(true)}>Agregar</button>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meditations.map((meditation, index) => (
              <Card 
                key={index} 
                className="overflow-hidden shadow-lg transition-transform hover:scale-105 duration-300 flex flex-col cursor-pointer"
                onClick={() => handleReadClick(meditation)}
              >
                <CardHeader>
                  <CardTitle className="font-headline text-xl">{meditation.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-end">
                  <div className="flex justify-end items-center gap-2 mt-auto pt-2">
                    <Button variant="outline" size="icon" className="h-5 w-5" onClick={(e) => handleEditClick(e, meditation, index)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-5 w-5" onClick={(e) => handleDeleteClick(e, index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
      
      <Dialog open={isReadModalOpen} onOpenChange={setIsReadModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{selectedMeditation?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-4">
            <p className="font-body text-base leading-relaxed whitespace-pre-wrap">{selectedMeditation?.content}</p>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsReadModalOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Nueva Meditación</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-title" className="text-right">Título</Label>
              <Input id="new-title" value={newMeditation.title} onChange={(e) => setNewMeditation({...newMeditation, title: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-description" className="text-right">Descripción</Label>
              <Input id="new-description" value={newMeditation.description} onChange={(e) => setNewMeditation({...newMeditation, description: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-duration" className="text-right">Duración</Label>
              <Input id="new-duration" value={newMeditation.duration} onChange={(e) => setNewMeditation({...newMeditation, duration: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-content" className="text-right">Contenido</Label>
              <Textarea id="new-content" value={newMeditation.content} onChange={(e) => setNewMeditation({...newMeditation, content: e.target.value})} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveNewMeditation}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Meditación</DialogTitle>
          </DialogHeader>
          {selectedMeditation && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Título</Label>
                <Input id="title" value={selectedMeditation.title} onChange={(e) => setSelectedMeditation({...selectedMeditation, title: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">Descripción</Label>
                <Input id="description" value={selectedMeditation.description} onChange={(e) => setSelectedMeditation({...selectedMeditation, description: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">Duración</Label>
                <Input id="duration" value={selectedMeditation.duration} onChange={(e) => setSelectedMeditation({...selectedMeditation, duration: e.target.value})} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="content" className="text-right">Contenido</Label>
                <Textarea id="content" value={selectedMeditation.content} onChange={(e) => setSelectedMeditation({...selectedMeditation, content: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la meditación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
