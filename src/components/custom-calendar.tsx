
"use client";

import React, { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Appointment } from '@/app/agenda/page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, ArrowLeft, Video } from 'lucide-react';
import Link from 'next/link';

interface CustomCalendarProps {
  appointments: Appointment[];
  onAddAppointment: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ 
    appointments, 
    onAddAppointment, 
    onEditAppointment,
    onDeleteAppointment 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(app => isSameDay(app.date.toDate(), day));
  };
  
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="flex h-full w-full text-white">
      {/* Sidebar */}
       <div className="w-1/4 bg-gradient-to-br from-purple-800 to-indigo-900 pt-8 pb-8 pr-8 pl-4 flex-col justify-between overflow-hidden hidden sm:flex">
        <div>
           <Button asChild variant="ghost" size="icon" className="mb-4 text-white hover:bg-white/10 hover:text-white">
                <Link href="/app">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
            </Button>
          <h2 className="text-4xl font-bold tracking-widest uppercase">{format(currentDate, 'MMMM', { locale: es })}</h2>
          <p className="text-xl font-light tracking-wider">AGENDA</p>
        </div>
        <p className="text-6xl lg:text-8xl xl:text-[8rem] font-bold leading-none tracking-tighter">{format(currentDate, 'yyyy')}</p>
      </div>

      {/* Main Calendar */}
      <div className="w-full sm:w-3/4 p-4 sm:p-8 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button onClick={prevMonth} variant="outline" size="icon"><ChevronLeft /></Button>
            <Button onClick={nextMonth} variant="outline" size="icon"><ChevronRight /></Button>
            <Button onClick={goToToday} variant="outline">Hoy</Button>
          </div>
          <Button onClick={onAddAppointment}><Plus className="mr-2 h-4 w-4" /> Agregar Cita</Button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 gap-1">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-700">{day.substring(0,3)}</div>
          ))}
          {days.map(day => {
            const dayAppointments = getAppointmentsForDay(day);
            return (
              <div
                key={day.toString()}
                className={`border border-gray-800 p-2 overflow-hidden flex flex-col gap-1 transition-colors duration-200 ${
                  isSameMonth(day, monthStart) ? 'bg-gray-900/50' : 'bg-gray-900/20 text-gray-600'
                } ${isSameDay(day, new Date()) ? 'border-indigo-500' : ''}`}
              >
                <span className={`font-semibold ${isSameDay(day, new Date()) ? 'text-indigo-400' : ''}`}>{format(day, 'd')}</span>
                <div className="flex flex-col gap-1 overflow-y-auto">
                    {dayAppointments.map(app => (
                        <button
                          key={app.id}
                          onClick={() => handleAppointmentClick(app)}
                          className="text-left text-xs p-1.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 w-full truncate"
                        >
                          {app.patientName}
                        </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
       <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.patientName}</DialogTitle>
            <DialogDescription>
              {selectedAppointment ? format(selectedAppointment.date.toDate(), "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div>
                <h4 className="font-semibold">Horario</h4>
                <p>{selectedAppointment.startTime} - {selectedAppointment.endTime || 'N/A'}</p>
              </div>
               <div>
                <h4 className="font-semibold">Modalidad</h4>
                <p className="capitalize flex items-center gap-2">
                  {selectedAppointment.modality}
                  {selectedAppointment.modality === 'meet' && selectedAppointment.meetLink && (
                    <a href={selectedAppointment.meetLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Video className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Notas</h4>
                <p className="whitespace-pre-wrap">{selectedAppointment.notes || 'No hay notas.'}</p>
              </div>
            </div>
          )}
          <DialogFooter className="justify-between">
            <div>
              <Button 
                variant="destructive"
                onClick={() => {
                  if (selectedAppointment) onDeleteAppointment(selectedAppointment.id);
                  setSelectedAppointment(null);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedAppointment(null)}>Cerrar</Button>
              <Button 
                onClick={() => {
                  if (selectedAppointment) onEditAppointment(selectedAppointment);
                  setSelectedAppointment(null);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomCalendar;
