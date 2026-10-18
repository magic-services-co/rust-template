'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { getAuthToken } from '@/lib/laravel-auth'
import { updateApiKey, deleteApiKey, listApiKeys, createApiKey } from '@/app/actions/api-keys'

interface ApiKey {
    id: string
    key: string
    name: string
    description: string | null
    enabled: boolean
    permissions: {
        public: {
            siteData: {
                sitemap: boolean
                servers: boolean
                redirects: boolean
                maps: boolean
                mapsById: boolean
                mapsEmbeds: boolean
                leaderboardTabs: boolean
                stats: boolean
                wipes: {
                    get: boolean
                    create: boolean
                }
            }
            support: {
                list: boolean
                bySlug: boolean
                create: boolean
            }
            voting: {
                submit: boolean
                get: boolean
            }
        webhooks: {
            discord: boolean
        }
        discord: {
            syncRoles: boolean
        }
        users: {
                search: boolean
                oxide: boolean
                manage: boolean
            }
            bans: {
                check: boolean
            }
        }
        admin: {
            users: {
                list: boolean
                delete: boolean
            }
            tickets: {
                list: boolean
                byId: boolean
                delete: boolean
                messages: {
                    list: boolean
                    create: boolean
                }
                settings: {
                    get: boolean
                    create: boolean
                    update: boolean
                    delete: boolean
                }
            }
            store: {
                settings: {
                    get: boolean
                    update: boolean
                }
                sales: {
                    get: boolean
                    create: boolean
                }
            }
            site: {
                settings: {
                    update: boolean
                }
                redirects: {
                    get: boolean
                    update: boolean
                    delete: boolean
                }
                navigation: {
                    get: boolean
                    create: boolean
                    update: boolean
                    delete: boolean
                }
            }
            roles: {
                get: boolean
                create: boolean
                update: boolean
            }
            permissions: {
                update: boolean
            }
            metadata: {
                get: boolean
                create: boolean
            }
            pageMetadata: {
                get: boolean
                create: boolean
                bySlug: {
                    get: boolean
                    update: boolean
                    delete: boolean
                }
            }
            servers: {
                create: boolean
                update: boolean
                delete: boolean
                reorder: boolean
            }
            mapVoting: {
                submit: boolean
                get: boolean
                update: boolean
                delete: boolean
            }
            leaderboard: {
                settings: {
                    get: boolean
                    update: boolean
                }
                data: {
                    delete: boolean
                }
            }
            discord: {
                settings: {
                    get: boolean
                    update: boolean
                }
                notifications: {
                    get: boolean
                }
            }
            api: {
                settings: {
                    get: boolean
                    update: boolean
                }
                keys: {
                    get: boolean
                    create: boolean
                    update: boolean
                    delete: boolean
                }
            }
            bans: {
                list: boolean
                create: boolean
                update: boolean
                delete: boolean
                check: boolean
            }
            logs: {
                get: boolean
                delete: boolean
            }
        }
        auth: {
            checkPermission: boolean
            unlink: boolean
        }
    }
    createdAt: string
    createdBy: string
    creator: {
        id: string
        name: string | null
        email: string | null
    }
}

interface TicketPermissions {
    list: boolean
    byId: boolean
    delete: boolean
    messages: {
        list: boolean
        create: boolean
    }
    settings: {
        get: boolean
        create: boolean
        update: boolean
        delete: boolean
    }
}

