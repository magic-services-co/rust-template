import config from "../../config.json";

export interface SupportField {
    id: number | string;
    label: string;
    key: string;
    type: string;
    required: boolean;
    order: number;
    stepId: number | string;
    options?: Record<string, unknown> | null;
}

export interface SupportStep {
    id: number | string;
    name: string;
    order: number;
    categoryId: string;
    fields: SupportField[];
}

export interface SupportCategory {
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    order: number | null;
    maxTicketsPerUser?: number | null;
    ticketCooldownMinutes?: number | null;
    maxTicketsPerCooldown?: number | null;
    steps: SupportStep[];
}

export interface CreateTicketRequest {
    categorySlug: string;
    discordUserId: string;
    guildId: string;
    channelId: string;
    answers?: Record<string, string>;
}

export interface CreateTicketResponse {
    id?: string | number;
    ticketId?: string | number;
    slug?: string;
}

export interface TicketMessagePayload {
    content: string;
    discordUserId: string;
    attachments?: string[];
    metadata?: Record<string, unknown>;
}

export interface OutboundTicketReply {
    id: number;
    ticketId: number;
    content: string;
    channelId: string;
    guildId: string;
    discordUserId?: string | null;
    userName?: string | null;
}

export interface CloseTicketRequest {
    ticketId?: string | null;
    channelId?: string | null;
    discordUserId?: string | null;
    categorySlug?: string | null;
}

export interface CloseTicketResult {
    success: boolean;
    reason?: string;
    ticketId?: string;
}

const SUPPORT_ENDPOINT = cleanJoin(config.API_ENDPOINT, "/support");
const TICKET_MESSAGES_BASE = cleanJoin(config.API_ENDPOINT, "/bot/tickets");

function cleanJoin(base: string, path: string): string {
    return `${base.replace(/\/$/, "")}${path}`;
}

function jsonHeaders(includeContentType = true): Headers {
    const headers = new Headers();
    headers.set("x-api-key", config.API_KEY);
    if (includeContentType) {
        headers.set("Content-Type", "application/json");
    }
    return headers;
}

export class TicketApi {
    private static categoryCache: {
        fetchedAt: number;
        categories: SupportCategory[];
    } | null = null;

