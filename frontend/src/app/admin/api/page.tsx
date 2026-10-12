import { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "@/lib/get-server-session";
import { hasPermission, type RoleLike } from "@/lib/permissions/permissions";
import { Button } from "@/components/ui/button";
import { ApiReference } from "@/components/admin/api-reference";

export const metadata: Metadata = {
  title: "API",
  description: "API reference generated from the site routes.",
};

export default async function AdminApiPage() {
  const session = await getServerSession();

  if (
    !session?.user?.roles ||
    !(await hasPermission((session.user.roles ?? undefined) as RoleLike[] | undefined, {
      resource: "admin",
      action: "read",
    }))
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 h-full">
        <h1 className="text-xl font-bold text-muted-foreground">You do not have permission to access this page.</h1>
        <Button variant="secondary">
          <Link href="/admin">Go to admin dashboard</Link>
        </Button>
      </div>
    );
  }

  return <ApiReference />;
}
