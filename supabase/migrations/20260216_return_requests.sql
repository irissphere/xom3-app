-- Return requests table
CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  email text NOT NULL,
  reason text NOT NULL,
  details text,
  items jsonb,
  status text NOT NULL DEFAULT 'pending',
  total_cents bigint NOT NULL DEFAULT 0,
  admin_notes text,
  refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_email ON return_requests(email);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(status);
