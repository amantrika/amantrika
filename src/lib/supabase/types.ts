/**
 * The app's view of the database.
 *
 * `types.generated.ts` is produced from the live schema and is the source of
 * truth for column names and nullability:
 *
 *   supabase gen types typescript --linked > src/lib/supabase/types.generated.ts
 *
 * Regenerate it after every migration. This file layers back the two things
 * generation cannot express:
 *   1. jsonb columns arrive as `Json`; we know their actual shape.
 *   2. RPCs returning jsonb arrive as `Json`; likewise.
 */
import type { Database as Generated, Json } from "./types.generated";

export type { Json };

/* ------------------------------------------------------------------ enums */

type Enums = Generated["public"]["Enums"];

export type UserRole = Enums["user_role"];
export type EventStatus = Enums["event_status"];
export type EventType = Enums["event_type"];
export type RsvpStatus = Enums["rsvp_status"];
export type OrderStatus = Enums["order_status"];
export type CommissionStatus = Enums["commission_status"];
export type AssetKind = Enums["asset_kind"];

/* ------------------------------------------------- shapes behind the jsonb */

/** One party to the celebration. Two for a wedding, one for a birthday, N for corporate. */
export type EventHost = {
  name: string;
  family?: string;
  role?: string;
};

export type StoryMoment = {
  title: string;
  text: string;
};

export type Hotel = {
  name: string;
  distance: string;
  phone: string;
};

export type EventSettings = {
  rsvpEnabled?: boolean;
  blessingsEnabled?: boolean;
  moderateBlessings?: boolean;
  showCountdown?: boolean;
  musicAssetId?: string | null;
};

export type EventStats = {
  total_views: number;
  unique_viewers: number;
  views_7d: number;
  guests: number;
  rsvp_yes: number;
  rsvp_no: number;
  rsvp_maybe: number;
  blessings: number;
};

export type AgentStats = {
  events_total: number;
  events_published: number;
  orders_paid: number;
  gross_inr: number;
  earned_inr: number;
  unpaid_inr: number;
};

export type ViewsByDay = {
  day: string;
  views: number;
  uniques: number;
};

/* -------------------------------------------------------------- overriding */

type Replace<T, R> = Omit<T, keyof R> & R;

type Tables = Generated["public"]["Tables"];

/** The jsonb columns on `events`, narrowed from Json to their real shapes. */
type EventJson = {
  hosts: EventHost[];
  story_moments: StoryMoment[];
  hotels: Hotel[];
  settings: EventSettings;
};

type EventsTable = Replace<
  Tables["events"],
  {
    Row: Replace<Tables["events"]["Row"], EventJson>;
    Insert: Replace<Tables["events"]["Insert"], Partial<EventJson>>;
    Update: Replace<Tables["events"]["Update"], Partial<EventJson>>;
  }
>;

type PlansTable = Replace<
  Tables["plans"],
  {
    Row: Replace<Tables["plans"]["Row"], { features: string[] }>;
    Insert: Replace<Tables["plans"]["Insert"], { features?: string[] }>;
    Update: Replace<Tables["plans"]["Update"], { features?: string[] }>;
  }
>;

type Functions = Generated["public"]["Functions"];

/** The two roll-up RPCs return jsonb; give callers the real object. */
type RefinedFunctions = Replace<
  Functions,
  {
    event_stats: Replace<Functions["event_stats"], { Returns: EventStats }>;
    agent_stats: Replace<Functions["agent_stats"], { Returns: AgentStats }>;
  }
>;

export type Database = Replace<
  Generated,
  {
    public: Replace<
      Generated["public"],
      {
        Tables: Replace<Tables, { events: EventsTable; plans: PlansTable }>;
        Functions: RefinedFunctions;
      }
    >;
  }
>;

/* ----------------------------------------------------------- row shorthands */

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Row<"profiles">;
export type Agent = Row<"agents">;
export type EventRow = Row<"events">;
export type SubEventRow = Row<"sub_events">;
export type GuestRow = Row<"guests">;
export type RsvpRow = Row<"rsvps">;
export type BlessingRow = Row<"blessings">;
export type AssetRow = Row<"assets">;
export type PlanRow = Row<"plans">;
export type OrderRow = Row<"orders">;
export type CommissionRow = Row<"commissions">;
