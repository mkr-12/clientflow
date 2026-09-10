create table if not exists private.rate_limit_buckets (
  scope text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1),
  updated_at timestamptz not null,
  primary key (scope, key_hash)
);

comment on table private.rate_limit_buckets is
  'Durable fixed-window rate limit state. key_hash stores only a keyed hash; raw client IPs are never persisted.';

revoke all on table private.rate_limit_buckets
  from public, anon, authenticated, service_role;

create or replace function public.consume_public_inquiry_rate_limit(p_key_hash text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_limit constant integer := 5;
  v_window constant interval := interval '10 minutes';
  v_count integer;
  v_window_started_at timestamptz;
begin
  if p_key_hash is null
     or length(p_key_hash) <> 64
     or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_rate_limit_key';
  end if;

  insert into private.rate_limit_buckets as bucket (
    scope,
    key_hash,
    window_started_at,
    request_count,
    updated_at
  ) values (
    'public_inquiry',
    p_key_hash,
    v_now,
    1,
    v_now
  )
  on conflict (scope, key_hash) do update
  set
    window_started_at = case
      when bucket.window_started_at + v_window <= excluded.updated_at
        then excluded.window_started_at
      else bucket.window_started_at
    end,
    request_count = case
      when bucket.window_started_at + v_window <= excluded.updated_at
        then 1
      else least(bucket.request_count + 1, v_limit + 1)
    end,
    updated_at = excluded.updated_at
  returning request_count, window_started_at
    into v_count, v_window_started_at;

  return jsonb_build_object(
    'allowed', v_count <= v_limit,
    'remaining', greatest(v_limit - v_count, 0),
    'reset_at', v_window_started_at + v_window
  );
end;
$$;

revoke all on function public.consume_public_inquiry_rate_limit(text)
  from public, anon, authenticated;

grant execute on function public.consume_public_inquiry_rate_limit(text)
  to service_role;
