import { Suspense } from "react";
import { LoginForm } from "@/modules/auth";

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-border-subtle bg-surface p-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