interface Permissions {
    public: {
        siteData: {
            sitemap: boolean
            servers: boolean
            redirects: boolean
            maps: boolean
            mapsById: boolean
            mapsEmbeds: boolean
            leaderboardTabs: boolean
            stats: boolean
            wipes: {
                get: boolean
                create: boolean
            }
        }
        support: {
            list: boolean
            bySlug: boolean
            create: boolean
        }
        voting: {
            submit: boolean
            get: boolean
        }
        webhooks: {
            discord: boolean
        }
        discord: {
            syncRoles: boolean
        }
        users: {
            search: boolean
            oxide: boolean
            manage: boolean
        }
        bans: {
            check: boolean
        }
    }
    admin: {
        users: {
            list: boolean
            delete: boolean
        }
        tickets: TicketPermissions
        store: {
            settings: {
                get: boolean
                update: boolean
            }
            sales: {
                get: boolean
                create: boolean
            }
        }
        site: {
            settings: {
                update: boolean
            }
            redirects: {
                get: boolean
                update: boolean
                delete: boolean
            }
            navigation: {
                get: boolean
                create: boolean
                update: boolean
                delete: boolean
            }
        }
        roles: {
            get: boolean
            create: boolean
            update: boolean
        }
        permissions: {
            update: boolean
        }
        metadata: {
            get: boolean
            create: boolean
        }
        pageMetadata: {
            get: boolean
            create: boolean
            bySlug: {
                get: boolean
                update: boolean
                delete: boolean
            }
        }
        servers: {
            create: boolean
            update: boolean
            delete: boolean
            reorder: boolean
        }
        mapVoting: {
            submit: boolean
            get: boolean
            update: boolean
            delete: boolean
        }
        leaderboard: {
            settings: {
                get: boolean
                update: boolean
            }
            data: {
                delete: boolean
            }
        }
        discord: {
            settings: {
                get: boolean
                update: boolean
            }
            notifications: {
                get: boolean
            }
        }
        api: {
            settings: {
                get: boolean
                update: boolean
            }
            keys: {
                get: boolean
                create: boolean
                update: boolean
                delete: boolean
            }
        }
        bans: {
            list: boolean
            create: boolean
            update: boolean
            delete: boolean
            check: boolean
        }
        logs: {
            get: boolean
            delete: boolean
        }
    }
    auth: {
        checkPermission: boolean
        unlink: boolean
    }
}

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
    const [isCreating, setIsCreating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [newKey, setNewKey] = useState<{
        name: string
        description: string
        permissions: Permissions
    }>({
        name: '',
        description: '',
        permissions: {
            public: {
                siteData: {
                    sitemap: false,
                    servers: false,
                    redirects: false,
                    maps: false,
                    mapsById: false,
                    mapsEmbeds: false,
                    leaderboardTabs: false,
                    stats: false,
                    wipes: {
                        get: false,
                        create: false
                    }
                },
                support: {
                    list: false,
                    bySlug: false,
                    create: false
                },
                voting: {
                    submit: false,
                    get: false
                },
                webhooks: {
                    discord: false
                },
                discord: {
                    syncRoles: false
                },
                users: {
                    search: false,
                    oxide: false,
                    manage: false
                },
                bans: {
                    check: false
                }
            },
            admin: {
                users: {
                    list: false,
                    delete: false
                },
                tickets: {
                    list: false,
                    byId: false,
                    delete: false,
                    messages: {
                        list: false,
                        create: false
                    },
                    settings: {
                        get: false,
                        create: false,
                        update: false,
                        delete: false
                    }
                },
                store: {
                    settings: {
                        get: false,
                        update: false
                    },
                    sales: {
                        get: false,
                        create: false
                    }
                },
                site: {
                    settings: {
                        update: false
                    },
                    redirects: {
                        get: false,
                        update: false,
                        delete: false
                    },
                    navigation: {
                        get: false,
                        create: false,
                        update: false,
                        delete: false
                    }
                },
                roles: {
                    get: false,
                    create: false,
                    update: false
                },
                permissions: {
                    update: false
                },
                metadata: {
                    get: false,
                    create: false
                },
                pageMetadata: {
                    get: false,
                    create: false,
                    bySlug: {
                        get: false,
                        update: false,
                        delete: false
                    }
                },
                servers: {
                    create: false,
                    update: false,
                    delete: false,
                    reorder: false
                },
                mapVoting: {
                    submit: false,
                    get: false,
                    update: false,
                    delete: false
                },
                leaderboard: {
                    settings: {
                        get: false,
                        update: false
                    },
                    data: {
                        delete: false
                    }
                },
                discord: {
                    settings: {
                        get: false,
                        update: false
                    },
                    notifications: {
                        get: false
                    }
                },
                api: {
                    settings: {
                        get: false,
                        update: false
                    },
                    keys: {
                        get: false,
                        create: false,
                        update: false,
                        delete: false
                    }
                },
                bans: {
                    list: false,
                    create: false,
                    update: false,
                    delete: false,
                    check: false
                },
                logs: {
                    get: false,
                    delete: false
                }
            },
            auth: {
                checkPermission: false,
                unlink: false
            }
        }
    })

    const fetchApiKeys = async () => {
        try {
            setIsLoading(true)
            const { data, error } = await listApiKeys(getAuthToken())
            if (error) throw new Error(error)
            const normalizedKeys = (Array.isArray(data) ? data : []).map((key: unknown) => {
                const k = key as ApiKey
                return {
                    ...k,
                    permissions: {
                        ...k.permissions,
                        public: {
                            ...k.permissions?.public,
                            discord: {
                                ...(k.permissions?.public?.discord || {}),
                                syncRoles: k.permissions?.public?.discord?.syncRoles ?? false
                            }
                        }
                    }
                }
            })
            setApiKeys(normalizedKeys)
        } catch (error) {
            console.error('Error fetching API keys:', error)
            toast.error('Failed to fetch API keys')
            setApiKeys([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchApiKeys()
    }, [])

    const handleCreate = async () => {
        try {
            const { data, error } = await createApiKey({
                name: newKey.name,
                description: newKey.description || undefined,
                permissions: newKey.permissions
            }, getAuthToken())
            if (error) throw new Error(error)
            const created = data as ApiKey
            const normalized = created ? {
                ...created,
                permissions: {
                    ...created.permissions,
                    public: {
                        ...created.permissions?.public,
                        discord: {
                            ...(created.permissions?.public?.discord || {}),
                            syncRoles: created.permissions?.public?.discord?.syncRoles ?? false
                        }
                    }
                }
            } : created
            setApiKeys([normalized, ...apiKeys])
            setIsCreating(false)
            setNewKey({
                name: '',
                description: '',
                permissions: {
                    public: {
                        siteData: {
                            sitemap: false,
                            servers: false,
                            redirects: false,
                            maps: false,
                            mapsById: false,
                            mapsEmbeds: false,
                            leaderboardTabs: false,
                            stats: false,
                            wipes: {
                                get: false,
                                create: false
                            }
                        },
                        support: {
                            list: false,
                            bySlug: false,
                            create: false
                        },
                        voting: {
                            submit: false,
                            get: false
                        },
                        webhooks: {
                            discord: false
                        },
                        discord: {
                            syncRoles: false
                        },
                        users: {
                            search: false,
                            oxide: false,
                            manage: false
                        },
                        bans: {
                            check: false
                        }
                    },
                    admin: {
                        users: {
                            list: false,
                            delete: false
                        },
                        tickets: {
                            list: false,
                            byId: false,
                            delete: false,
                            messages: {
                                list: false,
                                create: false
                            },
                            settings: {
                                get: false,
                                create: false,
                                update: false,
                                delete: false
                            }
                        },
                        store: {
                            settings: {
                                get: false,
                                update: false
                            },
                            sales: {
                                get: false,
                                create: false
                            }
                        },
                        site: {
                            settings: {
                                update: false
                            },
                            redirects: {
                                get: false,
                                update: false,
                                delete: false
                            },
                            navigation: {
                                get: false,
                                create: false,
                                update: false,
                                delete: false
                            }
                        },
                        roles: {
                            get: false,
                            create: false,
                            update: false
                        },
                        permissions: {
                            update: false
                        },
                        metadata: {
                            get: false,
                            create: false
                        },
                        pageMetadata: {
                            get: false,
                            create: false,
                            bySlug: {
                                get: false,
                                update: false,
                                delete: false
                            }
                        },
                        servers: {
                            create: false,
                            update: false,
                            delete: false,
                            reorder: false
                        },
                        mapVoting: {
                            submit: false,
                            get: false,
                            update: false,
                            delete: false
                        },
                        leaderboard: {
                            settings: {
                                get: false,
                                update: false
                            },
                            data: {
                                delete: false
                            }
                        },
                        discord: {
                            settings: {
                                get: false,
                                update: false
                            },
                            notifications: {
                                get: false
                            }
                        },
                        api: {
                            settings: {
                                get: false,
                                update: false
                            },
                            keys: {
                                get: false,
                                create: false,
                                update: false,
                                delete: false
                            }
                        },
                        logs: {
                            get: false,
                            delete: false
                        },
                        bans: {
                            list: false,
                            create: false,
                            update: false,
                            delete: false,
                            check: false
                        }
                    },
                    auth: {
                        checkPermission: false,
                        unlink: false
                    }
                }
            })
            toast.success('API key created successfully')
        } catch (error) {
            console.error('Error creating API key:', error)
            const msg = error instanceof Error ? error.message : 'Failed to create API key'
            const isAuthError = msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('unauthenticated')
            if (isAuthError) {
                toast.error('Session expired or not signed in. Please sign in again and try creating the API key.')
            } else {
                toast.error(msg)
            }
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const { error } = await deleteApiKey(id, getAuthToken())
            if (error) throw new Error(error)
            setApiKeys(apiKeys.filter(key => key.id !== id))
            toast.success('API key deleted successfully')
        } catch (error) {
            console.error('Error deleting API key:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to delete API key')
        }
    }

    const handleToggle = async (id: string, enabled: boolean) => {
        try {
            const { error } = await updateApiKey(id, { enabled }, getAuthToken())
            if (error) throw new Error(error)
            setApiKeys(apiKeys.map(key =>
                key.id === id ? { ...key, enabled } : key
            ))
            toast.success('API key updated successfully')
        } catch (error) {
            console.error('Error updating API key:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to update API key')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">API Keys</h2>
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button>Create New API Key</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Create New API Key</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="space-y-4 pb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Name</label>
                                    <Input
                                        value={newKey.name}
                                        onChange={e => setNewKey({ ...newKey, name: e.target.value })}
                                        placeholder="My API Key"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <Textarea
                                        value={newKey.description}
                                        onChange={e => setNewKey({ ...newKey, description: e.target.value })}
                                        placeholder="What is this API key for?"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Permissions</h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const allSelected = Object.values(newKey.permissions.public).every(section => 
                                                    Object.values(section).every(Boolean)
                                                ) && Object.values(newKey.permissions.admin).every(section => 
                                                    Object.values(section).every(Boolean)
                                                ) && Object.values(newKey.permissions.auth).every(Boolean);
                                                
                                                setNewKey({
                                                    ...newKey,
                                                    permissions: {
                                                        public: {
                                                            siteData: {
                                                                sitemap: !allSelected,
                                                                servers: !allSelected,
                                                                redirects: !allSelected,
                                                                maps: !allSelected,
                                                                mapsById: !allSelected,
                                                                mapsEmbeds: !allSelected,
                                                                leaderboardTabs: !allSelected,
                                                                stats: !allSelected,
                                                                wipes: {
                                                                    get: !allSelected,
                                                                    create: !allSelected
                                                                }
                                                            },
                                                            support: {
                                                                list: !allSelected,
                                                                bySlug: !allSelected,
                                                                create: !allSelected
                                                            },
                                                            voting: {
                                                                submit: !allSelected,
                                                                get: !allSelected
                                                            },
                                                            webhooks: {
                                                                discord: !allSelected
                                                            },
                                                            discord: {
                                                                syncRoles: !allSelected
                                                            },
                                                            users: {
                                                                search: !allSelected,
                                                                oxide: !allSelected,
                                                                manage: !allSelected
                                                            },
                                                            bans: {
                                                                check: !allSelected
                                                            }
                                                        },
                                                        admin: {
                                                            users: {
                                                                list: !allSelected,
                                                                delete: !allSelected
                                                            },
                                                            tickets: {
                                                                list: !allSelected,
                                                                byId: !allSelected,
                                                                delete: !allSelected,
                                                                messages: {
                                                                    list: !allSelected,
                                                                    create: !allSelected
                                                                },
                                                                settings: {
                                                                    get: !allSelected,
                                                                    create: !allSelected,
                                                                    update: !allSelected,
                                                                    delete: !allSelected
                                                                }
                                                            },
                                                            store: {
                                                                settings: {
                                                                    get: !allSelected,
                                                                    update: !allSelected
                                                                },
                                                                sales: {
                                                                    get: !allSelected,
                                                                    create: !allSelected
                                                                }
                                                            },
                                                            site: {
                                                                settings: {
                                                                    update: !allSelected
                                                                },
                                                                redirects: {
                                                                    get: !allSelected,
                                                                    update: !allSelected,
                                                                    delete: !allSelected
                                                                },
                                                                navigation: {
                                                                    get: !allSelected,
                                                                    create: !allSelected,
                                                                    update: !allSelected,
                                                                    delete: !allSelected
                                                                }
                                                            },
                                                            roles: {
                                                                get: !allSelected,
                                                                create: !allSelected,
                                                                update: !allSelected
                                                            },
                                                            permissions: {
                                                                update: !allSelected
                                                            },
                                                            metadata: {
                                                                get: !allSelected,
                                                                create: !allSelected
                                                            },
                                                            pageMetadata: {
                                                                get: !allSelected,
                                                                create: !allSelected,
                                                                bySlug: {
                                                                    get: !allSelected,
                                                                    update: !allSelected,
                                                                    delete: !allSelected
                                                                }
                                                            },
                                                            servers: {
                                                                create: !allSelected,
                                                                update: !allSelected,
                                                                delete: !allSelected,
                                                                reorder: !allSelected
                                                            },
                                                            mapVoting: {
                                                                submit: !allSelected,
                                                                get: !allSelected,
                                                                update: !allSelected,
                                                                delete: !allSelected
                                                            },
                                                            leaderboard: {
                                                                settings: {
                                                                    get: !allSelected,
                                                                    update: !allSelected
                                                                },
                                                                data: {
                                                                    delete: !allSelected
                                                                }
                                                            },
                                                            discord: {
                                                                settings: {
                                                                    get: !allSelected,
                                                                    update: !allSelected
                                                                },
                                                                notifications: {
                                                                    get: !allSelected
                                                                }
                                                            },
                                                            api: {
                                                                settings: {
                                                                    get: !allSelected,
                                                                    update: !allSelected
                                                                },
                                                                keys: {
                                                                    get: !allSelected,
                                                                    create: !allSelected,
                                                                    update: !allSelected,
                                                                    delete: !allSelected
                                                                }
                                                            },
                                                            bans: {
                                                                list: !allSelected,
                                                                create: !allSelected,
                                                                update: !allSelected,
                                                                delete: !allSelected,
                                                                check: !allSelected
                                                            },
                                                            logs: {
                                                                get: !allSelected,
                                                                delete: !allSelected
                                                            }
                                                        },
                                                        auth: {
                                                            checkPermission: !allSelected,
                                                            unlink: !allSelected
                                                        }
                                                    }
                                                });
                                            }}
                                        >
                                            {Object.values(newKey.permissions.public).every(section => 
                                                Object.values(section).every(Boolean)
                                            ) && Object.values(newKey.permissions.admin).every(section => 
                                                Object.values(section).every(Boolean)
                                            ) && Object.values(newKey.permissions.auth).every(Boolean) ? 'Deselect All' : 'Select All'}
                                        </Button>
                                    </div>
                                    
                                    <Collapsible defaultOpen>
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted rounded-md">
                                            <h4 className="text-md font-medium">Public Endpoints</h4>
                                            <ChevronDown className="h-4 w-4" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-2 mt-2">
                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Site Data</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/sitemap</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.sitemap}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    sitemap: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/servers</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.servers}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    servers: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/redirects</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.redirects}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    redirects: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/maps</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.maps}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    maps: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/maps/[id]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.mapsById}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    mapsById: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/maps/embeds</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.mapsEmbeds}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    mapsEmbeds: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/leaderboard-tabs</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.leaderboardTabs}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    leaderboardTabs: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/stats</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.stats}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    stats: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/wipes</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.wipes?.get || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    wipes: {
                                                                                        ...newKey.permissions.public.siteData.wipes,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/wipes</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.siteData.wipes?.create || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                siteData: {
                                                                                    ...newKey.permissions.public.siteData,
                                                                                    wipes: {
                                                                                        ...newKey.permissions.public.siteData.wipes,
                                                                                        create: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Support</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/support</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.support.list}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                support: {
                                                                                    ...newKey.permissions.public.support,
                                                                                    list: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/support/[slug]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.support.bySlug}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                support: {
                                                                                    ...newKey.permissions.public.support,
                                                                                    bySlug: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/support</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.support.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                support: {
                                                                                    ...newKey.permissions.public.support,
                                                                                    create: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Voting</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/vote</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.voting.submit}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                voting: {
                                                                                    ...newKey.permissions.public.voting,
                                                                                    submit: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/vote</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.voting.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                voting: {
                                                                                    ...newKey.permissions.public.voting,
                                                                                    get: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Webhooks</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/webhooks/discord</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.webhooks.discord}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                webhooks: {
                                                                                    ...newKey.permissions.public.webhooks,
                                                                                    discord: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Discord</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/discord/sync-roles</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.discord?.syncRoles ?? false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                discord: {
                                                                                    ...(newKey.permissions.public.discord || {}),
                                                                                    syncRoles: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Users</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/user?type=oxide</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.users.oxide}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                users: {
                                                                                    ...newKey.permissions.public.users,
                                                                                    oxide: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET/POST</span>
                                                                <span className="text-sm ml-2">/api/user (manage)</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.users.manage}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                users: {
                                                                                    ...newKey.permissions.public.users,
                                                                                    manage: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/user?search</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.users.search}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                users: {
                                                                                    ...newKey.permissions.public.users,
                                                                                    search: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                            <Collapsible>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 text-left hover:bg-muted/50 rounded-md">
                                                    <span className="font-medium">Bans</span>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <div className="space-y-1 pl-4 pb-2">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/bans/check</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.public.bans?.check || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            public: {
                                                                                ...newKey.permissions.public,
                                                                                bans: {
                                                                                    ...(newKey.permissions.public.bans || {}),
                                                                                    check: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <Collapsible defaultOpen>
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted rounded-md">
                                            <h4 className="text-md font-medium">Admin Endpoints</h4>
                                            <ChevronDown className="h-4 w-4" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-2 mt-2">
                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">User Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/users</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.users.list}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                users: {
                                                                                    ...newKey.permissions.admin.users,
                                                                                    list: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/users</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.users.delete}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                users: {
                                                                                    ...newKey.permissions.admin.users,
                                                                                    delete: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                            <Collapsible>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 text-left hover:bg-muted/50 rounded-md">
                                                    <span className="font-medium">Bans</span>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <div className="space-y-1 pl-4 pb-2">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/bans</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.bans?.list || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                bans: {
                                                                                    ...(newKey.permissions.admin.bans || {}),
                                                                                    list: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/bans</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.bans?.create || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                bans: {
                                                                                    ...(newKey.permissions.admin.bans || {}),
                                                                                    create: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/bans/[id]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.bans?.update || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                bans: {
                                                                                    ...(newKey.permissions.admin.bans || {}),
                                                                                    update: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/bans/[id]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.bans?.delete || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                bans: {
                                                                                    ...(newKey.permissions.admin.bans || {}),
                                                                                    delete: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/bans/check</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.bans?.check || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                bans: {
                                                                                    ...(newKey.permissions.admin.bans || {}),
                                                                                    check: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 text-left hover:bg-muted/50 rounded-md">
                                                    <span className="font-medium">Logs</span>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <div className="space-y-1 pl-4 pb-2">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/logs</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.logs?.get || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                logs: {
                                                                                    ...(newKey.permissions.admin.logs || {}),
                                                                                    get: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/logs</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.logs?.delete || false}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                logs: {
                                                                                    ...(newKey.permissions.admin.logs || {}),
                                                                                    delete: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                                    <Collapsible defaultOpen>
                                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                            <h5 className="text-sm font-medium">Ticket Management</h5>
                                                            <ChevronDown className="h-4 w-4" />
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                        <span className="text-sm ml-2">/api/admin/tickets</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.list}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            list: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                        <span className="text-sm ml-2">/api/admin/tickets/[id]</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.byId}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            byId: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                        <span className="text-sm ml-2">/api/admin/tickets/[id]</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.delete}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            delete: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                        <span className="text-sm ml-2">/api/admin/tickets/[id]/messages</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.messages.list}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            messages: {
                                                                                                ...newKey.permissions.admin.tickets.messages,
                                                                                                list: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                        <span className="text-sm ml-2">/api/admin/tickets/[id]/messages, /api/bot/tickets/[id]/messages</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.messages.create}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            messages: {
                                                                                                ...newKey.permissions.admin.tickets.messages,
                                                                                                create: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                        <span className="text-sm ml-2">/api/admin/ticket-settings</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.settings.get}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            settings: {
                                                                                                ...newKey.permissions.admin.tickets.settings,
                                                                                                get: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                        <span className="text-sm ml-2">/api/admin/ticket-settings</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.settings.create}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            settings: {
                                                                                                ...newKey.permissions.admin.tickets.settings,
                                                                                                create: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                        <span className="text-sm ml-2">/api/admin/ticket-settings</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.settings.update}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            settings: {
                                                                                                ...newKey.permissions.admin.tickets.settings,
                                                                                                update: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                        <span className="text-sm ml-2">/api/admin/ticket-settings</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.tickets.settings.delete}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        tickets: {
                                                                                            ...newKey.permissions.admin.tickets,
                                                                                            settings: {
                                                                                                ...newKey.permissions.admin.tickets.settings,
                                                                                                delete: checked
                                                                                            }
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>

                                                    <Collapsible defaultOpen>
                                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                            <h5 className="text-sm font-medium">Map Voting</h5>
                                                            <ChevronDown className="h-4 w-4" />
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                        <span className="text-sm ml-2">/api/admin/map-voting</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.mapVoting.submit}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        mapVoting: {
                                                                                            ...newKey.permissions.admin.mapVoting,
                                                                                            submit: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                        <span className="text-sm ml-2">/api/admin/map-voting</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.mapVoting.get}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        mapVoting: {
                                                                                            ...newKey.permissions.admin.mapVoting,
                                                                                            get: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                        <span className="text-sm ml-2">/api/admin/map-voting</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.mapVoting.update}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        mapVoting: {
                                                                                            ...newKey.permissions.admin.mapVoting,
                                                                                            update: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between py-1">
                                                                    <div>
                                                                        <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                        <span className="text-sm ml-2">/api/admin/map-voting</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={newKey.permissions.admin.mapVoting.delete}
                                                                        onCheckedChange={checked => {
                                                                            setNewKey({
                                                                                ...newKey,
                                                                                permissions: {
                                                                                    ...newKey.permissions,
                                                                                    admin: {
                                                                                        ...newKey.permissions.admin,
                                                                                        mapVoting: {
                                                                                            ...newKey.permissions.admin.mapVoting,
                                                                                            delete: checked
                                                                                        }
                                                                                    }
                                                                                }
                                                                            })
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Leaderboard Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/leaderboard-settings</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.leaderboard.settings.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                leaderboard: {
                                                                                    ...newKey.permissions.admin.leaderboard,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.leaderboard.settings,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/leaderboard-settings</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.leaderboard.settings.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                leaderboard: {
                                                                                    ...newKey.permissions.admin.leaderboard,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.leaderboard.settings,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/leaderboard-settings/data</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.leaderboard.data.delete}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                leaderboard: {
                                                                                    ...newKey.permissions.admin.leaderboard,
                                                                                    data: {
                                                                                        ...newKey.permissions.admin.leaderboard.data,
                                                                                        delete: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Discord Integration</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/discord</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.discord.settings.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                discord: {
                                                                                    ...newKey.permissions.admin.discord,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.discord.settings,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/discord</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.discord.settings.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                discord: {
                                                                                    ...newKey.permissions.admin.discord,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.discord.settings,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/discord/notification</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.discord.notifications.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                discord: {
                                                                                    ...newKey.permissions.admin.discord,
                                                                                    notifications: {
                                                                                        ...newKey.permissions.admin.discord.notifications,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Store Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/store-settings</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.store.settings.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                store: {
                                                                                    ...newKey.permissions.admin.store,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.store.settings,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/store-settings</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.store.settings.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                store: {
                                                                                    ...newKey.permissions.admin.store,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.store.settings,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/store-sale</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.store.sales.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                store: {
                                                                                    ...newKey.permissions.admin.store,
                                                                                    sales: {
                                                                                        ...newKey.permissions.admin.store.sales,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/store-sale</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.store.sales.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                store: {
                                                                                    ...newKey.permissions.admin.store,
                                                                                    sales: {
                                                                                        ...newKey.permissions.admin.store.sales,
                                                                                        create: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Site Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PATCH</span>
                                                                <span className="text-sm ml-2">/api/admin/site-settings</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.settings.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    settings: {
                                                                                        ...newKey.permissions.admin.site.settings,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/redirects</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.redirects.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    redirects: {
                                                                                        ...newKey.permissions.admin.site.redirects,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/redirects</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.redirects.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    redirects: {
                                                                                        ...newKey.permissions.admin.site.redirects,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/redirects</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.redirects.delete}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    redirects: {
                                                                                        ...newKey.permissions.admin.site.redirects,
                                                                                        delete: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/navigation</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.navigation.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    navigation: {
                                                                                        ...newKey.permissions.admin.site.navigation,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/navigation</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.navigation.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    navigation: {
                                                                                        ...newKey.permissions.admin.site.navigation,
                                                                                        create: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/navigation</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.navigation.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    navigation: {
                                                                                        ...newKey.permissions.admin.site.navigation,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/navigation</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.site.navigation.delete}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                site: {
                                                                                    ...newKey.permissions.admin.site,
                                                                                    navigation: {
                                                                                        ...newKey.permissions.admin.site.navigation,
                                                                                        delete: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Role & Permission Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/roles</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.roles.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                roles: {
                                                                                    ...newKey.permissions.admin.roles,
                                                                                    get: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/roles</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.roles.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                roles: {
                                                                                    ...newKey.permissions.admin.roles,
                                                                                    create: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/roles</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.roles.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                roles: {
                                                                                    ...newKey.permissions.admin.roles,
                                                                                    update: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/permissions</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.permissions.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                permissions: {
                                                                                    ...newKey.permissions.admin.permissions,
                                                                                    update: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Metadata Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/metadata</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.metadata.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                metadata: {
                                                                                    ...newKey.permissions.admin.metadata,
                                                                                    get: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/settings/metadata</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.metadata.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                metadata: {
                                                                                    ...newKey.permissions.admin.metadata,
                                                                                    create: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/page-metadata</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.pageMetadata.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                pageMetadata: {
                                                                                    ...newKey.permissions.admin.pageMetadata,
                                                                                    get: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/page-metadata</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.pageMetadata.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                pageMetadata: {
                                                                                    ...newKey.permissions.admin.pageMetadata,
                                                                                    create: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">GET</span>
                                                                <span className="text-sm ml-2">/api/admin/page-metadata/[slug]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.pageMetadata.bySlug.get}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                pageMetadata: {
                                                                                    ...newKey.permissions.admin.pageMetadata,
                                                                                    bySlug: {
                                                                                        ...newKey.permissions.admin.pageMetadata.bySlug,
                                                                                        get: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/page-metadata/[slug]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.pageMetadata.bySlug.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                pageMetadata: {
                                                                                    ...newKey.permissions.admin.pageMetadata,
                                                                                    bySlug: {
                                                                                        ...newKey.permissions.admin.pageMetadata.bySlug,
                                                                                        update: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/page-metadata/[slug]</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.pageMetadata.bySlug.delete}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                pageMetadata: {
                                                                                    ...newKey.permissions.admin.pageMetadata,
                                                                                    bySlug: {
                                                                                        ...newKey.permissions.admin.pageMetadata.bySlug,
                                                                                        delete: checked
                                                                                    }
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>

                                            <Collapsible defaultOpen>
                                                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md">
                                                    <h5 className="text-sm font-medium">Server Management</h5>
                                                    <ChevronDown className="h-4 w-4" />
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="space-y-1 mt-2 pl-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/servers</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.servers.create}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                servers: {
                                                                                    ...newKey.permissions.admin.servers,
                                                                                    create: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">PUT</span>
                                                                <span className="text-sm ml-2">/api/admin/servers</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.servers.update}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                servers: {
                                                                                    ...newKey.permissions.admin.servers,
                                                                                    update: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                                <span className="text-sm ml-2">/api/admin/servers</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.servers.delete}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                servers: {
                                                                                    ...newKey.permissions.admin.servers,
                                                                                    delete: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between py-1">
                                                            <div>
                                                                <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                                <span className="text-sm ml-2">/api/admin/servers/reorder</span>
                                                            </div>
                                                            <Switch
                                                                checked={newKey.permissions.admin.servers.reorder}
                                                                onCheckedChange={checked => {
                                                                    setNewKey({
                                                                        ...newKey,
                                                                        permissions: {
                                                                            ...newKey.permissions,
                                                                            admin: {
                                                                                ...newKey.permissions.admin,
                                                                                servers: {
                                                                                    ...newKey.permissions.admin.servers,
                                                                                    reorder: checked
                                                                                }
                                                                            }
                                                                        }
                                                                    })
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </CollapsibleContent>
                                    </Collapsible>

                                    <Collapsible defaultOpen>
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted rounded-md">
                                            <h4 className="text-md font-medium">Authentication Endpoints</h4>
                                            <ChevronDown className="h-4 w-4" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-2 mt-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <span className="text-xs font-mono bg-muted px-1 rounded">POST</span>
                                                        <span className="text-sm ml-2">/api/auth/check-permission</span>
                                                    </div>
                                                    <Switch
                                                        checked={newKey.permissions.auth.checkPermission}
                                                        onCheckedChange={checked => {
                                                            setNewKey({
                                                                ...newKey,
                                                                permissions: {
                                                                    ...newKey.permissions,
                                                                    auth: {
                                                                        ...newKey.permissions.auth,
                                                                        checkPermission: checked
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between py-1">
                                                    <div>
                                                        <span className="text-xs font-mono bg-muted px-1 rounded">DELETE</span>
                                                        <span className="text-sm ml-2">/api/user/unlink</span>
                                                    </div>
                                                    <Switch
                                                        checked={newKey.permissions.auth.unlink}
                                                        onCheckedChange={checked => {
                                                            setNewKey({
                                                                ...newKey,
                                                                permissions: {
                                                                    ...newKey.permissions,
                                                                    auth: {
                                                                        ...newKey.permissions.auth,
                                                                        unlink: checked
                                                                    }
                                                                }
                                                            })
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t">
                                <Button onClick={handleCreate}>Create API Key</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Created By</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : apiKeys.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                                No API keys found
                            </TableCell>
                        </TableRow>
                    ) : (
                        apiKeys.map(key => (
                            <TableRow key={key.id}>
                                <TableCell>{key.name}</TableCell>
                                <TableCell className="font-mono">{key.key}</TableCell>
                                <TableCell>{key.creator?.name || key.creator?.email || "—"}</TableCell>
                                <TableCell>{new Date(key.createdAt).toLocaleString()}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={key.enabled}
                                        onCheckedChange={checked => handleToggle(key.id, checked)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(key.id)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
} 