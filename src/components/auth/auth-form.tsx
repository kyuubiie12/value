"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { LEGAL_LINKS } from "@/lib/site";
import { signupAction, loginAction, type AuthState } from "@/lib/auth/actions";

type Mode = "login" | "signup";

const EMPTY: AuthState = {};

export function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "signup" ? signupAction : loginAction;
  const [state, formAction, pending] = useActionState(action, EMPTY);

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      {mode === "signup" && (
        <Field
          id="name"
          label="Navn"
          type="text"
          autoComplete="name"
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
          autoFocus
        />
      )}

      <Field
        id="email"
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="dig@eksempel.dk"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        autoFocus={mode === "login"}
      />

      <PasswordField
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        error={state.fieldErrors?.password}
        hint={mode === "signup" ? "Mindst 8 tegn." : undefined}
      />

      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-negative/30 bg-negative/10 px-3 py-2 text-[12px] text-negative"
        >
          {state.error}
        </p>
      )}

      {mode === "signup" && (
        <p className="text-[11.5px] leading-relaxed text-subtle">
          Når du opretter en konto, bekræfter du, at du er mindst 18 år, og accepterer{" "}
          <a
            href={LEGAL_LINKS.terms}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline underline-offset-2 hover:text-fg"
          >
            vilkårene
          </a>{" "}
          og{" "}
          <a
            href={LEGAL_LINKS.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted underline underline-offset-2 hover:text-fg"
          >
            privatlivspolitikken
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={cn(
          "btn-shine btn-lift mt-1.5 inline-flex h-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-primary px-4",
          "text-[13px] font-semibold text-primary-contrast",
          "transition-[background-color,transform] duration-150 active:translate-y-px",
          "hover:bg-primary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "disabled:opacity-60",
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            {mode === "signup" ? "Opret konto" : "Log ind"}
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <p className="mt-1 text-center text-[12px] text-subtle">
        {mode === "signup" ? (
          <>
            Har du allerede en konto?{" "}
            <Link
              href="/login"
              className="font-medium text-primary-strong hover:underline"
            >
              Log ind
            </Link>
          </>
        ) : (
          <>
            Ny her?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary-strong hover:underline"
            >
              Opret en konto
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

const inputClass = (error?: string) =>
  cn(
    "h-11 w-full rounded-[var(--radius-sm)] border bg-bg px-3.5 text-sm text-fg",
    "placeholder:text-subtle outline-none transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-ring/25",
    error
      ? "border-negative/60 focus-visible:border-negative/70"
      : "border-line hover:border-line-strong focus-visible:border-primary/70",
  );

function FieldShell({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[12px] font-medium text-muted"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-negative">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        name={id}
        required
        aria-invalid={error ? true : undefined}
        className={inputClass(error)}
        {...props}
      />
    </FieldShell>
  );
}

function PasswordField({
  autoComplete,
  error,
  hint,
}: {
  autoComplete: string;
  error?: string;
  hint?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <FieldShell id="password" label="Adgangskode" error={error} hint={hint}>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          className={cn(inputClass(error), "pr-11")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Skjul adgangskode" : "Vis adgangskode"}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-subtle transition-colors hover:text-fg"
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </FieldShell>
  );
}
