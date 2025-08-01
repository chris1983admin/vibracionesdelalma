"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp, collection, query, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Home, Leaf, BookHeart, Sun, Users, Calendar as CalendarIcon, ArrowLeft, Pencil, Trash2, Megaphone } from 'lucide-react';
import { Loader } from '@/components/loader';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';


type Patient = {
  id: string;
  userId: string;
  name: string;
  birthDate: Timestamp;
  phone: string;
  observations: string;
};

type Session = {
  id: string;
  sessionDate: Timestamp;
  terapiaRealizada: string;
  ejercicios: string;
  importe?: number;
  metodoPago: 'efectivo' | 'transferencia';
  estadoPago: boolean;
};

type NewSessionState = Omit<Session, 'id' | 'sessionDate' | 'importe'> & { sessionDate: string, importe: string };

const newSessionInitialState: NewSessionState = {
  sessionDate: format(new Date(), 'dd/MM/yyyy'),
  terapiaRealizada: '',
  ejercicios: '',
  importe: '',
  metodoPago: 'efectivo',
  estadoPago: false,
};

type SessionToPay = {
    id: string;
    importe?: number;
    metodoPago: 'efectivo' | 'transferencia';
} | null;

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-whatsapp" viewBox="0 0 16 16" {...props}>
        <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
    </svg>
);


