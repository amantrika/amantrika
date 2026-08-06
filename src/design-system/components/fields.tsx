"use client";

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

/**
 * Form fields with the ornate gold double-line focus treatment
 * (no default blue ring). Label + optional hint built in.
 */

const fieldBase =
  "w-full rounded-soft border border-ornate/50 bg-raised px-4 py-2.5 text-foreground placeholder:text-muted/70 transition-shadow outline-none " +
  "focus:border-ornate focus:shadow-[0_0_0_1px_var(--color-border-ornate),0_0_0_4px_var(--color-surface),0_0_0_5px_var(--color-border-ornate)]";

function FieldWrap({ label, hint, id, children }: { label?: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="type-overline">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="type-caption">{hint}</p>}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, hint, className = "", id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} id={fieldId}>
      <input ref={ref} id={fieldId} className={`${fieldBase} ${className}`} {...rest} />
    </FieldWrap>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, hint, options, className = "", id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} id={fieldId}>
      <select ref={ref} id={fieldId} className={`${fieldBase} cursor-pointer ${className}`} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrap>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, hint, className = "", id, rows = 4, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldWrap label={label} hint={hint} id={fieldId}>
      <textarea ref={ref} id={fieldId} rows={rows} className={`${fieldBase} resize-y ${className}`} {...rest} />
    </FieldWrap>
  );
});

/** Styled native date input — keeps keyboard/screen-reader behavior for free. */
export const DatePicker = forwardRef<HTMLInputElement, InputProps>(function DatePicker(props, ref) {
  return <Input ref={ref} type="date" {...props} />;
});

/** Styled native time input. */
export const TimePicker = forwardRef<HTMLInputElement, InputProps>(function TimePicker(props, ref) {
  return <Input ref={ref} type="time" {...props} />;
});
