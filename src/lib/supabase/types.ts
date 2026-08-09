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
export type AgentStatus = Enums["agent_status"];

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

/** Host consent flags. Separate from EventSettings: consent is withdrawable and audited. */
export type EventPermissions = {
  showcase_consent?: boolean;
  showcase_anonymise?: boolean;
};

export type ShowcaseConsentRow = {
  id: string;
  event_id: string;
  profile_id: string | null;
  granted: boolean;
  anonymise: boolean;
  consent_text: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
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
  /** Taps on the "Made with Amantrika" badge on this invitation. */
  badge_clicks: number;
};

export type AgentStats = {
  events_total: number;
  events_published: number;
  orders_paid: number;
  gross_inr: number;
  earned_inr: number;
  unpaid_inr: number;
};

export type AdminOverview = {
  profiles_total: number;
  profiles_7d: number;
  hosts: number;
  agents_total: number;
  agents_pending: number;
  events_total: number;
  events_published: number;
  events_draft: number;
  events_7d: number;
  revenue_inr: number;
  revenue_30d_inr: number;
  orders_paid: number;
  commission_owed_inr: number;
  showcase_live: number;
  showcase_eligible: number;
  guests_total: number;
  rsvps_total: number;
  views_total: number;
};

export type AdminDailyPoint = {
  day: string;
  signups: number;
  invites: number;
  revenue_inr: number;
  views: number;
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
  permissions: EventPermissions;
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

/**
 * `atheme` — declared here instead of coming from generation, and **only until
 * the migration is applied**.
 *
 * `supabase/migrations/20260809093641_atheme_gallery.sql` has not been pushed.
 * Verified against the live database, which answers `PGRST205: Could not find
 * the table 'public.atheme'`. Generation reads the live schema, so the table is
 * absent from `types.generated.ts`, `supabase.from("atheme")` does not typecheck
 * and **the whole project failed to build** — nothing could be deployed at all,
 * including work unrelated to this feature.
 *
 * Declaring it through the same `Replace` layer the jsonb columns use is the
 * least-bad unblock: the shape is transcribed from that migration's DDL, it sits
 * in one place rather than as casts at each call site, and the query builder,
 * `Row<"atheme">` and every caller then behave exactly as they will once the
 * table is real.
 *
 * **This block is temporary.** Apply the migration, run the `supabase gen types`
 * command at the top of this file, then delete it — leaving it in place means a
 * schema and a type that can drift with nothing to catch it. Until then the
 * gallery is empty at runtime and `getCachedAthemes` logs why.
 */
type AthemeTable = {
  Row: {
    id: string;
    name: string;
    image_path: string;
    render_theme_id: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
  };
  Insert: {
    id: string;
    name: string;
    image_path: string;
    render_theme_id: string;
    is_active?: boolean;
    sort_order?: number;
    created_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    image_path?: string;
    render_theme_id?: string;
    is_active?: boolean;
    sort_order?: number;
    created_at?: string;
  };
  Relationships: [];
};

type Functions = Generated["public"]["Functions"];

/** The two roll-up RPCs return jsonb; give callers the real object. */
type RefinedFunctions = Replace<
  Functions,
  {
    event_stats: Replace<Functions["event_stats"], { Returns: EventStats }>;
    agent_stats: Replace<Functions["agent_stats"], { Returns: AgentStats }>;
    admin_overview: Replace<Functions["admin_overview"], { Returns: AdminOverview }>;
  }
>;

export type Database = Replace<
  Generated,
  {
    public: Replace<
      Generated["public"],
      {
        Tables: Replace<Tables, { events: EventsTable; plans: PlansTable; atheme: AthemeTable }>;
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
export type ThemeRow = Row<"themes">;
/** Gates which themes a plan may choose — never what an invitation can do. */
export type ThemeTier = ThemeRow["tier"];
/**
 * A gallery card, not a renderable theme. Display only — `render_theme_id` is
 * what an invitation is actually built with. See `src/lib/themes/atheme.ts`.
 */
export type AthemeRow = Row<"atheme">;
export type OrderRow = Row<"orders">;
export type CommissionRow = Row<"commissions">;
export type ShowcaseConsent = Row<"showcase_consents">;
export type AdminAllowlistRow = Row<"admin_allowlist">;
