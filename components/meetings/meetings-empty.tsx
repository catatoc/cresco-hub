import { CalendarDays } from 'lucide-react';

export function MeetingsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-md mx-auto">
      <div
        className="w-14 h-14 rounded-full bg-[#eeeffc] grid place-items-center mb-5"
        aria-hidden="true"
      >
        <CalendarDays className="w-6 h-6 text-[#5e6ad2]" />
      </div>
      <h1 className="text-[15px] font-semibold mb-2">Aún no hay reuniones</h1>
      <p className="text-[12.5px] text-muted-foreground leading-relaxed">
        Cuando crees una reunión en Notion para este cliente, aparecerá aquí con su
        agenda, asistentes y action items.
      </p>
    </div>
  );
}
