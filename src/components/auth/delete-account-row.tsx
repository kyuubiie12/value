"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { deleteAccountAction } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DeleteAccountRow({ email }: { email: string }) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <div className="rounded-card border border-negative/25 bg-negative/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">Slet konto</p>
          <p className="text-[11px] text-subtle">
            Fjerner din profil, portefølje og hele historikken. Kan ikke fortrydes.
          </p>
        </div>
        {!open && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 border-negative/40 text-negative hover:bg-negative/10"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Slet konto
          </Button>
        )}
      </div>

      {open && (
        <form action={deleteAccountAction} className="mt-3 flex flex-col gap-2">
          <label htmlFor="del-confirm" className="text-[11px] text-muted">
            Skriv <span className="font-medium text-fg">{email}</span> for at
            bekræfte
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="del-confirm"
              name="confirm"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full max-w-xs"
            />
            <Button
              type="submit"
              size="sm"
              variant="danger"
              disabled={!matches}
            >
              Slet permanent
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              <X className="size-3.5" />
              Fortryd
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
