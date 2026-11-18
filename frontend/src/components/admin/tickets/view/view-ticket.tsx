"use client"

import { useCallback, useMemo, useState } from 'react'
import { backendApi } from '@/lib/api'
import { getAuthToken } from '@/lib/laravel-auth'
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Ticket } from '@/types/tickets'
import { TipTapEditor } from '@/components/tickets/tiptap-editor'
import { ChevronLeft, AlertCircle, Clock, Calendar, DoorClosed, Loader2, Check, ExternalLink, CalendarDays, UserCircle, X, FileText, Image as ImageIcon, FileArchive, Film, Music } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from 'next-auth'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Skeleton } from "@/components/ui/skeleton"
import { useRouter } from 'next/navigation'
import { MessageList, MessageListSkeleton } from './message-list'
import { DiscordIcon, SteamIcon } from '@/components/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { GiftPackage } from '../../users/gifting/gift-package'
import useServers from '@/hooks/use-servers'

interface TicketViewProps {
    ticketId: number
    currentUser: User
}

interface SendMessageResponse {
    success: boolean;
    message?: string;
    error?: string;
}

export function TicketView({ ticketId, currentUser }: TicketViewProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const router = useRouter()
    const queryClient = useQueryClient()
    const { data: ticket, isLoading } = useQuery<Ticket | undefined>({
        queryKey: ['admin-ticket', ticketId],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi(`admin/tickets/${ticketId}`), { credentials: 'include', headers });
            return res.json();
        }
    })

    const userSteamId = useMemo(() => {
        return (ticket?.user as any)?.accounts?.find((account: any) => account.provider === 'steam')?.providerAccountId
    }, [ticket])

    const userDiscordId = useMemo(() => {
        return (ticket?.user as any)?.accounts?.find((account: any) => account.provider === 'discord')?.providerAccountId
    }, [ticket])

    const [copiedField, setCopiedField] = useState<string | null>(null);

    const copyToClipboard = useCallback((text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    }, []);

    const { mutate: closeTicket, isPending: isClosingTicket } = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi(`admin/tickets/${ticketId}`), { method: 'DELETE', credentials: 'include', headers });
            return res.json();
        },
        onSuccess: () => {
            toast.success('Ticket closed successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] })
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
            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/tickets/${ticketId}/messages`), {
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
            queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticketId] })
            toast.success('Message sent successfully');
            setSelectedFiles([]);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Error sending message');
        },
    })

    const handleFilesSelected = (files: File[]) => {
        setSelectedFiles(files);
    }

    const handleNewMessage = (content: string) => {
        const formData = new FormData();
        formData.append('message', content);

        selectedFiles.forEach((file) => {
            formData.append('files', file);
        });

        sendMessage(formData);
    }

    if (isLoading) return <TicketSkeleton />
    if (!ticket) return <div>Ticket not found</div>

    return (
        <>
            <div className="w-full flex flex-col gap-4 md:flex-row items-center justify-between">
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <h1 className="flex items-start gap-1.5 text-xl font-bold">
                        <Badge variant="outline" className="text-xs">#{ticket.id}</Badge>
                        {ticket.category?.name}
                    </h1>
                    <Badge variant={ticket.status === 'closed' ? "destructive" : "active"}>
                        {ticket.status === 'closed' ? 'CLOSED' : 'OPEN'}
                    </Badge>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => closeTicket()}
                        disabled={isClosingTicket || ticket.status === 'closed'}
                    >
                        {isClosingTicket ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Closing Ticket
                            </>
                        ) : (
                            <>
                                <DoorClosed className="mr-2 h-4 w-4" />
                                Close Ticket
                            </>
                        )}
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/admin/tickets')}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Tickets
                </Button>
            </div>

            <Card className='flex flex-col md:flex-row'>
                <CardHeader className="flex justify-center items-center">
                    <Link
                        href={`/admin/users/${userSteamId}`}
                    >
                        <Avatar className="h-16 w-16 md:h-32 md:w-32">
                            <AvatarImage src={ticket.user?.image || undefined} />
                            <AvatarFallback>
                                {ticket.user?.name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                </CardHeader>
                <CardContent className="pl-0 flex-grow flex flex-col gap-1 justify-center items-center md:items-start">
                    <CardTitle className="text-xl md:text-3xl flex items-center">
                        {ticket.user?.name}
                    </CardTitle>
                    <div className="mb-6 md:mb-0">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className='flex items-center gap-2 text-xs md:text-base cursor-help'>
                                        <CalendarDays className='h-4 w-4' />
                                        <span className='font-bold'>
                                            {ticket.user?.createdAt ? formatDistanceToNow(new Date(ticket.user.createdAt), { addSuffix: true }) : 'Unknown'}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Joined On: <span className='font-bold'>{ticket.user?.createdAt ? format(new Date(ticket.user.createdAt), "MM/dd/yyyy") : 'Unknown'}</span></p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full">
                        <div className="flex flex-col md:flex-row items-center w-full md:items-start">
                            <CopyableIconButton
                                icon={<SteamIcon className='h-4 w-4' />}
                                value={userSteamId}
                                label="Steam ID"
                                onCopy={copyToClipboard}
                                copiedField={copiedField}
                            />
                            <CopyableIconButton
                                icon={<DiscordIcon className='h-4 w-4' />}
                                value={userDiscordId}
                                label="Discord ID"
                                onCopy={copyToClipboard}
                                copiedField={copiedField}
                            />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" /> Created
                            </span>
                            <span className="text-sm text-muted-foreground">{format(new Date(ticket.createdAt ?? 0), "MMM d, yyyy h:mm a")}</span>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" /> Updated
                            </span>
                            <span className="text-sm text-muted-foreground">{format(new Date(ticket.updatedAt ?? 0), "MMM d, yyyy h:mm a")}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-4 flex flex-col gap-2">
                    <Link
                        href={`/admin/users/${userSteamId}`}
                        className={cn(
                            buttonVariants({
                                variant: 'secondary',
                                size: 'sm'
                            }),
                            "w-fit md:w-full justify-start"
                        )}
                    >
                        <UserCircle className='mr-2' size={18} />
                        Site Profile
                    </Link>
                    <Link
                        href={`https://www.battlemetrics.com/rcon/players?filter[search]=${userSteamId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            buttonVariants({
                                variant: 'secondary',
                                size: 'sm'
                            })
                        )}
                    >
                        <ExternalLink className='mr-2' size={18} />
                        BattleMetrics
                    </Link>
                    <Link
                        href={`https://dashboard.paynow.gg/customers/${ticket.user?.storeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            buttonVariants({
                                variant: 'secondary',
                                size: 'sm'
                            }),
                            "w-fit md:w-full justify-start"
                        )}
                    >
                        <ExternalLink className='mr-2' size={18} />
                        Visit PayNow
                    </Link>
                    <GiftPackage customerId={ticket.user?.storeId || ''} steamId={userSteamId} />
                </CardFooter>
            </Card>

            <Card>
                <CardContent className='p-6 pr-2'>
                    <QuestionsAndAnswers ticket={ticket} />
                    <MessageList ticketId={ticketId} currentUser={currentUser} />
                </CardContent>
                <CardFooter className='flex flex-col gap-4 w-full'>
                    {ticket.status === 'closed' ? (
                        <div className="w-full select-none flex items-center justify-center">
                            <AlertCircle className="mr-2 h-5 w-5 text-destructive" />
                            <span className="text-destructive font-semibold">This ticket has been closed.</span>
                        </div>
                    ) : (
                        <TipTapEditor
                            onSend={handleNewMessage}
                            disabled={isSendingMessage || isClosingTicket}
                            handleFilesSelected={handleFilesSelected}
                        />
                    )}
                    {selectedFiles.length > 0 && (
                        <div className="mt-4 w-full space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Selected Files</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedFiles([])}
                                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                >
                                    Clear all
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedFiles.map((file) => {
                                    const FileIcon = getFileIcon(file.type);
                                    return (
                                        <div
                                            key={file.name}
                                            className="group relative flex items-center gap-2 rounded-md border p-2 pr-8 hover:bg-muted/50"
                                        >
                                            <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm">{file.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                                onClick={() => {
                                                    setSelectedFiles(files => 
                                                        files.filter(f => f.name !== file.name)
                                                    );
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </>
    )
}

function QuestionsAndAnswers({ ticket }: { ticket: Ticket }) {
    const parsedContent = useMemo(() => {
        return Object.entries((ticket.content as Record<string, unknown>) ?? {}).reduce((acc, [key, value]) => {
            const [fieldKey, fieldType] = key.split('--');
            acc[fieldKey] = { value, type: fieldType || 'string' };
            return acc;
        }, {} as Record<string, { value: any, type: string }>);
    }, [ticket.content]);

    const formatKey = (key: string): string => {
        return key
            .split('_')
            .join(' ')
            .replace(/^\w/, c => c.toUpperCase());
    }

    return (
        <div className="space-y-4 bg-muted/25 mb-8 p-4 mr-4 rounded-md">
            {Object.entries(parsedContent).map(([key, { value, type }]: [string, { value: any, type: string }]) => (
                <div key={key} className="space-y-2 normal-case">
                    <h3 className="font-medium ">{formatKey(key)}</h3>
                    <div className="text-sm text-muted-foreground">
                        <DisplayValue value={value} type={type} />
                    </div>
                </div>
            ))}
        </div>
    )
}

const DisplayValue = ({ value, type }: { value: any, type: string }) => {
    const formatValue = (value: any): string => {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        return value.toString();
    }
    if (type === 'server' || type === 'server-grid') {
        return <DisplayServer serverId={value} />
    }
    if (type === 'players-grid') {
        return <DisplayPlayer playerIds={value} />
    }
    return <div>{formatValue(value)}</div>
}

const DisplayServer = ({ serverId }: { serverId: string }) => {
    const { data: categories } = useServers();
    const serverName = useMemo(() => {
        let server = undefined;
        const category = categories?.find(c => c.servers.find(s => s.server_id === serverId));
        if (category) {
            server = category.servers.find(s => s.server_id === serverId);
        }
        return server?.server_name || serverId;
    }, [categories, serverId]);
    return <div>{serverName}</div>
}

const DisplayPlayer = ({ playerIds }: { playerIds: string[] }) => {
    const { data: players } = useQuery({
        queryKey: ['admin-player-search', playerIds.join(',')],
        queryFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(backendApi(`players?ids=${playerIds.join(',')}`), { credentials: 'include', headers });
            return res.json();
        }
    })
    if (players) {
        return (
            <div className="w-full grid grid-cols-1 md:flex md:flex-wrap gap-2">
                {players.map((p: any) => !p.user ? (
                    <div key={p.steam_id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
                        <Avatar>
                            <AvatarImage src={p.avatar} />
                            <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{p.username}</span>
                            <span className="text-xs text-muted-foreground">{p.steam_id}</span>
                        </div>
                    </div>
                ) : (
                    <Link
                        key={p.steam_id}
                        href={`/admin/users/${p.steam_id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50"
                    >
                        <Avatar>
                            <AvatarImage src={p.user.image} />
                            <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{p.username}</span>
                            <span className="text-xs text-muted-foreground">{p.steam_id}</span>
                        </div>
                    </Link>
                ))}
            </div >
        )
    }
    return <div>{playerIds.join(', ')}</div>
}

function TicketSkeleton() {
    return (
        <div className="container mx-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Tickets
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <div className="flex gap-10">
                        <div className="flex flex-col items-start">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex flex-col items-start">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-28" />
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6 pr-2">
                    <MessageListSkeleton />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-24 w-full" />
                </CardFooter>
            </Card>
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

function CopyableIconButton({ icon, value, label, onCopy, copiedField }: any) {
    return (
        <Button
            variant="ghost"
            className="h-full flex-col items-start cursor-help"
            onClick={() => onCopy(value, label)}
            disabled={!value}
        >
            <div className="flex gap-2 items-start">
                {copiedField === label ? (
                    <Check className="h-4 w-4 text-green-500" />
                ) : (
                    icon
                )}
                {label}
            </div>
            <span className="text-sm text-muted-foreground">{value ? value : 'Not Linked'}</span>
        </Button>
    );
}