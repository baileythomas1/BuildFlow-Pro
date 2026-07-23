import { ibmPlexMono, inter } from "@/lib/fonts";

const DOT_TONES = {
  green: "#22C55E",
  orange: "#D97706",
  red: "#B54A3A",
} as const;

type StatCardProps = {
  label: string;
  value: string;
  valueTone?: "navy" | "orange";
  breakdown?: { label: string; value: number; tone: keyof typeof DOT_TONES }[];
};

export function StatCard({ label, value, valueTone = "navy", breakdown }: StatCardProps) {
  return (
    <div className="flex h-[125px] flex-col items-start gap-2 rounded-md border border-[#DCE4EC] bg-white p-[21px]">
      <p className={`${inter.className} text-[13px] font-normal text-[#5B6B7F]`}>{label}</p>
      <p
        className={`${ibmPlexMono.className} text-[28px] font-normal ${
          valueTone === "orange" ? "text-[#D97706]" : "text-navy"
        }`}
      >
        {value}
      </p>
      {breakdown && (
        <div className="flex items-start gap-2.5 pt-0.5">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5" title={item.label}>
              <span className="size-1.5 rounded-full" style={{ backgroundColor: DOT_TONES[item.tone] }} />
              <span className={`${ibmPlexMono.className} text-[11px] font-normal text-[#1E293B]`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
