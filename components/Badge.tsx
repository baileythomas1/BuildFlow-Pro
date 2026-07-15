type Tone = "green" | "orange" | "red" | "sky" | "slate";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-green/10 text-green border-green/30",
  orange: "bg-orange/10 text-orange border-orange/30",
  red: "bg-red-50 text-red-600 border-red-200",
  sky: "bg-sky/10 text-sky border-sky/30",
  slate: "bg-slate/10 text-slate border-slate/30",
};

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
