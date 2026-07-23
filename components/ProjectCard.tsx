import type { ReactNode } from "react";
import { Badge } from "@/components/Badge";
import { spaceGrotesk, inter } from "@/lib/fonts";

type Tone = "green" | "orange" | "red" | "sky" | "slate";

type ProjectCardProps = {
  name: string;
  address: string;
  badges: { label: string; tone: Tone }[];
  children: ReactNode;
};

export function ProjectCard({ name, address, badges, children }: ProjectCardProps) {
  return (
    <div className="flex w-full flex-col items-start gap-6 rounded-md border border-[#DCE4EC] bg-white px-[29px] pb-[29px] pt-[30px]">
      <div className="flex w-full items-center justify-between gap-4">
        <div className="flex flex-col items-start gap-1">
          <h1 className={`${spaceGrotesk.className} text-2xl text-navy`}>{name}</h1>
          <p className={`${inter.className} text-[13px] text-[#5B6B7F]`}>{address}</p>
        </div>
        <div className="flex flex-shrink-0 items-start gap-2">
          {badges.map((b, i) => (
            <Badge key={i} label={b.label} tone={b.tone} />
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
