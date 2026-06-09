import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { SettingsTabs } from "@/components/sections/settings-tabs";
import { authOptions } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  return <SettingsTabs />;
}