export default function SesionesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<(Omit<Patient, 'birthDate' | 'id' | 'userId'> & { birthDate?: Date }) | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
  const [isCollectPaymentModalOpen, setIsCollectPaymentModalOpen] = useState(false);
  const [newSession, setNewSession] = useState<NewSessionState>(newSessionInitialState);
  const [sessionToEdit, setSessionToEdit] = useState<(Omit<Session, 'sessionDate' | 'importe'> & { sessionDate: string, importe: string }) | null>(null);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);
  const [sessionToPay, setSessionToPay] = useState<SessionToPay>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);


  const router = useRouter();
  const params = useParams();
  const patientId = params.patientId as string;

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
    if (user && patientId) {
      const fetchPatient = async () => {
        setLoading(true);
        const docRef = doc(db, 'pacientes', patientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().userId === user.uid) {
          setPatient({ id: docSnap.id, ...docSnap.data() } as Patient);
        } else {
          router.push('/pacientes');
        }
        setLoading(false);
      };
      fetchPatient();

      const sessionsQuery = query(collection(db, 'pacientes', patientId, 'sesiones'), orderBy('sessionDate', 'desc'));
      const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
          const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
          setSessions(sessionsData);
      }, (error) => {
          console.error("Error fetching sessions:", error);
      });

      return () => unsubscribeSessions();
    }
  }, [user, patientId, router]);


  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    return email.substring(0, 2).toUpperCase();
  }

  const formatDate = (timestamp: Timestamp | undefined, dateFormat = 'dd/MM/yyyy') => {
    if (!timestamp) return 'Fecha no disponible';
    try {
        const date = timestamp.toDate();
        if (!isValid(date)) {
            return 'Fecha inválida';
        }
        return format(date, dateFormat, { locale: es });
    } catch (error) {
        console.error("Error formatting date: ", error);
        return 'Fecha inválida';
    }
  }

   const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };
  
  const parseDateString = (dateString: string): Date | null => {
    try {
        const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
        return isNaN(parsedDate.getTime()) || dateString.length !== 10 ? null : parsedDate;
    } catch (error) {
        return null;
    }
  };
  
  const handleDateChange = (value: string): string => {
    const cleaned = value.replace(/\D/g, '').slice(0, 8);
    const parts = [];
    if (cleaned.length > 0) parts.push(cleaned.slice(0, 2));
    if (cleaned.length > 2) parts.push(cleaned.slice(2, 4));
    if (cleaned.length > 4) parts.push(cleaned.slice(4, 8));
    return parts.join('/');
  };

  const handleEditClick = () => {
    if (patient) {
      const { id, userId, ...patientData } = patient;
      setPatientToEdit({ ...patientData, birthDate: patient.birthDate.toDate() });
      setIsEditModalOpen(true);
    }
  };
  
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (patientId) {
      const docRef = doc(db, 'pacientes', patientId);
      await deleteDoc(docRef);
      setIsDeleteModalOpen(false);
      router.push('/pacientes');
    }
  };

  const handleSaveEdit = async () => {
    if (patientToEdit && patientId && user) {
      if(!patientToEdit.birthDate){
        console.error("Birth date is required");
        return;
      }
      setIsSaving(true);
      const docRef = doc(db, 'pacientes', patientId);
      try {
        const dataToSave = {
          ...patientToEdit,
          birthDate: Timestamp.fromDate(patientToEdit.birthDate),
          userId: user.uid,
        };
        await updateDoc(docRef, dataToSave as any);
        setPatient({ ...patient, ...dataToSave, id: patientId} as Patient);
        setIsEditModalOpen(false);
        setPatientToEdit(null);
      } catch (error) {
        console.error("Error updating document: ", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Session handlers
  const handleSaveNewSession = async () => {
      if (!user) return;
      const sessionDate = parseDateString(newSession.sessionDate);
      if (!sessionDate) {
        console.error("Invalid session date format");
        return;
      }
      setIsSavingSession(true);
      try {
        const { importe, ...restOfSession } = newSession;
        const dataToSave = {
          ...restOfSession,
          importe: importe ? parseFloat(importe) : 0,
          sessionDate: Timestamp.fromDate(sessionDate),
          userId: user.uid,
        };

        await addDoc(collection(db, 'pacientes', patientId, 'sesiones'), dataToSave);
        setNewSession(newSessionInitialState);
        setIsAddSessionModalOpen(false);
      } catch (error) {
        console.error("Error adding session: ", error);
      } finally {
        setIsSavingSession(false);
      }
  };

  const handleEditSessionClick = (session: Session) => {
    setSessionToEdit({ 
        ...session, 
        sessionDate: formatDate(session.sessionDate),
        importe: session.importe?.toString() || '',
    });
    setIsEditSessionModalOpen(true);
  };
  
  const handleDeleteSessionClick = (id: string) => {
    setSessionToDeleteId(id);
    setIsDeleteSessionModalOpen(true);
  };
  
  const handleSaveEditSession = async () => {
    if (sessionToEdit && sessionToEdit.id && user) {
        const sessionDate = parseDateString(sessionToEdit.sessionDate);
        if (!sessionDate) {
            console.error("Invalid session date format");
            return;
        }
        setIsSavingSession(true);
        const docRef = doc(db, 'pacientes', patientId, 'sesiones', sessionToEdit.id);
        try {
            const { id, importe, ...dataToUpdate } = sessionToEdit;
            await updateDoc(docRef, {
                ...dataToUpdate,
                importe: importe ? parseFloat(importe) : 0,
                sessionDate: Timestamp.fromDate(sessionDate),
                userId: user.uid,
            });
            setIsEditSessionModalOpen(false);
            setSessionToEdit(null);
        } catch (error) {
            console.error("Error updating session: ", error);
        } finally {
            setIsSavingSession(false);
        }
    }
  };

  const confirmDeleteSession = async () => {
    if (sessionToDeleteId) {
        const docRef = doc(db, 'pacientes', patientId, 'sesiones', sessionToDeleteId);
        await deleteDoc(docRef);
        setIsDeleteSessionModalOpen(false);
        setSessionToDeleteId(null);
    }
  };
  
  const handleCollectPaymentClick = (session: Session) => {
    setSessionToPay({
        id: session.id,
        importe: session.importe,
        metodoPago: session.metodoPago,
    });
    setIsCollectPaymentModalOpen(true);
  };
  
  const handleConfirmPayment = async () => {
    if (sessionToPay) {
        setIsSavingSession(true);
        const docRef = doc(db, 'pacientes', patientId, 'sesiones', sessionToPay.id);
        try {
            await updateDoc(docRef, {
                estadoPago: true,
                metodoPago: sessionToPay.metodoPago,
            });
            setIsCollectPaymentModalOpen(false);
            setSessionToPay(null);
        } catch (error) {
            console.error("Error updating payment status: ", error);
        } finally {
            setIsSavingSession(false);
        }
    }
  };

  const openWhatsApp = () => {
    if (patient && patient.phone) {
        const phoneNumber = patient.phone.replace(/\D/g, '');
        window.open(`https://wa.me/${phoneNumber}`, '_blank');
    }
  }

  if (loading) {
    return <Loader />;
  }

  if (!user || !patient) {
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
        <header className="sticky top-0 z-30 flex h-auto flex-col items-center gap-4 border-b bg-background px-4 py-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <div className="w-full flex items-center justify-between">
                <Button asChild variant="outline" size="icon">
                    <Link href="/pacientes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1 text-center">
                    <h1 className="text-4xl font-title text-foreground/80" style={{ fontFamily: 'Playfair Display, serif', fontSize: '2.5rem' }}>
                    {patient.name}
                    </h1>
                </div>
                 <div className="w-8"></div>
            </div>
        </header>

        <main className="flex-1 p-4 sm:px-6 sm:py-0">
             <div className="mb-6 border-b pb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-headline text-xl text-foreground/90">Datos Personales</h2>
                    <div>
                        <Button size="icon" className="h-8 w-8 mr-2 bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={handleEditClick}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={handleDeleteClick}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                        <div>
                            <Label className="font-semibold text-muted-foreground">Fecha de Nacimiento</Label>
                            <p className="text-foreground/80">{formatDate(patient.birthDate)}</p>
                        </div>
                        <div>
                            <Label className="font-semibold text-muted-foreground">Teléfono</Label>
                             <div className="flex items-center gap-2">
                                <p className="text-foreground/80">{patient.phone}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-600" onClick={openWhatsApp}>
                                    <WhatsAppIcon />
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="mt-2">
                        <Label className="font-semibold text-muted-foreground">Observaciones</Label>
                        <p className="whitespace-pre-wrap text-foreground/80">{patient.observations}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-title text-foreground/80">Sesiones</h2>
                <Button onClick={() => { setNewSession(newSessionInitialState); setIsAddSessionModalOpen(true)}}>Agregar Sesión</Button>
            </div>

            <div className="flex flex-col gap-6">
                {sessions.length > 0 ? sessions.map((session) => (
                    <Card key={session.id} className="overflow-hidden shadow-lg">
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle className="font-headline text-lg">{formatDate(session.sessionDate, "dd 'de' MMMM 'de' yyyy")}</CardTitle>
                                <CardDescription>{`Terapia: ${session.terapiaRealizada}`}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleEditSessionClick(session)}>
                                <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteSessionClick(session.id)}>
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <Label className="font-semibold text-muted-foreground">Ejercicios a realizar</Label>
                              <p className="font-body whitespace-pre-wrap text-foreground/80">{session.ejercicios}</p>
                            </div>
                             <div>
                              <Label className="font-semibold text-muted-foreground">Pago</Label>
                              <p className="font-body text-foreground/80">
                                {formatCurrency(session.importe)} - {session.metodoPago.charAt(0).toUpperCase() + session.metodoPago.slice(1)} - <span className={session.estadoPago ? 'text-green-600' : 'text-red-600'}>{session.estadoPago ? 'Pagado' : 'Debe'}</span>
                              </p>
                            </div>
                            {!session.estadoPago && (
                                <Button onClick={() => handleCollectPaymentClick(session)} className="bg-green-600 hover:bg-green-700 text-white">
                                    Cobrar
                                </Button>
                            )}
                          </div>
                        </CardContent>
                    </Card>
                    )) : (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Aún no hay sesiones registradas.</p>
                    </div>
                )}
            </div>
        </main>
      </div>

      {/* Patient Modals */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          {patientToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">Nombre</Label>
                <Input id="edit-name" value={patientToEdit.name} onChange={(e) => setPatientToEdit(prev => prev ? {...prev, name: e.target.value} : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-birthDate" className="text-right">F. de Nacimiento</Label>
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("col-span-3 justify-start text-left font-normal", !patientToEdit.birthDate && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {patientToEdit.birthDate ? format(patientToEdit.birthDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={patientToEdit.birthDate}
                        onSelect={(date) => setPatientToEdit(prev => prev ? {...prev, birthDate: date } : null)}
                        initialFocus
                        locale={es}
                        fromYear={1930}
                        toYear={new Date().getFullYear()}
                    />
                    </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-phone" className="text-right">Teléfono</Label>
                <Input id="edit-phone" value={patientToEdit.phone} onChange={(e) => setPatientToEdit(prev => prev ? {...prev, phone: e.target.value} : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-observations" className="text-right pt-2">Observaciones</Label>
                <Textarea id="edit-observations" value={patientToEdit.observations} onChange={(e) => setPatientToEdit(prev => prev ? {...prev, observations: e.target.value} : null)} className="col-span-3" rows={4} />
            </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !patientToEdit || !patientToEdit.birthDate}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al paciente y sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteModalOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Modals */}
      <Dialog open={isAddSessionModalOpen} onOpenChange={setIsAddSessionModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nueva Sesión</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-session-date" className="text-right">Fecha</Label>
              <Input id="new-session-date" value={newSession.sessionDate} onChange={(e) => setNewSession({...newSession, sessionDate: handleDateChange(e.target.value)})} className="col-span-3" placeholder="dd/MM/yyyy" maxLength={10} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-session-therapy" className="text-right">Terapia realizada</Label>
              <Input id="new-session-therapy" value={newSession.terapiaRealizada} onChange={(e) => setNewSession({...newSession, terapiaRealizada: e.target.value})} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="new-session-exercises" className="text-right pt-2">Ejercicios</Label>
              <Textarea id="new-session-exercises" value={newSession.ejercicios} onChange={(e) => setNewSession({...newSession, ejercicios: e.target.value})} className="col-span-3" rows={5} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-session-amount" className="text-right">Importe</Label>
              <Input id="new-session-amount" type="number" value={newSession.importe} onChange={(e) => setNewSession({...newSession, importe: e.target.value})} className="col-span-3" placeholder="$ 0,00" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label className="text-right">Método Pago</Label>
                <RadioGroup value={newSession.metodoPago} onValueChange={(value: 'efectivo' | 'transferencia') => setNewSession({...newSession, metodoPago: value})} className="col-span-3 flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="efectivo" id="r-efectivo" />
                        <Label htmlFor="r-efectivo" className={newSession.metodoPago === 'efectivo' ? 'text-primary font-semibold' : ''}>Efectivo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="transferencia" id="r-transferencia" />
                        <Label htmlFor="r-transferencia" className={newSession.metodoPago === 'transferencia' ? 'text-primary font-semibold' : ''}>Transferencia</Label>
                    </div>
                </RadioGroup>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Estado</Label>
                 <RadioGroup value={newSession.estadoPago.toString()} onValueChange={(value) => setNewSession({...newSession, estadoPago: value === 'true'})} className="col-span-3 flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="r-pagado" />
                        <Label htmlFor="r-pagado" className={newSession.estadoPago ? 'text-primary font-semibold' : ''}>Pagado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="r-debe" />
                        <Label htmlFor="r-debe" className={!newSession.estadoPago ? 'text-primary font-semibold' : ''}>Debe</Label>
                    </div>
                </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSessionModalOpen(false)} disabled={isSavingSession}>Cancelar</Button>
            <Button onClick={handleSaveNewSession} disabled={isSavingSession || !parseDateString(newSession.sessionDate)}>{isSavingSession ? 'Guardando...' : 'Guardar Sesión'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditSessionModalOpen} onOpenChange={setIsEditSessionModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Sesión</DialogTitle>
          </DialogHeader>
          {sessionToEdit && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-session-date" className="text-right">Fecha</Label>
                  <Input id="edit-session-date" value={sessionToEdit.sessionDate} onChange={(e) => setSessionToEdit(prev => prev ? {...prev, sessionDate: handleDateChange(e.target.value)} : null)} className="col-span-3" placeholder="dd/MM/yyyy" maxLength={10} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-session-therapy" className="text-right">Terapia realizada</Label>
                  <Input id="edit-session-therapy" value={sessionToEdit.terapiaRealizada} onChange={(e) => setSessionToEdit(prev => prev ? {...prev, terapiaRealizada: e.target.value} : null)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="edit-session-exercises" className="text-right pt-2">Ejercicios</Label>
                  <Textarea id="edit-session-exercises" value={sessionToEdit.ejercicios} onChange={(e) => setSessionToEdit(prev => prev ? {...prev, ejercicios: e.target.value} : null)} className="col-span-3" rows={5} />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-session-amount" className="text-right">Importe</Label>
                <Input id="edit-session-amount" type="number" value={sessionToEdit.importe} onChange={(e) => setSessionToEdit(prev => prev ? {...prev, importe: e.target.value} : null)} className="col-span-3" placeholder="$ 0,00" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Método Pago</Label>
                  <RadioGroup value={sessionToEdit.metodoPago} onValueChange={(value: 'efectivo' | 'transferencia') => setSessionToEdit(prev => prev ? {...prev, metodoPago: value} : null)} className="col-span-3 flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="efectivo" id="er-efectivo" />
                          <Label htmlFor="er-efectivo" className={sessionToEdit.metodoPago === 'efectivo' ? 'text-primary font-semibold' : ''}>Efectivo</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="transferencia" id="er-transferencia" />
                          <Label htmlFor="er-transferencia" className={sessionToEdit.metodoPago === 'transferencia' ? 'text-primary font-semibold' : ''}>Transferencia</Label>
                      </div>
                  </RadioGroup>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Estado</Label>
                   <RadioGroup value={sessionToEdit.estadoPago.toString()} onValueChange={(value) => setSessionToEdit(prev => prev ? {...prev, estadoPago: value === 'true'} : null)} className="col-span-3 flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="er-pagado" />
                        <Label htmlFor="er-pagado" className={sessionToEdit.estadoPago ? 'text-primary font-semibold' : ''}>Pagado</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="er-debe" />
                        <Label htmlFor="er-debe" className={!sessionToEdit.estadoPago ? 'text-primary font-semibold' : ''}>Debe</Label>
                    </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSessionModalOpen(false)} disabled={isSavingSession}>Cancelar</Button>
            <Button onClick={handleSaveEditSession} disabled={isSavingSession || !sessionToEdit || !parseDateString(sessionToEdit.sessionDate)}>{isSavingSession ? 'Guardando...' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCollectPaymentModalOpen} onOpenChange={setIsCollectPaymentModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
                <DialogTitle>Cobrar Sesión</DialogTitle>
                <DialogDescription>
                    Confirma el método de pago para marcar esta sesión como pagada.
                </DialogDescription>
            </DialogHeader>
            {sessionToPay && (
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Importe</Label>
                        <p className="col-span-3 font-semibold text-lg">{formatCurrency(sessionToPay.importe)}</p>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Método Pago</Label>
                        <RadioGroup 
                            value={sessionToPay.metodoPago} 
                            onValueChange={(value: 'efectivo' | 'transferencia') => setSessionToPay(prev => prev ? {...prev, metodoPago: value} : null)} 
                            className="col-span-3 flex items-center gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="efectivo" id="c-efectivo" />
                                <Label htmlFor="c-efectivo" className={sessionToPay.metodoPago === 'efectivo' ? 'text-primary font-semibold' : ''}>Efectivo</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="transferencia" id="c-transferencia" />
                                <Label htmlFor="c-transferencia" className={sessionToPay.metodoPago === 'transferencia' ? 'text-primary font-semibold' : ''}>Transferencia</Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
            )}
             <DialogFooter>
                <Button variant="outline" onClick={() => setIsCollectPaymentModalOpen(false)} disabled={isSavingSession}>Cancelar</Button>
                <Button onClick={handleConfirmPayment} disabled={isSavingSession} className="bg-green-600 hover:bg-green-700 text-white">{isSavingSession ? 'Procesando...' : 'Confirmar Pago'}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteSessionModalOpen} onOpenChange={setIsDeleteSessionModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteSessionModalOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
