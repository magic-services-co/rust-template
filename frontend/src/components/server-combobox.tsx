"use client";

import * as React from "react"
import useServers, { Server } from "@/hooks/use-servers";
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
} from "@/components/ui/drawer"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ServerComboboxProps = {
    onChange?: (value: string) => void;
    value?: string | null;
    groupByCategory?: boolean;
    allowGlobal?: boolean;
    allowNone?: boolean;
    align?: "start" | "center" | "end";
    modal?: boolean;
    triggerClassName?: string;
    triggerStyle?: React.CSSProperties;
    popoverContentClassName?: string;
    popoverContentStyle?: React.CSSProperties;
    fitMinWidth?: number;
    fitMaxWidth?: number;
    fallbackLabel?: string;
}

export function ServerCombobox({
    onChange,
    value,
    groupByCategory = true,
    allowGlobal = false,
    allowNone = false,
    align = "center",
    modal = false,
    triggerClassName,
    triggerStyle,
    popoverContentClassName,
    popoverContentStyle,
    fitMinWidth,
    fitMaxWidth,
    fallbackLabel,
}: ServerComboboxProps) {
    const { data: serverCategories, ...serversQuery } = useServers();
    const [open, setOpen] = React.useState(false)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [selectedServer, setSelectedServer] = React.useState<Server | null>(null)
    const [searchQuery, setSearchQuery] = React.useState("")
    const triggerRef = React.useRef<HTMLButtonElement>(null)
    const sized = fitMinWidth != null && fitMaxWidth != null
    const [fitWidth, setFitWidth] = React.useState(fitMinWidth)

    React.useEffect(() => {
        const server = serverCategories?.flatMap(c => c.servers).find(s => s.server_id === value);
        setSelectedServer(server || null);
    }, [value, serverCategories]);

    const filteredServers = React.useMemo(() => {
        if (!serverCategories) return [];
        const allServers = serverCategories.flatMap(category => category.servers);
        const filteredServers = allServers.filter(server =>
            server.server_name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (groupByCategory) {
            return serverCategories.map(category => ({
                category: category.name,
                servers: category.servers.filter(server =>
                    server.server_name.toLowerCase().includes(searchQuery.toLowerCase())
                )
            })).filter(category => category.servers.length > 0);
        } else {
            return [{ category: "All Servers", servers: filteredServers }];
        }
    }, [serverCategories, searchQuery, groupByCategory]);

    const handleSelect = (serverId: string, server?: Server) => {
        setSelectedServer(server || null);
        setOpen(false);
        setSearchQuery("");
        onChange?.(serverId);
    };

    const label = React.useMemo(() => {
        if (allowGlobal && value === "global") return "Global";
        if (allowNone && value === null) return "None Selected";
        if (selectedServer) return selectedServer.server_name;
        if (fallbackLabel && value) return fallbackLabel;
        if (value && serversQuery.isLoading) return "Loading server...";
        return "Select server...";
    }, [value, selectedServer, allowGlobal, allowNone, fallbackLabel, serversQuery.isLoading])

    React.useLayoutEffect(() => {
        if (!sized || fitMinWidth == null || fitMaxWidth == null) return
        const button = triggerRef.current
        if (!button) return
        const style = getComputedStyle(button)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        ctx.font = style.font
        const textWidth = ctx.measureText(label).width
        const iconAndGap = 16 + 8
        const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
        const border = (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0)
        const next = Math.ceil(textWidth + iconAndGap + pad + border)
        setFitWidth(Math.min(fitMaxWidth, Math.max(fitMinWidth, next)))
    }, [label, sized, fitMinWidth, fitMaxWidth])

    const content = (
        <Command className="bg-secondary/15 backdrop-blur border-border/15 text-muted-foreground">
            <CommandInput
                placeholder="Search server..."
                value={searchQuery}
                onValueChange={setSearchQuery}
            />
            <CommandList>
                <CommandEmpty>No servers found.</CommandEmpty>
                {allowGlobal || allowNone ? (
                    <CommandGroup heading="Global">
                        {allowNone ? (
                            <CommandItem
                                key="none"
                                value={"none"}
                                onSelect={() => handleSelect("")}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        !value || value.length === 0 ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                None
                            </CommandItem>
                        ) : null}
                        {allowGlobal ? (
                            <CommandItem
                                key="global"
                                value="global"
                                onSelect={() => handleSelect("global")}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === "global" ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                Global
                            </CommandItem>
                        ) : null}
                    </CommandGroup>
                ) : null}
                {filteredServers.map((category) => (
                    <CommandGroup key={category.category} heading={groupByCategory ? category.category : undefined}>
                        {category.servers.map((server) => (
                            <CommandItem
                                key={server.server_id}
                                value={`${server.server_id}-${server.server_name}`}
                                onSelect={() => handleSelect(server.server_id, server)}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === server.server_id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {server.server_name}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                ))}
            </CommandList>
        </Command>
    )

    const trigger = (
        <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            title={label}
            className={cn(
                "w-full min-w-0 justify-between overflow-hidden bg-background/15 border-border/15 placeholder:text-muted-foreground/60",
                triggerClassName,
            )}
            style={triggerStyle}
        >
            <span className="min-w-0 truncate">{label}</span>
            <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
    )

    if (isDesktop) {
        const popover = (
            <Popover open={open} onOpenChange={setOpen} modal={modal}>
                <PopoverTrigger asChild>
                    {trigger}
                </PopoverTrigger>
                <PopoverContent
                    className={cn("p-0 bg-transparent border-border/15", popoverContentClassName)}
                    style={popoverContentStyle}
                    align={align}
                >
                    {content}
                </PopoverContent>
            </Popover>
        )

        if (!sized || fitWidth == null) return popover

        return (
            <div className="shrink-0" style={{ width: fitWidth }}>
                {popover}
            </div>
        )
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button variant="outline" className="w-[150px] justify-start">
                    {label}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mt-4 border-t">
                    {content}
                </div>
            </DrawerContent>
        </Drawer>
    )
}
