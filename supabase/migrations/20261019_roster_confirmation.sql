-- Confirmation is a broker attestation bound to the exact roster, count and offices.
-- An edited roster invalidates the signature automatically. Existing setups remain drafts.
ALTER TABLE public.eyeonads_brokerage_setups ADD COLUMN IF NOT EXISTS roster_confirmation jsonb;
