/**
 * Hand-written to mirror supabase/migrations. Replace with generated types once the
 * project is linked:
 *   supabase gen types typescript --linked > src/lib/supabase/types.ts
 */

export type UserRole = "host" | "agent" | "admin";
export type EventStatus = "draft" | "published" | "archived";
export type RsvpStatus = "yes" | "no" | "maybe" | "pending";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";
export type CommissionStatus = "accrued" | "payable" | "paid" | "void";
export type AssetKind = "photo" | "audio" | "video" | "logo" | "document";

export type EventType =
  | "wedding"
  | "engagement"
  | "reception"
  | "anniversary"
  | "birthday"
  | "baby_shower"
  | "naming"
  | "housewarming"
  | "graduation"
  | "corporate"
  | "other";

/** One party to the celebration. Two for a wedding, one for a birthday, N for corporate. */
export type EventHost = {
  name: string;
  family?: string;
  role?: string;
}

export type StoryMoment = {
  title: string;
  text: string;
}

export type Hotel = {
  name: string;
  distance: string;
  phone: string;
}

export type EventSettings = {
  rsvpEnabled?: boolean;
  blessingsEnabled?: boolean;
  moderateBlessings?: boolean;
  showCountdown?: boolean;
  musicAssetId?: string | null;
}

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export type Agent = {
  id: string;
  agency_name: string | null;
  referral_code: string;
  commission_rate: number;
  payout_upi: string | null;
  is_active: boolean;
  created_at: string;
}

export type EventRow = {
  id: string;
  slug: string;
  owner_id: string;
  agent_id: string | null;
  event_type: EventType;
  status: EventStatus;
  theme_id: string;
  title: string;
  hosts: EventHost[];
  hashtag: string | null;
  main_datetime: string | null;
  timezone: string;
  city: string | null;
  cover_asset_id: string | null;
  story: string | null;
  story_moments: StoryMoment[];
  hotels: Hotel[];
  settings: EventSettings;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubEventRow = {
  id: string;
  event_id: string;
  key: string;
  name: string;
  starts_at: string | null;
  time_label: string | null;
  venue: string | null;
  address: string | null;
  map_url: string | null;
  dress_code: string | null;
  sort_order: number;
  created_at: string;
}

export type GuestRow = {
  id: string;
  event_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  side: string | null;
  guest_group: string | null;
  headcount: number;
  meal: string | null;
  invited_keys: string[];
  status: RsvpStatus;
  invite_token: string;
  created_at: string;
}

export type RsvpRow = {
  id: string;
  event_id: string;
  guest_id: string | null;
  guest_name: string;
  attending: RsvpStatus;
  headcount: number;
  sub_event_keys: string[];
  meal: string | null;
  message: string | null;
  created_at: string;
}

export type BlessingRow = {
  id: string;
  event_id: string;
  name: string;
  message: string;
  is_approved: boolean;
  created_at: string;
}

export type AssetRow = {
  id: string;
  event_id: string;
  uploaded_by: string | null;
  kind: AssetKind;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

export type PlanRow = {
  code: string;
  name: string;
  price_inr: number;
  description: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export type OrderRow = {
  id: string;
  event_id: string;
  buyer_id: string;
  agent_id: string | null;
  plan_code: string;
  amount_inr: number;
  status: OrderStatus;
  provider: string;
  provider_ref: string | null;
  created_at: string;
  paid_at: string | null;
}

export type CommissionRow = {
  id: string;
  order_id: string;
  agent_id: string;
  rate: number;
  amount_inr: number;
  status: CommissionStatus;
  created_at: string;
  paid_at: string | null;
}

export type EventStats = {
  total_views: number;
  unique_viewers: number;
  views_7d: number;
  guests: number;
  rsvp_yes: number;
  rsvp_no: number;
  rsvp_maybe: number;
  blessings: number;
}

export type AgentStats = {
  events_total: number;
  events_published: number;
  orders_paid: number;
  gross_inr: number;
  earned_inr: number;
  unpaid_inr: number;
}

export type ViewsByDay = {
  day: string;
  views: number;
  uniques: number;
}

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      agents: Table<Agent>;
      events: Table<EventRow>;
      sub_events: Table<SubEventRow>;
      guests: Table<GuestRow>;
      rsvps: Table<RsvpRow>;
      blessings: Table<BlessingRow>;
      assets: Table<AssetRow>;
      plans: Table<PlanRow>;
      orders: Table<OrderRow>;
      commissions: Table<CommissionRow>;
    };
    Views: Record<never, never>;
    Functions: {
      record_page_view: {
        Args: {
          p_slug: string;
          p_visitor_hash?: string | null;
          p_referrer?: string | null;
          p_country?: string | null;
          p_city?: string | null;
          p_guest_token?: string | null;
        };
        Returns: void;
      };
      event_views_by_day: { Args: { p_event_id: string; p_days?: number }; Returns: ViewsByDay[] };
      event_stats: { Args: { p_event_id: string }; Returns: EventStats };
      agent_stats: { Args: { p_agent_id: string }; Returns: AgentStats };
    };
    Enums: {
      user_role: UserRole;
      event_status: EventStatus;
      event_type: EventType;
      rsvp_status: RsvpStatus;
      order_status: OrderStatus;
      commission_status: CommissionStatus;
      asset_kind: AssetKind;
    };
    CompositeTypes: Record<never, never>;
  };
}
