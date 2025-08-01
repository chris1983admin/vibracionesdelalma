"use client";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Note: AppointmentForm is not defined here. This component assumes it will be passed as a child
// or that it needs to be created. For now, this structure matches the user's image.
// This will likely need another component `AppointmentForm`.

export default function AppointmentDialog({ open, onOpenChange, onSave, isSaving, newAppointment, AppointmentForm }: any) {
  return (
    <DialogContent
      aria-labelledby="dialog-title-add"
      aria-describedby="dialog-description-add"
    >
      <DialogHeader>
        <DialogTitle id="dialog-title-add">Agregar Nueva Cita</DialogTitle>
        <DialogDescription id="dialog-description-add">
          Completa los campos para programar una nueva cita con un paciente.
        </DialogDescription>
      </DialogHeader>

      {/* This will cause an error if AppointmentForm is not a valid component */}
      {/* <AppointmentForm /> */}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(false)} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar Cita"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}