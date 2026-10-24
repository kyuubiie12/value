"use client";

import * as React from "react";
import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { changePasswordAction, type PasswordState } from "@/lib/auth/actions";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EMPTY: PasswordState = {};

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, EMPTY);
  const formRef = React.useRef<HTMLFormElement>(null);

  // Clear the fields once a change goes through.
  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3.5 rounded-card border border-line/60 bg-surface-2/35 p-4"
    >
      <div>
        <p className="text-[13px] font-medium text-fg">Skift adgangskode</p>
        <p className="text-[11px] text-subtle">
          Andre enheder logges ud, når du skifter.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Passfield
          id="cp-current"
          name="current"
          label="Nuværende"
          autoComplete="current-password"
          error={state.fieldErrors?.current}
        />
        <Passfield
          id="cp-next"
          name="next"
          label="Ny"
          autoComplete="new-password"
          error={state.fieldErrors?.next}
        />
        <Passfield
          id="cp-confirm"
          name="confirm"
          label="Gentag ny"
          autoComplete="new-password"
          error={state.fieldErrors?.confirm}
        />
      </div>

      {state.error && (
        <p className="text-[11px] text-negative">{state.error}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" variant="outline" loading={pending}>
          Opdatér adgangskode
        </Button>
        {state.ok && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-positive">
            <Check className="size-3.5" strokeWidth={3} />
            Adgangskoden er skiftet
          </span>
        )}
        {pending && !state.ok && (
          <Loader2 className="size-3.5 animate-spin text-subtle" />
        )}
      </div>
    </form>
  );
}

function Passfield({
  id,
  name,
  label,
  error,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  error?: string;
  autoComplete: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={error ? "border-negative/60" : undefined}
      />
      {error && <p className="mt-1 text-[11px] text-negative">{error}</p>}
    </div>
  );
}
