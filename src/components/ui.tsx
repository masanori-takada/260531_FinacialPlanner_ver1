// 共通UI部品（入力・カード・セクション見出し等）。日本語UX・アクセシビリティ配慮。

import { ReactNode, useState, useEffect } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-5 ${className}`}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      )}
      {children}
    </section>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  help?: string;
}) {
  const [inputValue, setInputValue] = useState<string>(() =>
    Number.isFinite(value) ? value.toString() : ""
  );

  useEffect(() => {
    setInputValue(Number.isFinite(value) ? value.toString() : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setInputValue(valStr);
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      onChange(0);
    }
  };

  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="tabular w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
          value={inputValue}
          step={step}
          min={min}
          onChange={handleChange}
        />
        {suffix && <span className="text-sm text-gray-500 shrink-0">{suffix}</span>}
      </div>
      {help && <span className="block text-xs text-gray-400 mt-1">{help}</span>}
    </label>
  );
}

export function PercentField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: number; // 小数（0.02 = 2%）
  onChange: (v: number) => void;
  help?: string;
}) {
  return (
    <NumberField
      label={label}
      value={Math.round(value * 1000) / 10}
      onChange={(v) => onChange(v / 100)}
      suffix="%"
      step={0.1}
      help={help}
    />
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </span>
      <select
        className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300",
    danger: "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-red-600"
        : "text-gray-800";
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold tabular ${toneClass}`}>{value}</div>
    </div>
  );
}
