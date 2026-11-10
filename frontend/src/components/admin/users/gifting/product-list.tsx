"use client";

import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/app/actions/admin-store";
import { ProductCard } from "./product-card";
import { Product } from "@/types/store";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductListProps {
    isPending: boolean
    onProductSelect: (productId: string, gameserverId?: string, expiresAt?: string) => void;
}

export function ProductList({ onProductSelect, isPending }: ProductListProps) {
    const { data: products, isLoading, isSuccess, isError, error } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const data = await getProducts()
            if ('error' in data) {
                throw new Error(data.error)
            }
            if ('data' in data) {
                return data.data as Product[]
            }
            throw new Error('Invalid response format')
        },
    });

    const [search, setSearch] = useState("");
    const filteredProducts = useMemo(() => {
        if (!products || !Array.isArray(products)) {
            return []
        }
        return products.filter((product: Product) =>
            (product.name ?? '').toLowerCase().includes(search.toLowerCase()))
    }, [products, search]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4">
                {[...Array(3)].map((_, index) => (
                    <Skeleton key={index} className="h-8 w-full" />
                ))}
            </div>
        );
    }

    if (isError) {
        const errorMessage = error instanceof Error ? error.message : "Error loading products";
        const is403Error = errorMessage.includes("403") || errorMessage.toLowerCase().includes("forbidden");
        const is401Error = errorMessage.includes("401") || errorMessage.toLowerCase().includes("unauthorized");
        
        return (
            <div className="space-y-2 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
                <div className="text-destructive font-medium">
                    {is401Error || is403Error 
                        ? "Permission Denied" 
                        : "Error Loading Products"}
                </div>
                <div className="text-sm text-muted-foreground">
                    {is401Error 
                        ? "You do not have permission to view products. Please contact an administrator."
                        : is403Error
                        ? "Access to products is forbidden. This may be due to API key permissions or configuration issues."
                        : errorMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products"
            />
            <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 gap-4 pr-4">
                    {isSuccess ? (<AnimatePresence>
                        {filteredProducts?.map((product: Product) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ProductCard
                                    product={product}
                                    isPending={isPending}
                                    onSelect={onProductSelect}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>) : null}
                </div>
            </ScrollArea>
        </div>
    );
}