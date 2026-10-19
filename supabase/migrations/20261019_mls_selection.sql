-- Identification only; never credentials or an active connection.
ALTER TABLE public.eyeonads_brokerage_setups ADD COLUMN IF NOT EXISTS mls_organizations jsonb NOT NULL DEFAULT '[]'::jsonb;
