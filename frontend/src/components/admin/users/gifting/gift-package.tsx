"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductList } from "./product-list";
import { Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { assignPackage } from "@/app/actions/admin-store";
import { toast } from "sonner";

export function GiftPackage({ customerId, steamId }: { customerId: string; steamId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({
      productId,
      gameserverId,
      expiresAt,
    }: {
      productId: string;
      gameserverId?: string;
      expiresAt?: string;
    }) => {
      const result = await assignPackage(customerId, productId, steamId, gameserverId, expiresAt);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => setContentMounted(false), 200);
      }, 0);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to assign package");
    }
  });

  const handleProductSelect = (productId: string, gameserverId?: string, expiresAt?: string) => {
    setTimeout(() => mutation.mutate({ productId, gameserverId, expiresAt }), 0);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setContentMounted(true);
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setTimeout(() => setContentMounted(false), 200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setTimeout(() => handleOpenChange(open), 0)}>
      <span
        className="inline-block"
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => {
            setContentMounted(true);
            setIsOpen(true);
          }, 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setTimeout(() => {
              setContentMounted(true);
              setIsOpen(true);
            }, 0);
          }
        }}
      >
        <Button size="sm" variant="secondary" type="button" className="w-fit md:w-full justify-start">
          <Package className="mr-2 h-4 w-4" />
          Gift Package
        </Button>
      </span>
      {contentMounted && (
        <DialogContent
          className="sm:max-w-[700px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Select a Product to Gift</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div>Loading products...</div>}>
            <ProductList
              isPending={mutation.isPending}
              onProductSelect={handleProductSelect}
            />
          </Suspense>
        </DialogContent>
      )}
    </Dialog>
  );
}