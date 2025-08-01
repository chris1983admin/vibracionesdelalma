
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, Timestamp, updateDoc, deleteDoc, where, getDocs, getDoc } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, Leaf, BookHeart, Sun, Users, Calendar, Megaphone, Plus, Trash2, Pencil, ExternalLink, Activity, Youtube, MessageSquare, UserPlus, BadgeDollarSign } from 'lucide-react';
import { Loader } from '@/components/loader';
import { Sidebar, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

type Participant = {
  id: string;
  name: string;
  status: 'paid' | 'pending';
};

type Broadcast = {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'taller' | 'charla' | 'vivo' | 'otro';
  eventDate: Timestamp;
  link?: string;
  createdAt: Timestamp;
  price?: number;
  participants?: Participant[];
};

type BroadcastFormState = Omit<Broadcast, 'id' | 'userId' | 'createdAt' | 'eventDate'> & {
  eventDate: string;
};

const initialFormState: BroadcastFormState = {
  title: '',
  description: '',
  type: 'taller',
  eventDate: '',
  link: '',
  price: 0,
  participants: [],
};

const typeOptions = {
  taller: { label: 'Taller', icon: Activity },
  charla: { label: 'Charla', icon: MessageSquare },
  vivo: { label: 'Vivo en YouTube', icon: Youtube },
  otro: { label: 'Otro', icon: Megaphone },
};

export default function DifusionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState<BroadcastFormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [newParticipantName, setNewParticipantName] = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/');
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, [router]);
  
  useEffect(() => {
    if(user) {
      setLoading(true);
      const q = query(collection(db, 'difusion'), where('userId', '==', user.uid));
      const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const broadcastsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Broadcast));
         broadcastsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
        setBroadcasts(broadcastsData);

        // Update selectedBroadcast with fresh data
        if (selectedBroadcast) {
          const updatedSelected = broadcastsData.find(b => b.id === selectedBroadcast.id);
          setSelectedBroadcast(updatedSelected || null);
        }

        setLoading(false);
      }, (error) => {
        console.error("Error fetching broadcasts: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las difusiones." });
        setLoading(false);
      });

      return () => unsubscribeFirestore();
    }
  }, [user, toast]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  }

  const handleOpenModal = (broadcast: Broadcast | null = null) => {
    if (broadcast) {
      setEditingId(broadcast.id);
      setFormData({
        ...broadcast,
        eventDate: format(broadcast.eventDate.toDate(), "yyyy-MM-dd'T'HH:mm"),
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleFormChange = (field: keyof BroadcastFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.eventDate) {
      toast({ variant: "destructive", title: "Faltan datos", description: "La fecha del evento es obligatoria." });
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave: Omit<Broadcast, 'id' | 'createdAt'> = {
        userId: user.uid,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        eventDate: Timestamp.fromDate(parseISO(formData.eventDate)),
        link: formData.link || '',
        price: 0,
        participants: [],
      };

      if (editingId) {
        const docRef = doc(db, 'difusion', editingId);
        await updateDoc(docRef, dataToSave as any);
        toast({ title: "¡Actualizado!", description: "La difusión se ha actualizado correctamente." });
      } else {
        await addDoc(collection(db, 'difusion'), {
          ...dataToSave,
          createdAt: Timestamp.now(),
        });
        toast({ title: "¡Creado!", description: "La difusión se ha creado correctamente." });
      }
      setIsModalOpen(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving broadcast:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la difusión." });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };
  
  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(db, 'difusion', deletingId));
        toast({ title: "Difusión eliminada" });
        if(selectedBroadcast?.id === deletingId) {
            setSelectedBroadcast(null);
        }
    } catch (error) {
        console.error("Error deleting broadcast: ", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la difusión." });
    } finally {
        setIsDeleting(false);
        setDeletingId(null);
    }
  };
  
const updateBroadcastField = async (broadcastId: string, field: keyof Broadcast, value: any) => {
    const docRef = doc(db, 'difusion', broadcastId);
    try {
      await updateDoc(docRef, { [field]: value });
      // Fetch the updated document to refresh the state
      const updatedDoc = await getDoc(docRef);
      if (updatedDoc.exists()) {
        setSelectedBroadcast({ id: updatedDoc.id, ...updatedDoc.data() } as Broadcast);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast({ variant: "destructive", title: "Error", description: `No se pudo actualizar el campo ${field}.` });
    }
};

  const handleAddParticipant = async () => {
    if (!selectedBroadcast || !newParticipantName.trim()) return;

    const newParticipant: Participant = {
      id: uuidv4(),
      name: newParticipantName.trim(),
      status: 'pending'
    };
    
    const updatedParticipants = [...(selectedBroadcast.participants || []), newParticipant];
    await updateBroadcastField(selectedBroadcast.id, 'participants', updatedParticipants);
    setNewParticipantName('');
  };
  
  const handleToggleParticipantStatus = async (participantId: string) => {
    if (!selectedBroadcast) return;
    
    const updatedParticipants = (selectedBroadcast.participants || []).map(p => {
      if (p.id === participantId) {
        return { ...p, status: p.status === 'paid' ? 'pending' : 'paid' };
      }
      return p;
    });
    
    await updateBroadcastField(selectedBroadcast.id, 'participants', updatedParticipants);
  };
  
  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedBroadcast) return;
    
    const updatedParticipants = (selectedBroadcast.participants || []).filter(p => p.id !== participantId);
    await updateBroadcastField(selectedBroadcast.id, 'participants', updatedParticipants);
  };
  
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };


  return (
    <SidebarProvider>
    <div className="flex min-h-screen w-full flex-row bg-muted/40">
        <Sidebar>
          <SidebarContent>
            <div className="flex flex-col items-center gap-4 px-2 sm:py-5">
                <Link href="/app" className="flex items-center gap-2 font-headline text-xl font-semibold text-primary px-4">
                <Leaf className="h-7 w-7" />
                <span className="group-data-[collapsible=icon]:hidden">Vibraciones del Alma</span>
                </Link>
            </div>
            <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/app"><Home /><span>Inicio</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/meditaciones"><Sun /><span>Meditaciones</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/diario"><BookHeart /><span>Diario</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/pacientes"><Users /><span>Pacientes</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                        <Link href="/agenda"><Calendar /><span>Agenda</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive>
                        <Link href="/difusion"><Megaphone /><span>Difusión</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
           <SidebarFooter>
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" className="w-full justify-start gap-3 text-base px-2 h-auto">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate group-data-[collapsible=icon]:hidden">{user?.email}</span>
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
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col bg-background group-data-[collapsible=icon]:sm:pl-16 transition-[padding-left] duration-200 ease-linear overflow-hidden">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="sm:hidden" />
                    <h1 className="text-4xl font-title text-foreground/80" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem' }}>Difusión</h1>
                </div>
                <Button onClick={() => handleOpenModal(null)}><Plus className="mr-2 h-4 w-4" /> Crear Difusión</Button>
            </header>
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 sm:px-6 sm:py-0 overflow-hidden">
                <div className="overflow-y-auto h-full pr-2">
                    {loading ? (
                    <div className="flex justify-center items-center h-full"><Loader /></div>
                    ) : broadcasts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {broadcasts.map((item) => {
                            const TypeIcon = typeOptions[item.type]?.icon || Megaphone;
                            return (
                                <Card 
                                    key={item.id} 
                                    className={`flex flex-col overflow-hidden cursor-pointer transition-all duration-200 ${selectedBroadcast?.id === item.id ? 'border-primary shadow-lg' : 'border-border'}`}
                                    onClick={() => setSelectedBroadcast(item)}
                                >
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="font-headline text-xl pr-2">{item.title}</CardTitle>
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleOpenModal(item)}}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDeleteClick(item.id)}}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                        <CardDescription className="flex items-center gap-2 pt-1">
                                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                            <span>{typeOptions[item.type]?.label || 'Evento'}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{item.description}</p>
                                        <div>
                                            <p className="font-semibold text-sm">Fecha del evento:</p>
                                            <p>{format(item.eventDate.toDate(), "EEEE, d 'de' MMMM 'de' yyyy, HH:mm 'hs'", { locale: es })}</p>
                                        </div>
                                         <div className="mt-2">
                                            <p className="font-semibold text-sm">Participantes:</p>
                                            <p>{item.participants?.length || 0}</p>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        {item.link && (
                                            <Button asChild variant="outline" className="w-full" onClick={(e) => e.stopPropagation()}>
                                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="mr-2 h-4 w-4"/> Ir al enlace
                                                </a>
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Megaphone className="h-16 w-16 mb-4" />
                            <h3 className="text-xl font-semibold">Aún no hay nada para difundir</h3>
                            <p>Crea tu primer taller, charla o evento para empezar.</p>
                        </div>
                    )}
                </div>
                
                <div className="overflow-y-auto h-full pl-2">
                    {selectedBroadcast ? (
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl flex items-center gap-2"><UserPlus /> Gestionar Participantes</CardTitle>
                                <CardDescription>Añade y administra los asistentes para "{selectedBroadcast.title}"</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col gap-6">
                                <div>
                                    <Label htmlFor="price" className="font-semibold text-base flex items-center gap-2"><BadgeDollarSign /> Precio del Evento</Label>
                                    <Input 
                                        id="price"
                                        type="number"
                                        placeholder="Ingrese el monto"
                                        value={selectedBroadcast.price || ''}
                                        onChange={(e) => {
                                            const newPrice = e.target.value ? parseFloat(e.target.value) : 0;
                                            setSelectedBroadcast(prev => prev ? {...prev, price: newPrice} : null);
                                        }}
                                        onBlur={(e) => updateBroadcastField(selectedBroadcast.id, 'price', selectedBroadcast.price)}
                                        className="mt-2"
                                    />
                                </div>
                                
                                <Separator />

                                <div>
                                    <Label htmlFor="new-participant" className="font-semibold text-base">Añadir Participante</Label>
                                    <div className="flex gap-2 mt-2">
                                        <Input
                                            id="new-participant"
                                            placeholder="Nombre del participante"
                                            value={newParticipantName}
                                            onChange={(e) => setNewParticipantName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                                        />
                                        <Button onClick={handleAddParticipant}>Añadir</Button>
                                    </div>
                                </div>

                                <div className="flex-grow flex flex-col">
                                    <h3 className="font-semibold text-base mb-2">Lista de Asistentes ({selectedBroadcast.participants?.length || 0})</h3>
                                    <div className="flex-grow overflow-y-auto pr-1">
                                    {selectedBroadcast.participants && selectedBroadcast.participants.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedBroadcast.participants.map(participant => (
                                                <div key={participant.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                                    <span className="font-medium">{participant.name}</span>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <Label htmlFor={`status-${participant.id}`} className={participant.status === 'paid' ? 'text-green-400' : 'text-yellow-400'}>
                                                                {participant.status === 'paid' ? 'Pagado' : 'Debe'}
                                                            </Label>
                                                            <Switch 
                                                                id={`status-${participant.id}`}
                                                                checked={participant.status === 'paid'}
                                                                onCheckedChange={() => handleToggleParticipantStatus(participant.id)}
                                                            />
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveParticipant(participant.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                            <p>No hay participantes añadidos.</p>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <Megaphone className="h-16 w-16 mb-4" />
                            <h3 className="text-xl font-semibold">Selecciona un evento</h3>
                            <p>Haz clic en una de las tarjetas de la izquierda para gestionar sus participantes.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-lg">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                    <DialogTitle>{editingId ? 'Editar Difusión' : 'Crear Nueva Difusión'}</DialogTitle>
                    <DialogDescription>
                        Completa los detalles de tu evento para compartirlo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" value={formData.title} onChange={(e) => handleFormChange('title', e.target.value)} required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => handleFormChange('description', e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="type">Tipo</Label>
                           <Select value={formData.type} onValueChange={(value: 'taller' | 'charla' | 'vivo' | 'otro') => handleFormChange('type', value)}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo..." />
                              </SelectTrigger>
                              <SelectContent>
                                  {Object.entries(typeOptions).map(([key, { label }]) => (
                                      <SelectItem key={key} value={key}>{label}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="eventDate">Fecha y Hora</Label>
                          <Input id="eventDate" type="datetime-local" value={formData.eventDate} onChange={(e) => handleFormChange('eventDate', e.target.value)} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="link">Enlace</Label>
                        <Input id="link" type="url" value={formData.link || ''} onChange={(e) => handleFormChange('link', e.target.value)} placeholder="https://ejemplo.com (Opcional)" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (editingId ? 'Guardando...' : 'Creando...') : 'Guardar'}
                    </Button>
                </DialogFooter>
              </form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la difusión.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    </SidebarProvider>
  );
}
