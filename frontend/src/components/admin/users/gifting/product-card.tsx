"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GameServer, Product } from "@/types/store";
import { ThemeSelect } from "@/components/theme-select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function productImageSrc(product: Product): string | null {
    if (typeof product.image_url === "string" && product.image_url.trim()) {
        return product.image_url.trim();
    }
    const images = product.images;
    if (!Array.isArray(images)) return null;
    for (const image of images) {
        if (!image || typeof image !== "object") continue;
        const url = (image as { url?: unknown }).url;
        if (typeof url === "string" && url.trim()) return url.trim();
    }
    return null;
}

function productServers(product: Product): GameServer[] {
    return [...(product.gameservers ?? [])]
        .filter((server) => server?.id && server.name)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function localDateTimeValue(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface ProductCardProps {
    product: Product;
    isPending: boolean;
    onSelect: (productId: string, gameserverId?: string, expiresAt?: string) => void;
}

export function ProductCard({ product, isPending, onSelect }: ProductCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [contentMounted, setContentMounted] = useState(false);
    const [serverId, setServerId] = useState("");
    const [expiresAt, setExpiresAt] = useState("");
    const imageSrc = productImageSrc(product);
    const servers = productServers(product);
    const needsServer = servers.length > 0;
    const selectedServer = servers.find((server) => server.id === serverId);
    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    const expiresInPast = !!expiresDate && !Number.isNaN(expiresDate.getTime()) && expiresDate.getTime() <= Date.now();

    const resetChoices = () => {
        setServerId("");
        setExpiresAt("");
    };

    const handleConfirm = () => {
        if (needsServer && !serverId) return;
        if (expiresInPast) return;
        const expiresIso = expiresDate && !Number.isNaN(expiresDate.getTime()) ? expiresDate.toISOString() : undefined;
        setTimeout(() => {
            setIsOpen(false);
            setTimeout(() => {
                setContentMounted(false);
                onSelect(product.id, serverId || undefined, expiresIso);
            }, 200);
        }, 0);
    };

    const handleOpenChange = (open: boolean) => {
        if (open) {
            resetChoices();
            setContentMounted(true);
            setIsOpen(true);
        } else {
            setIsOpen(false);
            setTimeout(() => setContentMounted(false), 200);
        }
    };

    return (
        <Card className="p-4 flex items-center justify-between flex-row">
            <CardHeader className="p-0 flex flex-row items-center gap-2">
                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={typeof product.name === "string" ? product.name : ""}
                        width={65}
                        height={65}
                        className="h-[65px] w-[65px] shrink-0 rounded-md object-contain"
                    />
                ) : null}
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-sm font-medium">
                        {product.name}
                    </CardTitle>
                    {product.tags && Array.isArray(product.tags) && product.tags.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Tag: {product.tags.map((tag) => (tag as { name?: string; slug?: string }).name ?? (tag as { slug?: string }).slug ?? '').filter(Boolean).join(", ")}
                        </p>
                    )}
                </div>
            </CardHeader>
            <CardFooter className="p-0 flex items-center h-full">
                <AlertDialog open={isOpen} onOpenChange={(open) => setTimeout(() => handleOpenChange(open), 0)}>
                    <span
                        className="inline-block"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setTimeout(() => handleOpenChange(true), 0);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setTimeout(() => handleOpenChange(true), 0);
                            }
                        }}
                    >
                        <Button type="button">Select</Button>
                    </span>
                    {contentMounted && (
                        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Selection</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Gift {product.name}
                                    {selectedServer ? ` on ${selectedServer.name}` : ""}
                                    {expiresDate && !expiresInPast
                                        ? `. It expires ${expiresDate.toLocaleString()}.`
                                        : ". It will not expire."}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            {needsServer ? (
                                <div>
                                    <p className="pb-2 text-[10px] tracking-[1.2px] text-muted-foreground">SERVER</p>
                                    <ThemeSelect
                                        value={serverId}
                                        onValueChange={setServerId}
                                        placeholder="Select a server…"
                                        className="h-[37px] text-[11px]"
                                        options={servers.map((server) => ({
                                            value: server.id,
                                            label: server.name,
                                        }))}
                                    />
                                </div>
                            ) : null}
                            <div className="space-y-2">
                                <p className="text-[10px] tracking-[1.2px] text-muted-foreground">EXPIRATION</p>
                                <Input
                                    type="datetime-local"
                                    value={expiresAt}
                                    min={localDateTimeValue(new Date())}
                                    onChange={(event) => setExpiresAt(event.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave this empty and the package will not expire.
                                </p>
                                {expiresInPast ? (
                                    <p className="text-xs text-destructive">Choose a future date.</p>
                                ) : null}
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirm} disabled={isPending || (needsServer && !serverId) || expiresInPast}>
                                    {isPending ? "Confirming..." : "Confirm"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                </AlertDialog>
            </CardFooter>
        </Card>
    );
}