    static async fetchCategories(force = false): Promise<SupportCategory[]> {
        if (!force && this.categoryCache && Date.now() - this.categoryCache.fetchedAt < 60_000) {
            return this.categoryCache.categories;
        }

        try {
            const res = await fetch(SUPPORT_ENDPOINT, {
                method: "GET",
                headers: jsonHeaders(false),
                signal: AbortSignal.timeout(15_000),
            });

            if (!res.ok) {
                console.error(
                    `[${new Date().toISOString()}] Failed to fetch support categories: ${res.status} ${res.statusText}`,
                );
                return [];
            }

            const categories = (await res.json()) as SupportCategory[];
            if (!Array.isArray(categories)) {
                console.error(`[${new Date().toISOString()}] Invalid categories payload from /support`, categories);
                return [];
            }

            this.categoryCache = {
                fetchedAt: Date.now(),
                categories,
            };

            return categories;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching support categories`, error);
            return [];
        }
    }

    static async createTicket(request: CreateTicketRequest): Promise<string | null> {
        try {
            const payload = {
                categoryId: request.categorySlug,
                discordUserId: request.discordUserId,
                content: {
                    summary: "Submitted via Discord bot",
                    guildId: request.guildId,
                    channelId: request.channelId,
                    ...(request.answers ?? {}),
                },
            };

            const res = await fetch(SUPPORT_ENDPOINT, {
                method: "POST",
                headers: jsonHeaders(true),
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(15_000),
            });

            if (!res.ok) {
                console.error(
                    `[${new Date().toISOString()}] Failed to create ticket for ${request.discordUserId}: ${res.status} ${res.statusText}`,
                );
                return null;
            }

            const responseBody = (await res.json().catch(() => null)) as CreateTicketResponse | null;
            const ticketId = responseBody?.ticketId ?? responseBody?.id;
            return ticketId ? String(ticketId) : null;
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error creating ticket for ${request.discordUserId}`, error);
            return null;
        }
    }

    static async postMessage(ticketId: string, payload: TicketMessagePayload): Promise<void> {
        if (!ticketId) {
            return;
        }

        try {
            const body = {
                ...payload,
                metadata: {
                    ...(payload.metadata ?? {}),
                    discordUserId: payload.discordUserId,
                },
            };

            const endpoint = cleanJoin(TICKET_MESSAGES_BASE, `/${encodeURIComponent(ticketId)}/messages`);
            const res = await fetch(endpoint, {
                method: "POST",
                headers: jsonHeaders(true),
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                console.error(
                    `[${new Date().toISOString()}] Failed to post ticket message for ${ticketId}: ${res.status} ${res.statusText}`,
                );
            }
        } catch (error) {
            console.error(
                `[${new Date().toISOString()}] Error posting ticket message for ${ticketId}`,
                error,
            );
        }
    }

    static async fetchOutboundReplies(): Promise<OutboundTicketReply[]> {
        try {
            const endpoint = cleanJoin(TICKET_MESSAGES_BASE, "/outbound");
            const res = await fetch(endpoint, {
                method: "GET",
                headers: jsonHeaders(false),
                signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) {
                console.error(
                    `[${new Date().toISOString()}] Failed to fetch website ticket replies: ${res.status} ${res.statusText}`,
                );
                return [];
            }
            const body = (await res.json()) as OutboundTicketReply[];
            return Array.isArray(body) ? body : [];
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching website ticket replies`, error);
            return [];
        }
    }

    static async claimOutboundReplies(ids: number[]): Promise<number[]> {
        if (ids.length === 0) {
            return [];
        }
        try {
            const endpoint = cleanJoin(TICKET_MESSAGES_BASE, "/outbound/ack");
            const res = await fetch(endpoint, {
                method: "POST",
                headers: jsonHeaders(true),
                body: JSON.stringify({ ids }),
                signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) {
                console.error(
                    `[${new Date().toISOString()}] Failed to claim website ticket replies: ${res.status} ${res.statusText}`,
                );
                return [];
            }
            const body = (await res.json()) as { ids?: number[] };
            return Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error claiming website ticket replies`, error);
            return [];
        }
    }

    static async releaseOutboundReplies(ids: number[]): Promise<void> {
        if (ids.length === 0) {
            return;
        }
        try {
            const endpoint = cleanJoin(TICKET_MESSAGES_BASE, "/outbound/release");
            const res = await fetch(endpoint, {
                method: "POST",
                headers: jsonHeaders(true),
                body: JSON.stringify({ ids }),
                signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) {
                console.error(
                    `[${new Date().toISOString()}] Failed to release website ticket replies: ${res.status} ${res.statusText}`,
                );
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error releasing website ticket replies`, error);
        }
    }

    static async closeTicket(request: CloseTicketRequest): Promise<CloseTicketResult> {
        const ticketId = request.ticketId?.trim() || null;
        try {
            const endpoint = cleanJoin(TICKET_MESSAGES_BASE, "/close");
            const res = await fetch(endpoint, {
                method: "POST",
                headers: jsonHeaders(true),
                body: JSON.stringify({
                    ticketId,
                    channelId: request.channelId ?? null,
                    discordUserId: request.discordUserId ?? null,
                    categorySlug: request.categorySlug ?? null,
                }),
                signal: AbortSignal.timeout(15_000),
            });

            const body = (await res.json().catch(() => null)) as {
                success?: boolean;
                reason?: string;
                ticketId?: string | number;
            } | null;
            if (res.ok && body?.success) {
                const closedId = body.ticketId ?? ticketId;
                return { success: true, ticketId: closedId ? String(closedId) : undefined };
            }

            const reason =
                typeof body?.reason === "string" && body.reason.trim() !== ""
                    ? body.reason.trim()
                    : `Website returned HTTP ${res.status}.`;
            console.error(
                `[${new Date().toISOString()}] Failed to close website ticket ${ticketId ?? "(no id)"}: ${reason}`,
            );
            return { success: false, reason };
        } catch (error) {
            console.error(
                `[${new Date().toISOString()}] Error closing website ticket ${ticketId ?? "(no id)"}`,
                error,
            );
            return { success: false, reason: "The website could not be reached." };
        }
    }
}

