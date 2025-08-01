
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { format, parse } from 'date-fns';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Leaf, BookHeart, Sun, Users, Calendar as CalendarIcon, Megaphone } from 'lucide-react';
import { Loader } from '@/components/loader';

type Patient = {
  id: string;
  userId: string;
  createdAt: Timestamp;
  name: string;
  birthDate: Timestamp;
  phone: string;
  observations: string;
};

const newPatientInitialState: Omit<Patient, 'id' | 'createdAt' | 'birthDate' | 'userId'> & { birthDate: string } = {
  name: '',
  phone: '',
  observations: '',
  birthDate: ''
};

export default function PacientesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState(newPatientInitialState);
  const [isSaving, setIsSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const q = query(collection(db, 'pacientes'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const patientsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Patient));
        setPatients(patientsData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching patients: ", error);
        setLoading(false);
      });
      return () => unsubscribeFirestore();
    }
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  }

  const parseDateString = (dateString: string): Date | null => {
    try {
        const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
        return isNaN(parsedDate.getTime()) || dateString.length !== 10 ? null : parsedDate;
    } catch (error) {
        return null;
    }
  };
  
  const handleBirthDateChange = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${formatted.slice(0, 5)}/${cleaned.slice(5, 9)}`;
    }
    return formatted.slice(0, 10);
  };

  const handleSaveNewPatient = async () => {
    if (user && newPatient.birthDate) {
      const birthDate = parseDateString(newPatient.birthDate);
      if (!birthDate) {
        console.error("Invalid date format");
        return;
      }
      setIsSaving(true);
      try {
        await addDoc(collection(db, 'pacientes'), {
          ...newPatient,
          userId: user.uid,
          birthDate: Timestamp.fromDate(birthDate),
          createdAt: Timestamp.now()
        });
        setNewPatient(newPatientInitialState);
        setIsAddModalOpen(false);
      } catch (error) {
        console.error("Error adding document: ", error);
      } finally {
        setIsSaving(false);
      }
    }
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
                <Link href="/pacientes">
                    <Users className="h-5 w-5" />
                    Pacientes
                </Link>
            </Button>
            <Button asChild variant="ghost" className="w-full justify-start gap-3 text-base">
                <Link href="/agenda">
                    <CalendarIcon className="h-5 w-5" />
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
        <header className="sticky top-0 z-30 flex h-auto items-center justify-between gap-4 border-b bg-background px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <div className="flex-1">
             <h1 className="text-4xl font-title text-foreground/80" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem' }}>Pacientes</h1>
          </div>
          <Button onClick={() => { setNewPatient(newPatientInitialState); setIsAddModalOpen(true)}}>Agregar Paciente</Button>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">
          {patients.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {patients.map((patient) => (
                <Link href={`/pacientes/${patient.id}/sesiones`} key={patient.id}>
                    <Card 
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <CardTitle className="font-headline text-lg">{patient.name}</CardTitle>
                      </CardHeader>
                    </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full py-20">
              <p className="text-muted-foreground text-center">Aún no has agregado pacientes.</p>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Paciente</DialogTitle>
            <DialogDescription>Completa los datos para registrar un nuevo paciente.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-name" className="text-right">Nombre</Label>
              <Input id="new-name" value={newPatient.name} onChange={(e) => setNewPatient({...newPatient, name: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-birthDate" className="text-right">F. de Nacimiento</Label>
              <Input 
                id="new-birthDate" 
                value={newPatient.birthDate} 
                onChange={(e) => setNewPatient({...newPatient, birthDate: handleBirthDateChange(e.target.value)})} 
                className="col-span-3"
                placeholder="DD/MM/AAAA"
                maxLength={10}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-phone" className="text-right">Teléfono</Label>
              <Input id="new-phone" value={newPatient.phone} onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="new-observations" className="text-right pt-2">Observaciones</Label>
                <Textarea id="new-observations" value={newPatient.observations} onChange={(e) => setNewPatient({...newPatient, observations: e.target.value})} className="col-span-3" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveNewPatient} disabled={isSaving || !parseDateString(newPatient.birthDate)}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
