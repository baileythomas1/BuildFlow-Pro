import { ibmPlexMono } from "@/lib/fonts";

type Tone = "green" | "orange" | "red" | "sky" | "slate";

const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-[#EAFBF0] border-[#22C55E] text-[#22C55E]",
  orange: "bg-[#FEF3E2] border-[#D97706] text-[#D97706]",
  red: "bg-[#FBEEEC] border-[#B54A3A] text-[#B54A3A]",
  sky: "bg-[#E8F6FE] border-[#38BDF8] text-[#38BDF8]",
  slate: "bg-[#EEF1F4] border-[#1E293B] text-[#1E293B]",
};

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`${ibmPlexMono.className} inline-flex h-[22px] items-center justify-center rounded border px-[9px] py-[5px] text-[10px] font-medium uppercase tracking-[0.5px] ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
