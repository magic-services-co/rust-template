"use client"

import { useMemo, useState } from 'react'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { Ticket } from '@/types/tickets'
import { MessageList } from './message-list'
import { TipTapEditor } from './tiptap-editor'
import { ChevronLeft, ChevronDown, AlertCircle, Loader2, X, FileText, Image as ImageIcon, FileArchive, Film, Music, Shield } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from 'next-auth'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { cn } from '@/lib/utils'
import useServers from '@/hooks/use-servers'
import useServerData from '@/hooks/use-server-data'
import Link from 'next/link'
import { SupportTitles } from '@/components/support-titles'
import { ErrorCta, ErrorPageContent } from '@/components/error-page'
import { useSupportTheme } from '@/hooks/use-support-theme'
import {
    SUPPORT_CARD_PALETTES,
    withSupportDefaults,
} from '@/lib/layout-theme-defaults'
import { HomeCardCorners } from '@/components/home/home-card-corners'

interface TicketViewProps {
    ticketId: number
    currentUser: User
    serverTheme?: Record<string, unknown>
}

interface SendMessageResponse {
    success: boolean;
    message?: string;
    error?: string;
}

type FieldMeta = { label?: string; type?: string }

function paletteForTicket(slug?: string, icon?: string) {
    const key = typeof icon === "string" ? icon : "";
    const byKey = SUPPORT_CARD_PALETTES.find((palette) => palette.key === key);
    if (byKey) return byKey;
    const value = (slug || "").toLowerCase();
    if (value.includes("general")) return SUPPORT_CARD_PALETTES[0];
    if (value.includes("player") || value.includes("report")) return SUPPORT_CARD_PALETTES[1];
    if (value.includes("bug")) return SUPPORT_CARD_PALETTES[2];
    if (value.includes("payment") || value.includes("billing")) return SUPPORT_CARD_PALETTES[3];
    if (value.includes("staff") || value.includes("apply")) return SUPPORT_CARD_PALETTES[4];
    return SUPPORT_CARD_PALETTES[0];
}

function isWideField(type: string) {
    return ["textarea", "players-grid", "players", "server-grid", "server"].includes(type)
}

function ticketNumber(id: string | number) {
    return `#${String(id).padStart(4, "0")}`
}

