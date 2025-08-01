import { Leaf } from 'lucide-react';

export function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Leaf className="h-12 w-12 text-primary animate-spin" />
      <p className="mt-4 font-headline text-lg text-foreground">Cargando...</p>
    </div>
  );
}
