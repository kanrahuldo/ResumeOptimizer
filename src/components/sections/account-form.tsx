"use client";

import { useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { Eye, EyeOff, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type AccountFormProps = {
  initialName: string;
  initialEmail: string;
};

export function AccountForm({ initialName, initialEmail }: AccountFormProps) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { push } = useToast();

  const passwordHint =
    "Password should be 8 characters atleast and should have 1 special character and 1 number.";
  const passwordRule = useMemo(() => /^(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/, []);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      push({ title: "Name and email are required.", variant: "error" });
      return;
    }
    if (password) {
      if (!passwordRule.test(password)) {
        push({ title: passwordHint, variant: "error" });
        return;
      }
      if (password !== confirmPassword) {
        push({ title: "Passwords do not match.", variant: "error" });
        return;
      }
    }

    setIsBusy(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password || undefined,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        push({
          title: json.error || "Failed to update account.",
          variant: "error",
        });
        return;
      }
      setPassword("");
      setConfirmPassword("");
      push({ title: "Account updated successfully.", variant: "success" });
    } catch (error) {
      push({
        title: error instanceof Error ? error.message : "Update failed.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <Card className="border-[#2a2f55] bg-[#111325]/80 p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">
              Account details
            </h2>
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
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Password</h2>
              <span className="group relative inline-flex items-center text-sm text-slate-400 cursor-pointer">
                <Info className="h-4 w-4 text-slate-400" />
                <span className="pointer-events-none absolute bottom-full -right-3 mb-3 w-max opacity-0 transition-opacity duration-150 group-hover:opacity-100 cursor-pointer">
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
                placeholder="New password"
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
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="destructive"
            onClick={() => setConfirmLogout(true)}
          >
            Log out
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              isBusy ||
              !name.trim() ||
              !email.trim() ||
              (!password &&
                name.trim() === initialName.trim() &&
                email.trim() === initialEmail.trim())
            }
          >
            {isBusy ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out of your account?"
        description="You will need to sign in again to access your workspace."
        confirmLabel="Log out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </>
  );
}
