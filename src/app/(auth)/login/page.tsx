import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log ind" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-display text-[1.7rem] font-semibold tracking-tight text-fg">
        Velkommen tilbage
      </h1>
      <p className="mt-1.5 mb-7 text-[13px] text-muted">
        Log ind for at se dit feed og din portefølje.
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
