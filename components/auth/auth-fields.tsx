"use client";

// Shared form primitives for the auth surface (/login, /signup,
// /reset-password): the labelled text field, the password field with the
// animated eye toggle, the checkbox, and the submit button with the animated
// arrow. Kept here so every auth screen stays visually and behaviourally
// identical, in the worktable form language from app/strap-public.css.

import { useId, useState, type ReactNode, type Ref } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { ArrowRightIcon } from "@/components/ui/arrow-right";
import { EyeToggleIcon } from "@/components/ui/eye-toggle";
import { useAnimatedIconControls } from "@/components/strap/animated-icon-controls";

type AuthFieldProps = {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

export function AuthField({
  ref,
  label,
  type,
  value,
  onChange,
  autoComplete,
  disabled,
  error,
  trailing,
}: AuthFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const input = (
    <input
      id={id}
      ref={ref}
      type={type}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      autoComplete={autoComplete}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="strap-input"
    />
  );

  return (
    <div className="strap-field">
      <label className="strap-field-label" htmlFor={id}>
        {label}
      </label>
      {trailing ? (
        <div className="strap-input-wrap">
          {input}
          <div className="strap-input-trailing">{trailing}</div>
        </div>
      ) : (
        input
      )}
      {error ? (
        <p id={errorId} className="strap-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  error,
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [show, setShow] = useState(false);
  const eyeShake = useAnimatedIconControls(0, undefined, 600);

  return (
    <AuthField
      ref={inputRef}
      type={show ? "text" : "password"}
      label={label}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
      trailing={
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow((v) => !v)}
          onMouseEnter={eyeShake.start}
          onMouseLeave={eyeShake.settle}
        >
          <EyeToggleIcon
            ref={eyeShake.iconRef}
            off={show}
            size={18}
            className="inline-flex items-center justify-center"
          />
        </button>
      }
    />
  );
}

export function AuthCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="strap-checkbox"
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> : null}
    </button>
  );
}

export function AuthSubmitButton({
  label,
  loading,
  disabled,
}: {
  label: string;
  loading: boolean;
  disabled?: boolean;
}) {
  const arrow = useAnimatedIconControls(80, undefined, 420);

  return (
    <button
      type="submit"
      disabled={disabled}
      aria-busy={loading || undefined}
      onMouseEnter={arrow.start}
      onMouseLeave={arrow.settle}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") arrow.start();
      }}
      className="strap-button strap-button-primary strap-button-block strap-button-icon"
    >
      {label}
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowRightIcon
          ref={arrow.iconRef}
          size={16}
          className="inline-flex shrink-0 items-center justify-center leading-none"
        />
      )}
    </button>
  );
}
