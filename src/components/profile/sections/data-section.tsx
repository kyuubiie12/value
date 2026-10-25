"use client";

import * as React from "react";
import { Download, FileJson, LogOut, RotateCcw, ShieldAlert, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountRow } from "@/components/auth/delete-account-row";
import { Group, Panel, SectionHeader } from "../parts";

export function DataSection({
  email,
  pending,
  confirmReset,
  setConfirmReset,
  onExport,
  onReset,
}: {
  email: string;
  pending: boolean;
  confirmReset: boolean;
  setConfirmReset: (v: boolean) => void;
  onExport: () => void;
  onReset: () => void;
}) {
  return (
    <Card>
      <SectionHeader
        icon={Download}
        title="Konto & data"
        desc="Din data er din — tag den med, hold din konto sikker, eller start forfra"
      />
      <CardContent className="flex flex-col gap-8">
        <Group title="Dine data">
          <Panel className="flex flex-wrap items-center gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-3 text-muted ring-1 ring-inset ring-line/70">
              <FileJson className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">Eksportér mine data</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-subtle">
                En JSON-fil med dine indstillinger og nøgletal (bankroll, P&L, ROI, hit rate, CLV).
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="size-3.5" />
              Eksportér
            </Button>
          </Panel>
        </Group>

        <Group title="Sikkerhed" hint="Hold din adgangskode stærk og unik for Mentor.">
          <div className="flex flex-col gap-3">
            <ChangePasswordForm />
            <Panel className="flex flex-wrap items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-3 text-muted ring-1 ring-inset ring-line/70">
                <LogOut className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">Log ud</p>
                <p className="mt-0.5 text-[11.5px] text-subtle">Afslut din session på denne enhed.</p>
              </div>
              <LogoutButton />
            </Panel>
          </div>
        </Group>

        <Group
          title="Farezone"
          hint="Disse handlinger kan ikke fortrydes."
        >
          <div className="flex flex-col gap-3">
            <Panel tone="danger" className="flex flex-wrap items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-negative/10 text-negative ring-1 ring-inset ring-negative/20">
                <RotateCcw className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-fg">Nulstil indstillinger</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-subtle">
                  Alt undtagen navn og e-mail sættes tilbage til standard — også udseende.
                </p>
              </div>
              {confirmReset ? (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="danger" onClick={onReset} loading={pending}>
                    Ja, nulstil
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmReset(false)}
                    aria-label="Annullér"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                  <RotateCcw className="size-3.5" />
                  Nulstil
                </Button>
              )}
            </Panel>
            <DeleteAccountRow email={email} />
          </div>
        </Group>

        <p className="flex items-center gap-2 text-[11px] text-subtle">
          <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
          Dine data gemmes på din konto og bruges kun til at vise din portefølje og dit feed.
        </p>
      </CardContent>
    </Card>
  );
}
