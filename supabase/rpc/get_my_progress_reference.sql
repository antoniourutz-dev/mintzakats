-- Referencia: contrato esperado de get_my_progress
--
-- Causa habitual de KPIs 0/140 y 0/7 con historial visible:
-- el frontend leía week_points / week_days_completed pero la RPC
-- devolvía weekly_score / days_completed.
--
-- La RPC debe devolver un único objeto JSON con estos campos:

/*
{
  "weekly_score": 13,
  "weekly_maximum": 140,
  "days_completed": 1,
  "current_streak": 1,
  "best_daily_score": 13,
  "last_played_at": "2026-06-28T10:30:00+02:00",
  "current_rank": 5,
  "today_status": "completed",
  "today_score": 13,
  "today_total": 20,
  "history": [
    {
      "game_date": "2026-06-28",
      "score": 13,
      "total": 20,
      "status": "completed",
      "completed_at": "2026-06-28T10:30:00+02:00"
    }
  ]
}
*/

-- Ejemplo de cálculo semanal (domingo 00:00 Europe/Madrid):

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
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  v_today := (timezone('Europe/Madrid', now()))::date;
  -- Match client getGameDayInfo(): before 00:01 Madrid counts as previous game day.
  if extract(hour from timezone('Europe/Madrid', now())) = 0
     and extract(minute from timezone('Europe/Madrid', now())) < 1 then
    v_today := v_today - interval '1 day';
  end if;
  -- Weekly cycle starts on Sunday (Europe/Madrid), not ISO Monday.
  v_week_start := v_today - ((extract(dow from timezone('Europe/Madrid', now())))::integer);

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
  end, g.score
  into v_today_status, v_today_score
  from ranked_games g
  where g.user_id = v_user_id and g.game_date = v_today
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
    'current_streak', 0, -- Prefer client-side streak from completed history in current week
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

-- RPCs admin adicionales requeridas por el panel docente:
-- admin_get_week_challenge_plan()
-- admin_get_day_challenge_questions(p_game_date date)
-- admin_get_player_progress_debug(p_player_id uuid)
