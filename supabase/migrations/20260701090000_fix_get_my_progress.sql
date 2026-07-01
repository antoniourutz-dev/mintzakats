-- Apply in Supabase SQL editor to align get_my_progress with the client game week.
-- Weekly cycle: Sunday 00:00 Europe/Madrid. Game day rolls at 00:01.

create or replace function public.get_my_progress()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_week_start date;
  v_weekly_score integer;
  v_days_completed integer;
  v_best_daily integer;
  v_last_played timestamptz;
  v_today date;
  v_today_status text;
  v_today_score integer;
  v_history jsonb;
  v_madrid_now timestamptz := timezone('Europe/Madrid', now());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_today := v_madrid_now::date;
  if extract(hour from v_madrid_now) = 0 and extract(minute from v_madrid_now) < 1 then
    v_today := v_today - interval '1 day';
  end if;

  v_week_start := v_today - (extract(dow from v_madrid_now)::integer);

  select
    coalesce(sum(case when g.status = 'completed' then g.score else 0 end), 0),
    coalesce(count(distinct g.game_date) filter (where g.status = 'completed'), 0),
    max(case when g.status = 'completed' then g.score end),
    max(coalesce(g.completed_at, g.started_at))
  into v_weekly_score, v_days_completed, v_best_daily, v_last_played
  from ranked_games g
  where g.user_id = v_user_id
    and g.game_date >= v_week_start
    and g.game_date < v_week_start + interval '7 days';

  select case
    when g.status = 'completed' then 'completed'
    when g.status = 'started' then 'in_progress'
    else 'not_started'
  end,
  g.score
  into v_today_status, v_today_score
  from ranked_games g
  where g.user_id = v_user_id
    and (
      g.game_date = v_today
      or timezone('Europe/Madrid', coalesce(g.completed_at, g.started_at))::date = v_today
    )
  order by case when g.status = 'completed' then 0 else 1 end, g.completed_at desc nulls last
  limit 1;

  if not found then
    v_today_status := 'not_started';
    v_today_score := null;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'game_date', g.game_date,
      'score', g.score,
      'total', 20,
      'status', g.status,
      'completed_at', g.completed_at
    ) order by g.game_date desc
  ), '[]'::jsonb)
  into v_history
  from ranked_games g
  where g.user_id = v_user_id;

  return jsonb_build_object(
    'weekly_score', v_weekly_score,
    'weekly_maximum', 140,
    'days_completed', v_days_completed,
    'current_streak', 0,
    'best_daily_score', v_best_daily,
    'last_played_at', v_last_played,
    'current_rank', null,
    'today_status', v_today_status,
    'today_score', v_today_score,
    'today_total', 20,
    'history', v_history
  );
end;
$$;
