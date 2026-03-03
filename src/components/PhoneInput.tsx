"use client";

/** Reusable +84 phone input component */
interface PhoneInputProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  placeholder?: string;
}

export function PhoneInput({
  value,
  onChange,
  id,
  placeholder = "912 345 678",
}: PhoneInputProps) {
  return (
    <div className="flex rounded-lg border border-stone-200 overflow-hidden focus-within:ring-2 focus-within:ring-stone-800 focus-within:border-stone-800 transition-all">
      <span className="flex items-center px-3 bg-stone-100 text-stone-600 text-sm font-mono border-r border-stone-200 select-none whitespace-nowrap">
        🇻🇳 +84
      </span>
      <input
        id={id}
        type="tel"
        name="tel-national"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2 text-sm bg-white outline-none placeholder:text-stone-400"
      />
    </div>
  );
}
