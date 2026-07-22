import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500"] });

type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
};

export function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  placeholder,
}: FormFieldProps) {
  return (
    <label className={`${inter.className} flex flex-col gap-2 text-xs font-medium text-[#5B6B7F]`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="h-10 rounded border border-[#DCE4EC] bg-white px-[15px] text-sm font-normal text-slate outline-none placeholder:text-[#757575] focus:border-sky focus:ring-1 focus:ring-sky"
      />
    </label>
  );
}
