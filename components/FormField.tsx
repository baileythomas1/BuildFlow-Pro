type FormFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
};

export function FormField({ label, value, onChange, type = "text", required, minLength }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="rounded-md border border-slate/20 px-3 py-2 text-base font-normal text-slate outline-none focus:border-sky focus:ring-1 focus:ring-sky"
      />
    </label>
  );
}
