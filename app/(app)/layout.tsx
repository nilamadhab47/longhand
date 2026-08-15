import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/session";
import { loadTree } from "@/lib/tree";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireUser();
  const folders = await loadTree(session.userId);

  return (
    <AppShell email={session.email} folders={folders}>
      {children}
    </AppShell>
  );
}
