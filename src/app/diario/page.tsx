
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Leaf, BookHeart, Sun, Pencil, Trash2, Users, Calendar, Megaphone } from 'lucide-react';
import { Loader } from '@/components/loader';

type JournalEntry = {
  id: string;
  createdAt: Timestamp;
  entry: string;
  title?: string;
};

const newEntryInitialState: Omit<JournalEntry, 'id' | 'createdAt'> = {
  entry: '',
  title: ''
};

export default function DiarioPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Omit<JournalEntry, 'id' | 'createdAt'>>(newEntryInitialState);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'diario'), where('userId', '==', user.uid));
      const unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const entriesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as JournalEntry));
        // Sort entries by date on the client-side
        entriesData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setEntries(entriesData);
      }, (error) => {
        console.error("Error fetching journal entries: ", error);
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

  const handleEditClick = (entry: JournalEntry) => {
    setEntryToEdit({ ...entry });
    setIsEditModalOpen(true);
  };
  
  const handleDeleteClick = (id: string) => {
    setEntryToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (entryToDeleteId) {
      const docRef = doc(db, 'diario', entryToDeleteId);
      await deleteDoc(docRef);
      setIsDeleteModalOpen(false);
      setEntryToDeleteId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (entryToEdit && entryToEdit.id) {
      setIsSaving(true);
      const docRef = doc(db, 'diario', entryToEdit.id);
      try {
        await updateDoc(docRef, {
          title: entryToEdit.title || '',
          entry: entryToEdit.entry
        });
        setIsEditModalOpen(false);
        setEntryToEdit(null);
      } catch (error) {
        console.error("Error updating document: ", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSaveNewEntry = async () => {
    if (user) {
      setIsSaving(true);
      try {
        await addDoc(collection(db, 'diario'), {
          userId: user.uid,
          ...newEntry,
          createdAt: Timestamp.now()
        });
        setNewEntry(newEntryInitialState);
        setIsAddModalOpen(false);
      } catch (error) {
        console.error("Error adding document: ", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
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
            <Button asChild variant="secondary" className="w-full justify-start gap-3 text-base">
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
             <h1 className="text-4xl font-title text-foreground/80" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem' }}>Diario del Alma</h1>
          </div>
          <button onClick={() => setIsAddModalOpen(true)}>Agregar</button>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">
          <div className="flex flex-col gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="overflow-hidden shadow-lg">
                <CardHeader>
                  <CardTitle className="font-headline text-lg">{entry.title || formatDate(entry.createdAt)}</CardTitle>
                  {entry.title && <CardDescription>{formatDate(entry.createdAt)}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <p className="font-body whitespace-pre-wrap">{entry.entry}</p>
                   <div className="flex justify-end items-center gap-2 mt-4">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditClick(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteClick(entry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Entrada de Diario</DialogTitle>
            <DialogDescription>Anota algo por lo que estés agradecida hoy.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-title" className="text-right">Título</Label>
              <Input id="new-title" value={newEntry.title} onChange={(e) => setNewEntry({...newEntry, title: e.target.value})} className="col-span-3" placeholder="Título (Opcional)" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="new-entry" className="text-right pt-2">Entrada</Label>
              <Textarea id="new-entry" value={newEntry.entry} onChange={(e) => setNewEntry({...newEntry, entry: e.target.value})} className="col-span-3" rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveNewEntry} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
          </DialogHeader>
          {entryToEdit && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-title" className="text-right">Título</Label>
                  <Input id="edit-title" value={entryToEdit.title || ''} onChange={(e) => setEntryToEdit({...entryToEdit, title: e.target.value})} className="col-span-3" placeholder="Título (Opcional)" />
                </div>
               <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="entry" className="text-right pt-2">Entrada</Label>
                <Textarea id="entry" value={entryToEdit.entry} onChange={(e) => setEntryToEdit({...entryToEdit, entry: e.target.value})} className="col-span-3" rows={5}/>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la entrada del diario.
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