export function TicketView({ ticketId, currentUser, serverTheme }: TicketViewProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: clientTheme } = useSupportTheme()
    const theme = withSupportDefaults(clientTheme || serverTheme)
    const { data: ticket, isLoading } = useQuery<Ticket | undefined>({
        queryKey: ['ticket', ticketId],
        queryFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const res = await fetch(backendApi(`tickets/${ticketId}`), { credentials: 'include', headers })
            if (!res.ok) return undefined
            return res.json()
        }
    })

    const { mutate: closeTicket, isPending: isClosingTicket } = useMutation({
        mutationFn: async () => {
            const token = getAuthToken()
            const headers: Record<string, string> = { Accept: 'application/json' }
            if (token) headers['Authorization'] = `Bearer ${token}`
            const res = await fetch(backendApi(`tickets/${ticketId}`), { method: 'DELETE', credentials: 'include', headers })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Failed to close ticket')
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success('Ticket closed successfully');
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
        },
        onError: (error) => {
            toast.error(error?.message || 'Error closing ticket');
        },
    })

    const { mutate: sendMessage, isPending: isSendingMessage } = useMutation<
        SendMessageResponse,
        Error,
        FormData
    >({
        mutationFn: async (formData: FormData) => {
            const token = getAuthToken()
            const headers: Record<string, string> = {}
            if (token) headers['Authorization'] = `Bearer ${token}`
            const response = await fetch(backendApi(`tickets/${ticketId}/messages`), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', ticketId] })
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
            toast.success('Message sent successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Error sending message');
        },
    })

    const categoryName = ticket?.category?.name || "Support ticket"
    const categorySlug = typeof ticket?.categoryId === "string" ? ticket.categoryId : ticket?.category?.slug
    const categoryIcon = typeof ticket?.category?.icon === "string" ? ticket.category.icon : undefined
    const palette = paletteForTicket(typeof categorySlug === "string" ? categorySlug : undefined, categoryIcon)
    const subtitle = typeof ticket?.category?.description === "string"
        ? ticket.category.description.split(/\n+/)[0]?.trim()
        : "Follow the conversation and add any extra details for staff."
    const closed = ticket?.status === "closed"
    const replyCount = typeof ticket?.messageCount === "number" ? ticket.messageCount : 0
    const issuedName = ticket?.user?.name || currentUser.name || "You"
    const issuedImage = ticket?.user?.image || currentUser.image || ""

    if (isLoading) return <TicketSkeleton />
    if (!ticket) {
        return (
            <ErrorPageContent
                kicker="SUPPORT"
                title="TICKET"
                titleAccent="NOT FOUND"
                subtitle="This ticket doesn't exist, or you don't have permission to view it."
                actions={
                    <>
                        <ErrorCta href="/profile">MY TICKETS</ErrorCta>
                        <ErrorCta href="/support" variant="secondary">
                            CONTACT SUPPORT
                        </ErrorCta>
                    </>
                }
            />
        )
    }

    const handleFilesSelected = async (files: File[]) => {
        setSelectedFiles(files);
        setIsScanning(true);
        try {
            for (let i = 0; i < files.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } finally {
            setIsScanning(false);
        }
    };

    const handleNewMessage = (content: string) => {
        const formData = new FormData();
        formData.append('message', content);

        selectedFiles.forEach((file) => {
            formData.append('files[]', file);
        });

        sendMessage(formData);
        setSelectedFiles([]);
    }

    return (
        <div
            className="support-ticket-form"
            style={{
                ["--support-kicker" as string]: theme.kickerColor,
                ["--support-title" as string]: theme.titleColor,
                ["--support-subtitle" as string]: theme.subtitleColor,
                ["--support-label" as string]: theme.labelColor,
                ["--support-help" as string]: theme.helpTextColor,
                ["--support-input-bg" as string]: theme.inputBackground,
                ["--support-input-border" as string]: theme.inputBorder,
                ["--support-input-text" as string]: theme.inputText,
                ["--support-input-placeholder" as string]: theme.inputPlaceholder,
                ["--support-input-focus" as string]: theme.inputFocusBorder,
                ["--support-accent" as string]: palette.accent,
            }}
        >
            <SupportTitles
                serverTheme={theme}
                isSignedIn
                kicker="SUPPORT / TICKET"
                title={ticketNumber(ticket.id)}
                subtitle={`${categoryName}${closed ? " · Closed" : " · Open"}`}
            />

            <nav className="flex flex-wrap items-center justify-center gap-2 pb-2 pt-8 text-[11px] font-medium tracking-[1.4px]">
                <Link href="/support" className="support-form-meta">SUPPORT</Link>
                <span style={{ color: "rgba(186,145,66,0.45)" }}>/</span>
                <Link
                    href={typeof categorySlug === "string" ? `/support/${categorySlug}` : "/support"}
                    className="support-form-meta"
                >
                    {categoryName.toUpperCase()}
                </Link>
                <span style={{ color: "rgba(186,145,66,0.45)" }}>/</span>
                <span style={{ color: theme.breadcrumbActiveColor }}>{ticketNumber(ticket.id)}</span>
            </nav>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    className="ghost support-form-btn-secondary flex h-[41px] items-center px-4 text-[10px] font-bold tracking-[1.4px]"
                    onClick={() => router.push('/profile?tab=tickets')}
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    MY TICKETS
                </button>
                <button
                    type="button"
                    className="ghost ticket-close-btn flex h-[41px] items-center px-4 text-[10px] font-bold tracking-[1.4px] disabled:opacity-45"
                    style={{
                        border: `1px solid ${theme.banMessageBorder}`,
                        backgroundColor: theme.banMessageBackground,
                        color: theme.banMessageTextColor,
                    }}
                    onClick={() => closeTicket()}
                    disabled={isClosingTicket || closed}
                >
                    {isClosingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {closed ? "TICKET CLOSED" : "CLOSE TICKET"}
                </button>
            </div>

            <article
                className="ticket-stub relative mt-6 flex flex-col overflow-visible border md:flex-row"
                style={{
                    borderColor: theme.formBorder,
                }}
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage: `linear-gradient(127.57deg, ${palette.wash} 8.5%, rgba(8, 12, 17, 0.94) 91.5%)`,
                    }}
                />
                <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backgroundImage:
                            "linear-gradient(90deg, rgba(186, 145, 66, 0.06) 0%, rgba(186, 145, 66, 0) 25%), linear-gradient(180deg, rgba(255, 255, 255, 0.043) 0%, rgba(255, 255, 255, 0) 20%)",
                    }}
                />
                <div className="relative min-w-0 flex-1 p-5 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <img src={palette.icon} alt="" width={32} height={32} className="mt-1 shrink-0" />
                            <div>
                                <p className="support-form-kicker text-[9px] font-bold tracking-[1.62px]">TICKET</p>
                                <h2 className="support-form-title pt-1 text-[22px] font-extrabold leading-7">
                                    {categoryName.toUpperCase()}
                                </h2>
                                {subtitle ? (
                                    <p className="support-form-meta max-w-[520px] pt-1 text-[12px] tracking-normal">
                                        {subtitle}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={closed ? "ticket-status-closed text-[10px] font-bold tracking-[1.4px] md:hidden" : "ticket-status-open text-[10px] font-bold tracking-[1.4px] md:hidden"}>
                                {closed ? "CLOSED" : "OPEN"}
                            </span>
                            <button
                                type="button"
                                className="ghost support-form-btn-secondary flex h-[41px] items-center px-3 text-[10px] font-bold tracking-[1.4px]"
                                onClick={() => setDetailsOpen((open) => !open)}
                                aria-expanded={detailsOpen}
                            >
                                {detailsOpen ? "HIDE DETAILS" : "SHOW DETAILS"}
                                <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", detailsOpen && "rotate-180")} />
                            </button>
                        </div>
                    </div>

                    <div className="relative mt-6 grid gap-5 border-y py-5 sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                        <div>
                            <p className="support-form-label">Issued to</p>
                            <div className="mt-2 flex items-center gap-2">
                                <Avatar className="h-8 w-8 rounded-none">
                                    <AvatarImage src={issuedImage} alt={issuedName} />
                                    <AvatarFallback>{issuedName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className="truncate text-[13px] font-medium" style={{ color: theme.labelColor }}>
                                    {issuedName}
                                </p>
                            </div>
                        </div>
                        <div>
                            <p className="support-form-label">Category</p>
                            <p className="pt-2 text-[13px]" style={{ color: theme.labelColor }}>{categoryName}</p>
                            <p className="support-form-meta pt-0.5 text-[11px] tracking-normal">
                                {typeof categorySlug === "string" ? categorySlug.replace(/-/g, " ") : "support"}
                            </p>
                        </div>
                        <div>
                            <p className="support-form-label">Submitted</p>
                            <p className="pt-2 text-[13px]" style={{ color: theme.labelColor }}>
                                {format(new Date(ticket.createdAt ?? 0), "MMM d, yyyy h:mm a")}
                            </p>
                            <p className="support-form-meta pt-0.5 text-[11px] tracking-normal">
                                {formatDistanceToNow(new Date(ticket.createdAt ?? 0), { addSuffix: true })}
                            </p>
                        </div>
                        <div>
                            <p className="support-form-label">Last update</p>
                            <p className="pt-2 text-[13px]" style={{ color: theme.labelColor }}>
                                {format(new Date(ticket.updatedAt ?? 0), "MMM d, yyyy h:mm a")}
                            </p>
                            <p className="support-form-meta pt-0.5 text-[11px] tracking-normal">
                                {formatDistanceToNow(new Date(ticket.updatedAt ?? 0), { addSuffix: true })}
                                {replyCount === 0 ? " · Waiting on staff" : ` · ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
                            </p>
                        </div>
                    </div>

                    <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", detailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                        <div className="overflow-hidden">
                            <div className="relative pt-6">
                                <p className="support-form-kicker pb-4 text-[9px] font-bold tracking-[1.62px]">ORIGINAL REQUEST</p>
                                <QuestionsAndAnswers ticket={ticket} />
                            </div>
                        </div>
                    </div>
                </div>

                <aside
                    className="relative flex shrink-0 items-center justify-between gap-4 border-t px-5 py-4 md:w-[138px] md:flex-col md:border-l md:border-t-0 md:px-4 md:py-7"
                    style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(5,7,10,0.28)" }}
                >
                    <span aria-hidden className="ticket-stub-dash-x pointer-events-none absolute inset-x-6 top-0 h-px md:hidden" />
                    <span aria-hidden className="ticket-stub-dash pointer-events-none absolute bottom-6 left-0 top-6 hidden w-px md:block" />

                    <span className={closed ? "ticket-status-closed hidden text-[10px] font-bold tracking-[1.4px] md:inline" : "ticket-status-open hidden text-[10px] font-bold tracking-[1.4px] md:inline"}>
                        {closed ? "CLOSED" : "OPEN"}
                    </span>
                    <div className="flex items-center gap-3 md:flex-col md:gap-4">
                        <p
                            className="support-ticket-number text-[18px] font-medium tracking-[1.6px] md:hidden"
                            style={{ color: palette.accent }}
                        >
                            {ticketNumber(ticket.id)}
                        </p>
                        <p
                            className="ticket-stub-id support-ticket-number hidden text-[22px] font-medium tracking-[1.6px] md:block"
                            style={{ color: palette.accent }}
                        >
                            {ticketNumber(ticket.id)}
                        </p>
                        <span aria-hidden className="ticket-stub-barcode hidden md:block" style={{ color: palette.accent }} />
                    </div>
                    <div className="text-right md:text-center">
                        <p className="support-form-label">Issued</p>
                        <p className="pt-1 text-[12px] font-medium" style={{ color: theme.labelColor }}>
                            {format(new Date(ticket.createdAt ?? 0), "MMM d")}
                        </p>
                    </div>
                </aside>
                <HomeCardCorners color={palette.accent} show />
            </article>

            <section className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                        <p className="support-form-kicker text-[9px] font-bold tracking-[1.62px]">CONVERSATION</p>
                        <p className="support-form-title pt-1 text-[16px] font-extrabold">REPLIES</p>
                    </div>
                    <p className="support-form-meta text-[11px] tracking-[1.2px]">
                        {replyCount === 0 ? "NO REPLIES YET" : `${replyCount} ${replyCount === 1 ? "REPLY" : "REPLIES"}`}
                    </p>
                </div>
                <MessageList ticketId={ticketId} currentUser={currentUser} themed />
            </section>

            <section className="relative mt-8 overflow-visible border p-5" style={{ backgroundColor: theme.formBackground, borderColor: theme.formBorder }}>
                {closed ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <AlertCircle className="h-5 w-5" style={{ color: theme.banMessageBorder }} />
                        <span className="text-[13px] font-medium" style={{ color: theme.banMessageTextColor }}>
                            This ticket is closed. Open a new one if you still need help.
                        </span>
                    </div>
                ) : (
                    <>
                        <p className="support-form-kicker pb-4 text-[9px] font-bold tracking-[1.62px]">ADD A REPLY</p>
                        <TipTapEditor
                            tone="support"
                            onSend={handleNewMessage}
                            disabled={isSendingMessage || isClosingTicket}
                            handleFilesSelected={handleFilesSelected}
                            isScanning={isScanning}
                        />
                    </>
                )}
                {selectedFiles.length > 0 && (
                    <div className="mt-4 w-full space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="support-form-label">Selected files</span>
                            <button
                                type="button"
                                className="ghost support-form-meta text-[10px] font-bold tracking-[1.2px]"
                                onClick={() => setSelectedFiles([])}
                            >
                                CLEAR ALL
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {selectedFiles.map((file) => {
                                const FileIcon = getFileIcon(file.type);
                                return (
                                    <div
                                        key={file.name}
                                        className="group relative flex items-center gap-2 border p-2 pr-8"
                                        style={{ borderColor: theme.inputBorder, backgroundColor: theme.inputBackground }}
                                    >
                                        {isScanning ? (
                                            <Shield className="h-4 w-4 animate-pulse" style={{ color: theme.helpTextColor }} />
                                        ) : (
                                            <FileIcon className="h-4 w-4 flex-shrink-0" style={{ color: theme.helpTextColor }} />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm" style={{ color: theme.labelColor }}>{file.name}</p>
                                            <p className="support-form-meta text-[11px] tracking-normal">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="ghost absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                            onClick={() => {
                                                setSelectedFiles(files =>
                                                    files.filter(f => f.name !== file.name)
                                                );
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <HomeCardCorners color={palette.accent} show />
            </section>
        </div>
    )
}

function QuestionsAndAnswers({ ticket }: { ticket: Ticket }) {
    const fieldMeta = (ticket.fields || {}) as Record<string, FieldMeta>
    const entries = useMemo(() => {
        const content = (ticket.content as Record<string, unknown>) ?? {}
        return Object.entries(content)
            .map(([rawKey, value]) => {
                const [fieldKey, embeddedType] = rawKey.split("--")
                const meta = fieldMeta[fieldKey] || fieldMeta[rawKey]
                return {
                    key: fieldKey,
                    label: meta?.label || formatKey(fieldKey),
                    type: meta?.type || embeddedType || "string",
                    value,
                }
            })
            .filter((entry) => !isEmptyValue(entry.value))
    }, [ticket.content, fieldMeta])

    if (entries.length === 0) {
        return <p className="support-form-meta text-[13px] tracking-normal">No extra details were included with this ticket.</p>
    }

    return (
        <div className="grid gap-5 sm:grid-cols-2">
            {entries.map((entry) => (
                <div key={entry.key} className={isWideField(entry.type) ? "sm:col-span-2" : undefined}>
                    <p className="support-form-label">{entry.label}</p>
                    <div className="pt-2 text-[13px]" style={{ color: "#eef4fb" }}>
                        <DisplayValue value={entry.value} type={entry.type} />
                    </div>
                </div>
            ))}
        </div>
    )
}

function isEmptyValue(value: unknown) {
    if (value === null || value === undefined || value === "") return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
}

function formatKey(key: string): string {
    return key
        .split(/[-_]/g)
        .join(" ")
        .replace(/^\w/, (c) => c.toUpperCase())
}

const DisplayValue = ({ value, type }: { value: any, type: string }) => {
    if (type === "boolean") {
        const on = value === true || value === "true"
        return <span className={on ? "ticket-chip ticket-chip-yes" : "ticket-chip ticket-chip-no"}>{on ? "Yes" : "No"}</span>
    }
    if (type === "date") {
        const date = value instanceof Date ? value : new Date(value)
        if (!Number.isNaN(date.getTime())) {
            return <div>{format(date, "PPP")}</div>
        }
    }
    if (type === "enum" || type === "select") {
        return <span className="ticket-chip">{String(value)}</span>
    }
    if (type === "textarea" || type === "string") {
        if (typeof value === "string" && (value.includes("\n") || type === "textarea")) {
            return (
                <p className="whitespace-pre-wrap border px-3 py-3 leading-6" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(5,7,10,0.35)" }}>
                    {value}
                </p>
            )
        }
    }
    if (type === 'server' || type === 'server-grid') {
        return <DisplayServer serverId={String(value)} />
    }
    if (type === 'players-grid' || type === 'players') {
        const ids = Array.isArray(value) ? value : [value]
        return <DisplayPlayer playerIds={ids.filter(Boolean).map(String)} />
    }
    if (Array.isArray(value)) {
        return (
            <div className="flex flex-wrap gap-2">
                {value.map((item) => (
                    <span key={String(item)} className="ticket-chip">{String(item)}</span>
                ))}
            </div>
        )
    }
    if (typeof value === "number") {
        return <div className="text-[18px] font-semibold tracking-[-0.3px]">{value.toLocaleString()}</div>
    }
    return <div>{String(value)}</div>
}

const DisplayServer = ({ serverId }: { serverId: string }) => {
    const { data: categories } = useServers();
    const { serverList } = useServerData();
    const server = useMemo(() => {
        for (const category of categories ?? []) {
            const match = category.servers.find((item) => item.server_id === serverId);
            if (match) {
                return {
                    name: match.server_name,
                    image: match.image_path,
                    address: match.server_address,
                };
            }
        }
        for (const item of serverList) {
            const data = item.data;
            if (!data) continue;
            if (data.id === serverId || data.server_id === serverId) {
                return {
                    name: data.name || data.attributes?.name || serverId,
                    image: data.image_path,
                    address: data.server_address || data.attributes?.address,
                    players: data.attributes?.players,
                    maxPlayers: data.attributes?.maxPlayers,
                    status: data.attributes?.status,
                };
            }
        }
        return null;
    }, [categories, serverList, serverId]);

    if (!server) {
        return <span className="ticket-chip">{serverId}</span>
    }

    return (
        <div className="support-grid-card inline-flex max-w-full items-center gap-3 px-3 py-2">
            {server.image ? (
                <img src={server.image} alt="" className="h-10 w-10 object-cover" />
            ) : null}
            <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">{server.name}</p>
                <p className="support-form-meta truncate text-[11px] tracking-normal">
                    {server.address || serverId}
                    {typeof server.players === "number" && typeof server.maxPlayers === "number"
                        ? ` · ${server.players}/${server.maxPlayers}`
                        : ""}
                </p>
            </div>
        </div>
    )
}

const DisplayPlayer = ({ playerIds }: { playerIds: string[] }) => {
    const { data: players } = useQuery({
        queryKey: ['ticket-player-search', playerIds.join(',')],
        queryFn: async () => {
            const res = await fetch(backendApi(`tickets/reportable?ids=${encodeURIComponent(playerIds.join(','))}`), {
                credentials: 'include',
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) return []
            return res.json();
        },
        enabled: playerIds.length > 0,
    })
    if (Array.isArray(players) && players.length > 0) {
        return (
            <div className="flex flex-wrap gap-2">
                {players.map((p: { steam_id: string; username: string; avatar?: string | null; user?: { image?: string | null } }) => (
                    <a
                        key={p.steam_id}
                        href={`https://steamcommunity.com/profiles/${p.steam_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="support-grid-card ghost flex items-center gap-2 px-2 py-2 no-underline"
                    >
                        <Avatar className="h-9 w-9 rounded-none">
                            <AvatarImage src={p.user?.image || p.avatar || ""} />
                            <AvatarFallback>{p.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{p.username}</span>
                            <span className="support-form-meta text-[11px] tracking-normal">{p.steam_id}</span>
                        </div>
                    </a>
                ))}
            </div>
        )
    }
    return <div>{playerIds.join(', ')}</div>
}

function TicketSkeleton() {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin" style={{ color: "#ba9142" }} />
            <p className="support-form-meta pt-4 text-sm">Loading ticket</p>
        </div>
    )
}

function getFileIcon(fileType: string) {
    if (fileType.startsWith('image/')) return ImageIcon;
    if (fileType.startsWith('video/')) return Film;
    if (fileType.startsWith('audio/')) return Music;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return FileArchive;
    return FileText;
}
