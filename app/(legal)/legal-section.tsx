// Sección de una página legal: título + prosa con estilos compartidos.
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-medium tracking-[-0.02em] text-[#1A1612] mb-3">{title}</h2>
      <div className="text-sm leading-relaxed text-[#5C544A] space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_strong]:text-[#1A1612] [&_strong]:font-medium [&_ul]:marker:text-[#7E9A80]">
        {children}
      </div>
    </section>
  );
}
