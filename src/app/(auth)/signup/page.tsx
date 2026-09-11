import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Opret konto" };

export default function SignupPage() {
  return (
    <div>
      <h1 className="font-display text-[1.7rem] font-semibold tracking-tight text-fg">
        Opret din konto
      </h1>
      <p className="mt-1.5 mb-7 text-[13px] text-muted">
        Byg din egen portefølje og følg AI&apos;ens value bets. Gratis.
      </p>
      <AuthForm mode="signup" />
    </div>
  );
}
