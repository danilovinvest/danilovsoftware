import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/modules/auth";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
