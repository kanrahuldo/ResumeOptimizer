"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const passwordHint =
    "Password should be 8 characters atleast and should have 1 special character and 1 number.";
  const passwordRule = useMemo(() => /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/, []);

  const handleSubmit = async () => {
    setError(null);
    if (!passwordRule.test(password)) {
      setError(passwordHint);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsBusy(true);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(json.error || "Failed to create account.");
      setIsBusy(false);
      return;
    }
    router.push("/auth/sign-in");
  };

  return (
    <div className="flex min-h-[calc(100vh-160px)] items-center justify-center">
      <Card className="w-full max-w-md border-[#2a2f55] bg-[#111325]/80 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Create account</h1>
        <p className="mt-2 text-sm text-slate-400">
          Save your templates, prompts, and credentials securely.
        </p>
        <div className="mt-6 space-y-4">
          <Input
            placeholder="Full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Password</span>
              <span className="group relative inline-flex items-center cursor-pointer">
                <Info className="h-4 w-4 text-slate-400" />
                <span className="pointer-events-none absolute bottom-full -right-3 mb-3 w-max opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className="relative rounded-lg px-4 py-2 text-sm font-semibold rounded-lg border border-[#2a2f55] bg-[#0f1228]">
                    {passwordHint}
                    <span className="absolute right-3 top-full h-3 w-3 -translate-y-1/2 rotate-45 border-b border-r border-[#2a2f55] bg-[#0f1228]" />
                  </span>
                </span>
              </span>
            </div>
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
          </div>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button onClick={handleSubmit} disabled={isBusy} className="w-full">
            {isBusy ? "Creating..." : "Create account"}
          </Button>
          <div className="text-xs text-slate-400">
            Already have an account?{" "}
            <a className="hover:text-slate-200" href="/auth/sign-in">
              Sign in
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
