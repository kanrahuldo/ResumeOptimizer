"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setIsBusy(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setIsBusy(false);
      return;
    }

    router.push("/app");
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
      <Card className="w-full max-w-md border-[#2a2f55] bg-[#111325]/80 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Access your saved templates, prompts, and outputs.
        </p>
        <div className="mt-6 space-y-4">
          <Input
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button onClick={handleSubmit} disabled={isBusy} className="w-full">
            {isBusy ? "Signing in..." : "Sign in"}
          </Button>
          <div className="flex justify-between text-xs text-slate-400">
            <a className="hover:text-slate-200" href="/auth/sign-up">
              Create account
            </a>
            <a className="hover:text-slate-200" href="/auth/forgot-password">
              Forgot password
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
