export interface Ticket {
  id: string;
  status?: string;
  category?: Partial<TicketCategory>;
  updatedAt?: string;
  createdAt?: string;
  user?: { id?: string; name?: string | null; image?: string | null; createdAt?: string; storeId?: string };
  [key: string]: unknown;
}

export interface TicketCategory {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  [key: string]: unknown;
}

export interface CategoryWithId extends TicketCategory {
  id: string;
  steps?: Array<{
    name?: string;
    order?: number;
    fields?: Array<{
      type?: string;
      key?: string;
      options?: Record<string, unknown>;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
}

export interface TicketMessage {
  id?: string;
  userId?: string;
  discordUserId?: string | null;
  user?: { name?: string; image?: string | null };
  createdAt?: string;
  content?: string;
  attachments?: string;
  [key: string]: unknown;
}
