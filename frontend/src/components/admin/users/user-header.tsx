"use client";

import { useState, useCallback, useMemo, useEffect } from 'react';
import { backendApi } from '@/lib/api';
import { getAuthToken } from '@/lib/laravel-auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarDays, ExternalLink, Plus, X, XIcon, Trash2, RefreshCw, Clock, ChevronDown } from 'lucide-react';
import { User, UserRole } from '@/types/user';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { DiscordIcon, SteamIcon } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { GiftPackage } from './gifting/gift-package';
import GrantRole, { AssignRole } from './grant-role';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { removeUserFromRole } from "@/app/actions/roles";
import { toast } from 'sonner';
import { refreshSteamGroupForUser } from '@/app/actions/steam';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CopyableIconButtonProps {
    icon: React.ReactNode;
    value: string;
    label: string;
    onCopy: (value: string, field: string) => void;
    copiedField: string | null;
}

export default function UserHeader({ user }: { user: User }) {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [banReason, setBanReason] = useState('');
    const router = useRouter();
    const queryClient = useQueryClient();

    const refreshBoostMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/discord/refresh?userId=${user.discordId}`), {
                method: 'POST',
                credentials: 'include',
                headers,
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('Failed to fetch Discord member', user.discordId + ':', response.status, data);
                throw new Error(data.error || 'Failed to refresh boost status');
            }
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['user', user.id] });
            const status = data?.isBoosting ? 'boost status is active' : 'boost status is inactive';
            toast.success(`Boost status refreshed - ${status}`);
        },
        onError: (error) => {
            console.error('Boost refresh error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to refresh boost status');
        }
    });

    const refreshSteamGroupMutation = useMutation({
        mutationFn: async () => {
            const result = await refreshSteamGroupForUser(user.id);
            if (result?.error) {
                throw new Error(result.error);
            }
            return result.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', user.id] });
            toast.success('Steam group status refreshed');
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to refresh Steam group status');
        }
    });

    const syncDiscordMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/users/${user.id}/sync-discord-roles`), {
                method: 'POST',
                credentials: 'include',
                headers,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error((data.error || data.message || 'Failed to sync Discord roles') as string);
            }
            return data as { added?: number; already?: number; absent?: number };
        },
        onSuccess: (data) => {
            toast.success(`Discord roles synced — added ${data?.added ?? 0}, already had ${data?.already ?? 0}${data?.absent ? ', not in the server' : ''}`);
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to sync Discord roles');
        }
    });

    const recheckPaynowMutation = useMutation({
        mutationFn: async () => {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/users/${user.id}/recheck-paynow-roles`), {
                method: 'POST',
                credentials: 'include',
                headers,
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error((data.error || data.message || 'Failed to recheck roles') as string);
            }
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['user', user.id] });
            toast.success(`Roles rechecked — granted ${data?.granted ?? 0}, revoked ${data?.revoked ?? 0}`);
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Failed to recheck PayNow roles');
        }
    });

    const banUserMutation = useMutation({
        mutationFn: async (reason: string) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/users/${user.id}/ban`), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ reason }),
            });
            if (!response.ok) {
                throw new Error('Failed to ban user');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', user.id] });
            toast.success('User banned successfully');
            router.refresh();
        },
        onError: () => {
            toast.error('Failed to ban user');
        },
    });

    const unbanUserMutation = useMutation({
        mutationFn: async (reason: string) => {
            const token = getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/users/${user.id}/unban`), {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ reason }),
            });
            if (!response.ok) {
                throw new Error('Failed to unban user');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user', user.id] });
            toast.success('User unbanned successfully');
            router.refresh();
        },
        onError: () => {
            toast.error('Failed to unban user');
        },
    });

    useEffect(() => {
        if (!user?.discordId || refreshBoostMutation.isError) return;

        let retryCount = 0;
        const maxRetries = 3;
        const baseInterval = 60000;

        const interval = setInterval(() => {
            if (refreshBoostMutation.isPending) return;

            refreshBoostMutation.mutate(undefined, {
                onError: (error: any) => {
                    if (error?.status === 429 && retryCount < maxRetries) {
                        retryCount++;
                        clearInterval(interval);
                        const backoffDelay = baseInterval * Math.pow(2, retryCount);
                        setTimeout(() => {
                            retryCount = 0;
                        }, backoffDelay);
                    }
                },
                onSuccess: () => {
                    retryCount = 0;
                }
            });
        }, baseInterval);

        return () => clearInterval(interval);
    }, [user?.discordId, refreshBoostMutation]);

    const [timeMounted, setTimeMounted] = useState(false);
    useEffect(() => setTimeMounted(true), []);

    const safeDate = (dateStr: string | null | undefined, kind: 'date' | 'datetime') => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (!timeMounted) {
            const iso = d.toISOString();
            return kind === 'date' ? iso.slice(0, 10) : iso.slice(0, 16).replace('T', ' ');
        }
        return kind === 'date' ? format(d, 'MM/dd/yyyy') : format(d, 'MM/dd/yyyy HH:mm');
    };

    const copyToClipboard = useCallback((text: string, field: string) => {
        if (!text) return;

        const onSuccess = () => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
            toast.success(`${field} copied to clipboard`);
        };

        const onFailure = () => {
            toast.error('Copy failed. Try selecting the text manually.');
        };

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(() => onFailure());
            return;
        }

        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) onSuccess();
            else onFailure();
        } catch {
            onFailure();
        }
    }, []);

    const handleDelete = async () => {
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = { Accept: 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const response = await fetch(backendApi(`admin/users?id=${user.id}`), {
                method: 'DELETE',
                credentials: 'include',
                headers,
            });
            if (!response.ok) {
                throw new Error('Failed to delete user');
            }
            toast.success('User deleted successfully');
            router.push('/admin/users');
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    return (
        <Card className="flex justify-between flex-row overflow-hidden">
            <CardHeader className='p-4'>
                <div className="flex h-full items-center space-x-4">
                    <Link
                        href={`https://steamcommunity.com/profiles/${user.steamId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className='group'
                    >
                        <Avatar className="h-28 w-28 border-4 border-primary/10 duration-300 group-hover:border-primary/30">
                            <AvatarImage className="group-hover:scale-110 duration-300" src={user.image || ''} alt={user.name || ''} />
                            <AvatarFallback className="group-hover:scale-110 duration-300">{user.name?.slice(0, 2).toUpperCase() || ''}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="space-y-1.5">
                        <div className="space-x-2 text-3xl font-bold flex items-center flex-wrap gap-2">
                            <span>{user.name || ''}</span>
                            {(() => {
                                type RoleItem = UserRole | { id: string; name: string; color?: string | null };
                                const normalize = (r: RoleItem): UserRole =>
                                    'roleId' in r ? r as UserRole : { roleId: r.id, role: { id: r.id, name: r.name, color: r.color } };
                                const rawRoles = (user.roles ?? []) as RoleItem[];
                                const sortedRoles = [...rawRoles].sort((a, b) => {
                                    const orderA = (a as UserRole).role?.order ?? Infinity;
                                    const orderB = (b as UserRole).role?.order ?? Infinity;
                                    return orderA - orderB;
                                });
                                const visibleRoles = sortedRoles.slice(0, 4);
                                const remainingRoles = sortedRoles.slice(4);
                                
                                return (
                                    <>
                                        {visibleRoles.map((role) => (
                                            <BuildBadge
                                                key={normalize(role).roleId}
                                                role={normalize(role)}
                                                user={user}
                                            />
                                        ))}
                                        {remainingRoles.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                                        +{remainingRoles.length} more
                                                        <ChevronDown className="ml-1 h-3 w-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start" className="max-h-96 overflow-y-auto w-56">
                                                    {remainingRoles.map((role) => (
                                                        <DropdownMenuItem 
                                                            key={normalize(role).roleId} 
                                                            className="p-2 cursor-default" 
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <BuildBadge
                                                                    role={normalize(role)}
                                                                    user={user}
                                                                />
                                                            </div>
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </>
                                );
                            })()}
                            <AssignRole
                                user={user}
                                trigger={
                                    <Button type="button" variant="ghost" size="icon" className='p-2 rounded-full'>
                                        <Plus className="" size={16} />
                                    </Button>
                                }
                            />
                        </div>
                        <div className="flex flex-row gap-4 text-sm">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className='flex items-center gap-2 cursor-help'>
                                            <CalendarDays className='h-4 w-4' />
                                            <span className='font-bold'>
                                                {timeMounted
                                                    ? formatDistanceToNow(new Date(user.createdAt as string | number | Date), { addSuffix: true })
                                                    : safeDate(user.createdAt as string | undefined, 'date')}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Joined On: <span className='font-bold'>{safeDate(user.createdAt as string | undefined, 'date')}</span></p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {typeof user.lastSeenAt === 'string' && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className='flex items-center gap-2 cursor-help'>
                                                <Clock className='h-4 w-4' />
                                                <span className='font-bold'>
                                                    Last Seen: {timeMounted
                                                        ? formatDistanceToNow(new Date(user.lastSeenAt), { addSuffix: true })
                                                        : safeDate(user.lastSeenAt as string | undefined, 'datetime')}
                                                </span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Last Seen At: <span className='font-bold'>{safeDate(user.lastSeenAt as string | undefined, 'datetime')}</span></p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                        <div className="flex flex-row items-center gap-2 text-sm">
                            <CopyableIconButton
                                icon={<SteamIcon className='h-4 w-4' />}
                                value={typeof user.steamId === 'string' ? user.steamId : ''}
                                label="Steam ID"
                                onCopy={copyToClipboard}
                                copiedField={copiedField}
                            />
                            <CopyableIconButton
                                icon={<DiscordIcon className='h-4 w-4' />}
                                value={typeof user.discordId === 'string' ? user.discordId : ''}
                                label="Discord ID"
                                onCopy={copyToClipboard}
                                copiedField={copiedField}
                            />
                            {user.discordId ? (
                                <div className="">
                                    <div className="flex gap-2 items-center">
                                        <DiscordIcon className='h-4 w-4' />
                                        <span className='text-sm'>Boosting</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4"
                                            onClick={() => refreshBoostMutation.mutate()}
                                            disabled={refreshBoostMutation.isPending}
                                        >
                                            <RefreshCw className={cn("h-3 w-3", refreshBoostMutation.isPending && "animate-spin")} />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        {user.isBoosting ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <XIcon className="h-4 w-4 text-red-500" />
                                        )}
                                    </div>
                                </div>
                            ) : (null)}
                            <div className="ml-4">
                                <div className="flex gap-2 items-center">
                                    <SteamIcon className='h-4 w-4' />
                                    <span className='text-sm'>Steam Group</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4"
                                        onClick={() => refreshSteamGroupMutation.mutate()}
                                        disabled={refreshSteamGroupMutation.isPending}
                                    >
                                        <RefreshCw className={cn("h-3 w-3", refreshSteamGroupMutation.isPending && "animate-spin")} />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-center">
                                    {user.joinedSteamGroup ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XIcon className="h-4 w-4 text-red-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className='p-4 grid grid-cols-2 gap-2 items-start'>
                <Link
                    href={`https://www.battlemetrics.com/rcon/players?filter[search]=${user.steamId}`}
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
                    href={`https://dashboard.paynow.gg/customers/${user.storeId}`}
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
                    Visit PayNow
                </Link>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                        >
                            {user.isBanned ? (
                                <>
                                    <Check className="mr-2 h-4 w-4 text-green-500" />
                                    Unban Tickets
                                </>
                            ) : (
                                <>
                                    <X className="mr-2 h-4 w-4 text-red-500" />
                                    Ban Tickets
                                </>
                            )}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{user.isBanned ? "Unban User from Tickets" : "Ban User from Tickets"}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {user.isBanned 
                                    ? "This will allow the user to create new tickets again."
                                    : "This will ban the user from creating new tickets and close all their open tickets."}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Input
                                id="reason"
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder={`Enter ${user.isBanned ? 'unban' : 'ban'} reason`}
                            />
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => {
                                    if (user.isBanned) {
                                        unbanUserMutation.mutate(banReason);
                                    } else {
                                        banUserMutation.mutate(banReason);
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                {user.isBanned ? "Unban User" : "Ban User"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <GiftPackage
                    customerId={typeof user.storeId === 'string' ? user.storeId : ''}
                    steamId={typeof user.steamId === 'string' ? user.steamId : undefined}
                />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="secondary"
                            type="button"
                            className="w-fit md:w-full justify-start"
                            disabled={syncDiscordMutation.isPending}
                        >
                            <RefreshCw className={cn("mr-2 h-4 w-4", syncDiscordMutation.isPending && "animate-spin")} />
                            Sync Discord roles
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sync Discord roles for this user?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Adds every Discord role this user&apos;s website roles map to. If they are not in the server, nothing is added. Nothing is removed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => syncDiscordMutation.mutate()}>Sync Discord roles</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            size="sm"
                            variant="secondary"
                            type="button"
                            className="w-fit md:w-full justify-start"
                            disabled={recheckPaynowMutation.isPending}
                        >
                            <RefreshCw className={cn("mr-2 h-4 w-4", recheckPaynowMutation.isPending && "animate-spin")} />
                            Recheck roles
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Recheck roles for this user?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This only removes. A website role linked to Discord is removed when this person is not linked, is not in the server, or no longer has the Discord role. PayNow ranks are dropped when the purchase is no longer active. It does not give Discord roles they are missing.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => recheckPaynowMutation.mutate()}>Recheck roles</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="sm"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the user account
                                and remove all associated data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    )
}

function BuildBadge({ role, user }: { role: UserRole, user: User }) {
    return (
        <Badge
            key={role.role?.id}
            variant={'active'}
            className={cn(
                "capitalize text-xs px-2.5 py-0.5 group",
            )}
            style={role.role?.color ? {
                backgroundColor: `${role.role.color}20`,
                borderColor: role.role.color,
                color: role.role.color,
            } : {}}
        >
            {role.role?.name}
            <RemoveRoleButton role={role} userId={user.id} />
        </Badge>
    )
}

function CopyableIconButton({ icon, value, label, onCopy, copiedField }: CopyableIconButtonProps) {
    const handleClick = () => {
        try {
            onCopy(value, label);
        } catch (err) {
            console.error('Copy failed:', err);
            toast.error('Copy failed');
        }
    };
    return (
        <Button
            variant="ghost"
            className="h-full flex-col cursor-help"
            onClick={handleClick}
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

function RemoveRoleButton({ role, userId }: { role: UserRole; userId: string }) {
    const roleId = role.role?.id || '';
    const roleName = role.role?.name ?? 'role';
    const canRevoke = role.canManage !== false;

    const handleClick = () => {
        if (!canRevoke) return;
        window.setTimeout(() => {
            removeUserFromRole({ roleId, userId })
                .then(() => {
                    toast.success(`${roleName} removed successfully`);
                    window.setTimeout(() => window.location.reload(), 150);
                })
                .catch((err) => {
                    toast.error(err?.message ?? `Error removing ${roleName}`);
                });
        }, 0);
    };

    if (!canRevoke) {
        return null;
    }

    return (
        <X
            className='ml-1.5 h-3 w-3 cursor-pointer group-hover:scale-125 duration-300'
            onClick={handleClick}
            aria-label={`Remove ${roleName} role`}
        />
    );
}