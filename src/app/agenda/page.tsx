
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { es } from 'date-fns/locale';
import { format, setHours, setMinutes, parseISO } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Home, Leaf, BookHeart, Sun, Users, Video, PanelLeft, Megaphone } from 'lucide-react';
import { Loader } from '@/components/loader';
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";
import CustomCalendar from '@/components/custom-calendar';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


export type Appointment = {
  id: string;
  date: Timestamp;
  patientId: string;
  patientName: string;
  notes?: string;
  startTime: string;
  endTime?: string;
  modality: 'presencial' | 'meet';
  meetLink?: string;
  userId: string;
};

type Patient = {
  id: string;
  name: string;
};

type AppointmentFormState = {
    patientId: string;
    date: Date | undefined;
    startTime: string;
    endTime: string;
    notes: string;
    modality: 'presencial' | 'meet';
    meetLink: string;
}

const appointmentFormInitialState: AppointmentFormState = {
    patientId: '',
    date: new Date(),
    startTime: '',
    endTime: '',
    notes: '',
    modality: 'presencial',
    meetLink: ''
}

export default function AgendaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [newAppointment, setNewAppointment] = useState<AppointmentFormState>(appointmentFormInitialState);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
        const q = query(collection(db, 'citas'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apps = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Appointment);
            setAppointments(apps);
        }, (error) => {
            console.error("Error fetching appointments: ", error);
        });

        const fetchPatients = async () => {
          const patientsQuery = query(collection(db, 'pacientes'), where('userId', '==', user.uid));
          const querySnapshot = await getDocs(patientsQuery);
          const patientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
          setPatients(patientsData);
        };
        fetchPatients().catch(console.error);
        
        return () => unsubscribe();
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

  const handleSaveAppointment = async (isEditing: boolean) => {
    const appointmentData = isEditing ? editingAppointment : newAppointment;
    
    if (!user || !appointmentData || !appointmentData.patientId || !appointmentData.date || !appointmentData.startTime) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Por favor completa todos los campos obligatorios." });
      return;
    }
    
    setIsSaving(true);
    
    try {
        const selectedPatient = patients.find(p => p.id === appointmentData.patientId);
        if (!selectedPatient) {
            toast({ variant: "destructive", title: "Error", description: "No se encontró el paciente seleccionado." });
            setIsSaving(false);
            return;
        }

        if (!appointmentData.date) {
             toast({ variant: "destructive", title: "Error", description: "La fecha no es válida." });
             setIsSaving(false);
             return;
        }

        // Safely create date object
        const datePart = appointmentData.date instanceof Timestamp 
            ? appointmentData.date.toDate() 
            : new Date(appointmentData.date);

        if (isNaN(datePart.getTime())) {
            toast({ variant: "destructive", title: "Error", description: "El formato de la fecha es inválido." });
            setIsSaving(false);
            return;
        }

        // Safely set time
        let finalAppointmentDate = datePart;
        if (typeof appointmentData.startTime === 'string' && appointmentData.startTime.includes(':')) {
            const [hours, minutes] = appointmentData.startTime.split(':').map(Number);
            finalAppointmentDate = setHours(datePart, hours);
            finalAppointmentDate = setMinutes(finalAppointmentDate, minutes);
        } else {
            toast({ variant: "destructive", title: "Error", description: "La hora de inicio no es válida." });
            setIsSaving(false);
            return;
        }

        const dataToSave: Omit<Appointment, 'id'> = {
          userId: user.uid,
          patientId: appointmentData.patientId,
          patientName: selectedPatient.name,
          date: Timestamp.fromDate(finalAppointmentDate),
          startTime: appointmentData.startTime,
          endTime: (appointmentData as any).endTime || '',
          notes: (appointmentData as any).notes || '',
          modality: (appointmentData as any).modality || 'presencial',
          meetLink: (appointmentData as any).modality === 'meet' ? (appointmentData as any).meetLink || '' : '',
        };

        if (isEditing && editingAppointment) {
            const docRef = doc(db, 'citas', editingAppointment.id);
            await updateDoc(docRef, dataToSave);
            toast({ title: "Cita actualizada", description: "La cita ha sido modificada exitosamente." });
        } else {
            await addDoc(collection(db, 'citas'), dataToSave);
            toast({ title: "Cita creada", description: "La nueva cita ha sido agregada a tu agenda." });
        }

        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setNewAppointment(appointmentFormInitialState);
        setEditingAppointment(null);

    } catch (error) {
        console.error("Error saving appointment: ", error);
        toast({ variant: "destructive", title: "Error", description: `No se pudo guardar la cita. ${error}` });
    } finally {
        setIsSaving(false);
    }
  };


  const handleEditClick = (appointment: Appointment) => {
    setEditingAppointment({
      ...appointment,
      date: appointment.date.toDate(),
    } as any);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteClick = (id: string) => {
    setDeletingAppointmentId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if(deletingAppointmentId) {
      try {
        await deleteDoc(doc(db, "citas", deletingAppointmentId));
        toast({ title: "Cita eliminada" });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar la cita." });
      } finally {
        setIsDeleteModalOpen(false);
        setDeletingAppointmentId(null);
      }
    }
  };
  
  const handleFormChange = <T extends keyof (AppointmentFormState)>(
    field: T,
    value: (AppointmentFormState)[T],
    isEditing: boolean
  ) => {
    if (isEditing) {
      setEditingAppointment(prev => {
        if (!prev) return null;
        // The type assertion is needed because editingAppointment is `Appointment | null`,
        // but we are updating it with `AppointmentFormState` values.
        // This is acceptable as the structure is largely compatible for the form.
        return { ...prev, [field]: value } as any;
      });
    } else {
      setNewAppointment(prev => ({ ...prev, [field]: value }));
    }
  };
  
  const renderAppointmentForm = (isEditing: boolean) => {
    const formState = isEditing ? (editingAppointment ? {
      ...editingAppointment,
      date: editingAppointment.date instanceof Timestamp ? editingAppointment.date.toDate() : (editingAppointment as any).date,
      endTime: editingAppointment.endTime || '',
      notes: editingAppointment.notes || '',
      modality: editingAppointment.modality || 'presencial',
      meetLink: editingAppointment.meetLink || ''
    } : null) : newAppointment;
  
    if (!formState) return null;
  
    const timeSlots = Array.from({ length: (20 - 8) * 2 + 1 }, (_, i) => {
      const hour = 8 + Math.floor(i / 2);
      const minute = i % 2 === 0 ? '00' : '30';
      return `${hour.toString().padStart(2, '0')}:${minute}`;
    });
  
    return (
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="patient" className="text-right">Paciente</Label>
          <Select
            value={formState.patientId}
            onValueChange={(value) => handleFormChange('patientId', value, isEditing)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar paciente..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="date" className="text-right">Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn("col-span-3 justify-start text-left font-normal", !formState.date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formState.date ? format(formState.date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formState.date}
                onSelect={(date) => handleFormChange('date', date, isEditing)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="startTime" className="text-right">Hora Inicio</Label>
          <Select
            value={formState.startTime}
            onValueChange={(value) => handleFormChange('startTime', value, isEditing)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar hora" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map(time => <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="endTime" className="text-right">Hora Fin</Label>
          <Select
            value={formState.endTime}
            onValueChange={(value) => handleFormChange('endTime', value, isEditing)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="Seleccionar hora" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map(time => <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Modalidad</Label>
          <RadioGroup
            value={formState.modality}
            onValueChange={(value: 'presencial' | 'meet') => handleFormChange('modality', value, isEditing)}
            className="col-span-3 flex items-center gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="presencial" id="r-presencial" />
              <Label htmlFor="r-presencial">Presencial</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="meet" id="r-meet" />
              <Label htmlFor="r-meet">Meet</Label>
            </div>
          </RadioGroup>
        </div>
        {formState.modality === 'meet' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="meetLink" className="text-right">Enlace Meet</Label>
            <Input id="meetLink" type="url" value={formState.meetLink} onChange={(e) => handleFormChange('meetLink', e.target.value, isEditing)} className="col-span-3" placeholder="https://meet.google.com/..." />
          </div>
        )}
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="notes" className="text-right pt-2">Notas</Label>
          <Textarea id="notes" value={formState.notes} onChange={(e) => handleFormChange('notes', e.target.value, isEditing)} className="col-span-3" rows={3} />
        </div>
      </div>
    );
  };
  

  if (loading || !user) return <Loader />;

  const isFormInvalid = (form: AppointmentFormState | Appointment | null) => {
    return !form || !form.patientId || !form.date || !form.startTime;
  }

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
                    <SidebarMenuButton asChild isActive>
                        <Link href="/agenda"><CalendarIcon /><span>Agenda</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild>
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
                    <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate group-data-[collapsible=icon]:hidden">{user.email}</span>
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
             <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 shrink-0">
                 <SidebarTrigger className="sm:hidden" />
            </header>
            <main className="flex-1 bg-background flex flex-col overflow-auto">
              <CustomCalendar 
                  appointments={appointments}
                  onAddAppointment={() => { setNewAppointment(appointmentFormInitialState); setIsAddModalOpen(true); }}
                  onEditAppointment={handleEditClick}
                  onDeleteAppointment={handleDeleteClick}
              />
            </main>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Agregar Nueva Cita</DialogTitle></DialogHeader>
                {renderAppointmentForm(false)}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                  <Button onClick={() => handleSaveAppointment(false)} disabled={isSaving || isFormInvalid(newAppointment)}>
                    {isSaving ? "Guardando..." : "Guardar Cita"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingAppointment(null); setIsEditModalOpen(isOpen);}}>
              <DialogContent>
                <DialogHeader><DialogTitle>Editar Cita</DialogTitle></DialogHeader>
                {renderAppointmentForm(true)}
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingAppointment(null); }}>Cancelar</Button>
                  <Button onClick={() => handleSaveAppointment(true)} disabled={isSaving || isFormInvalid(editingAppointment)}>
                    {isSaving ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>Esta acción no se puede deshacer. Esto eliminará permanentemente la cita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Toaster />
        </div>
      </div>
    </SidebarProvider>
  );
}

    