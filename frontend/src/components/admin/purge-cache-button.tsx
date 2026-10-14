"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { purgePublicCache } from "@/app/actions/purge-public-cache";

export function PurgeCacheButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="ml-auto mr-4"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await purgePublicCache();
          if (result.ok) {
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      {pending ? "Purging..." : "Purge cache"}
    </Button>
  );
}
