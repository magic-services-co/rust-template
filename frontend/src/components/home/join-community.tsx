"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { UserIcon } from "lucide-react";
import { backendApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { signIn, useSession } from "@/lib/laravel-auth-react";

type LinkedUser = { id: string; name?: string; image?: string };

export function JoinCommunity({
    slots = 24,
    emptyLabel = "Link Your Account",
}: {
    slots?: number;
    emptyLabel?: string;
}) {
    const { data: session } = useSession();
    const [users, setUsers] = useState<LinkedUser[]>([]);
    const slotCount = Math.min(48, Math.max(6, slots));

    useEffect(() => {
        fetch(backendApi("discord-members"), { credentials: "omit" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const members = Array.isArray(data?.members) ? data.members : [];
                if (members.length > 0) {
                    setUsers(members.map((member: { id?: string; name?: string; image?: string | null }) => ({
                        id: String(member.id ?? member.name ?? "member"),
                        name: member.name,
                        image: typeof member.image === "string" ? member.image : undefined,
                    })));
                    return;
                }
                return fetch(backendApi("linked-users"), { credentials: "include" })
                    .then((res) => (res.ok ? res.json() : []))
                    .then((linked) => setUsers(Array.isArray(linked) ? linked : []));
            })
            .catch(() => setUsers([]));
    }, []);

    return (
        <div
            className="home-community grid w-full max-w-[520px] grid-cols-6 gap-2 sm:grid-cols-8"
            data-theme-field="communitySlots"
            data-theme-label="Avatar slots"
        >
            {Array.from({ length: slotCount }, (_, index) => {
                const user = users[index];
                return (
                    <TooltipProvider key={index}>
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "ghost relative size-12 overflow-hidden border sm:size-14",
                                        !session?.user && "cursor-pointer",
                                    )}
                                    style={{
                                        borderColor: "var(--home-avatar-border, rgba(161, 191, 218, 0.28))",
                                        backgroundImage:
                                            "linear-gradient(135deg, var(--home-avatar-from, rgb(48, 65, 80)) 0%, var(--home-avatar-to, rgb(17, 25, 33)) 100%)",
                                    }}
                                    onClick={() => {
                                        if (!session?.user) signIn("steam");
                                    }}
                                >
                                    <Avatar className="size-full rounded-none">
                                        {user?.image ? (
                                            <AvatarImage src={user.image} alt={user.name || "Community member"} />
                                        ) : (
                                            <AvatarFallback className="rounded-none bg-transparent text-[#c5d0de]">
                                                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="h-5 w-5 text-[#c5d0de]" aria-hidden />}
                                            </AvatarFallback>
                                        )}
                                    </Avatar>
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="center" sideOffset={8}>
                                {user ? user.name : emptyLabel}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                );
            })}
        </div>
    );
}
