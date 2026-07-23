import { ibmPlexMono } from "@/lib/fonts";

type SectionDividerProps = {
  label: string;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  className?: string;
};

export function SectionDivider({ label, action, className = "" }: SectionDividerProps) {
  return (
    <div className={`flex w-full items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-[#DCE4EC]" />
      <span className={`${ibmPlexMono.className} text-[11px] uppercase tracking-[1.1px] text-[#5B6B7F]`}>
        {label}
      </span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="flex h-[35px] items-center justify-center rounded bg-orange px-4 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {action.label}
        </button>
      )}
      <span className="h-px flex-1 bg-[#DCE4EC]" />
    </div>
  );
}
