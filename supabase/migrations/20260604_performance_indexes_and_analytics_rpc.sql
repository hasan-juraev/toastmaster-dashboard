-- =============================================================
-- Performance: Add missing indexes on hot columns
-- =============================================================

create index if not exists meeting_roles_meeting_id_idx       on meeting_roles (meeting_id);
create index if not exists meeting_roles_member_id_idx        on meeting_roles (member_id);
create index if not exists meeting_roles_status_idx           on meeting_roles (status);
create index if not exists speeches_meeting_id_idx            on speeches (meeting_id);
create index if not exists speeches_completed_idx             on speeches (completed);
create index if not exists speeches_meeting_completed_idx     on speeches (meeting_id, completed);
create index if not exists ah_counter_meeting_id_idx          on ah_counter_reports (meeting_id);
create index if not exists grammarian_meeting_id_idx          on grammarian_reports (meeting_id);
create index if not exists evaluator_meeting_id_idx           on evaluator_reports (meeting_id);
create index if not exists timer_meeting_id_idx               on timer_reports (meeting_id);
create index if not exists votes_meeting_id_idx               on votes (meeting_id);
create index if not exists speech_comments_speech_id_idx      on speech_comments (speech_id);

-- =============================================================
-- Analytics RPC: replace 8 separate client queries with one
-- server-side aggregation. Returns a JSON object matching the
-- AnalyticsData TypeScript interface (minus role colors, which
-- are a UI concern and added client-side).
-- =============================================================

create or replace function get_analytics()
returns json language plpgsql security definer stable as $$
declare
  v_speeches_delivered  bigint;
  v_total_speeches      bigint;
  v_total_roles         bigint;
  v_completed_roles     bigint;
  v_result              json;
begin
  select
    count(*) filter (where completed = true),
    count(*)
  into v_speeches_delivered, v_total_speeches
  from speeches;

  select
    count(*),
    count(*) filter (where status = 'completed')
  into v_total_roles, v_completed_roles
  from meeting_roles;

  select json_build_object(

    'speechesDelivered',    v_speeches_delivered,
    'totalSpeechesPlanned', v_total_speeches,
    'speakerCompletionRate',
      case when v_total_speeches = 0 then 0
      else round(v_speeches_delivered::numeric / v_total_speeches * 100) end,

    'totalRoles',           v_total_roles,

    'fillerWordAvg', (
      select coalesce(round(avg(ah_count)::numeric, 1), 0)
      from ah_counter_reports where ah_count is not null
    ),
    'fillerReportsLogged',  (select count(*) from ah_counter_reports),

    'roleCompletionRate',
      case when v_total_roles = 0 then 0
      else round(v_completed_roles::numeric / v_total_roles * 100) end,

    -- Last 6 complete calendar months (server UTC)
    'monthlySpeechData', (
      with months as (
        select generate_series(
          date_trunc('month', now() at time zone 'UTC') - interval '5 months',
          date_trunc('month', now() at time zone 'UTC'),
          '1 month'::interval
        ) as month_start
      ),
      speech_counts as (
        select
          date_trunc('month', m.date::timestamptz at time zone 'UTC') as month_start,
          count(s.id) as cnt
        from speeches s
        join meetings m on m.id = s.meeting_id
        where s.completed = true
          and m.date >= (
            date_trunc('month', now() at time zone 'UTC') - interval '5 months'
          )::date
        group by 1
      )
      select coalesce(json_agg(
        json_build_object(
          'month', to_char(mo.month_start, 'Mon'),
          'count', coalesce(sc.cnt, 0)
        ) order by mo.month_start
      ), '[]'::json)
      from months mo
      left join speech_counts sc on sc.month_start = mo.month_start
    ),

    -- Role distribution (name + count only; colors added client-side)
    'roleDistribution', (
      select coalesce(json_agg(
        json_build_object('name', name, 'count', cnt) order by cnt desc
      ), '[]'::json)
      from (
        select r.name, count(mr.id) as cnt
        from roles r
        join meeting_roles mr on mr.role_id = r.id
        group by r.name
      ) sub
    ),

    -- Role status counts (mirrors TypeScript normalisation: null → assigned)
    'roleStatusCounts', (
      select json_build_object(
        'assigned',   count(*) filter (
          where status is null
             or status not in ('completed', 'in_progress', 'skipped')
        ),
        'inProgress', count(*) filter (where status = 'in_progress'),
        'completed',  count(*) filter (where status = 'completed'),
        'skipped',    count(*) filter (where status = 'skipped')
      )
      from meeting_roles
    ),

    -- Top 6 members by completed roles
    'memberRoleProgress', (
      select coalesce(json_agg(
        json_build_object(
          'memberName',        member_name,
          'rolesCompleted',    roles_completed,
          'distinctRoleCount', distinct_role_count,
          'topRole',           coalesce(top_role, 'No role yet')
        ) order by roles_completed desc, distinct_role_count desc
      ), '[]'::json)
      from (
        select
          m.name as member_name,
          count(*) filter (where mr.status = 'completed')  as roles_completed,
          count(distinct mr.role_id)                        as distinct_role_count,
          (
            select r2.name
            from meeting_roles mr2
            join roles r2 on r2.id = mr2.role_id
            where mr2.member_id = m.id
            group by r2.id, r2.name
            order by count(*) desc
            limit 1
          ) as top_role
        from members m
        join meeting_roles mr on mr.member_id = m.id
        group by m.id, m.name
        order by roles_completed desc, distinct_role_count desc
        limit 6
      ) sub
    ),

    'grammarianStats', (
      select json_build_object(
        'reportsLogged',     count(*),
        'avgErrors',         coalesce(round(avg(grammar_errors)::numeric, 1), 0),
        'avgScore',          coalesce(round(avg(score)::numeric, 1), 0),
        'notablePhrasesAvg', coalesce(round(avg(notable_phrases)::numeric, 1), 0)
      )
      from grammarian_reports
    ),

    'evaluatorStats', (
      select json_build_object(
        'reportsLogged', count(*),
        'avgQuality',    coalesce(round(avg(quality_score)::numeric, 1), 0)
      )
      from evaluator_reports
    ),

    'timerStats', (
      with deltas as (
        select abs(actual_seconds - target_seconds) as delta
        from timer_reports
        where actual_seconds is not null and target_seconds is not null
      )
      select json_build_object(
        'reportsLogged', (select count(*) from timer_reports),
        'avgDelta',      coalesce(round(avg(delta)::numeric, 1), 0),
        'onTimeRate',
          case when count(*) = 0 then 0
          else round(
            count(*) filter (where delta <= 15)::numeric / count(*) * 100
          ) end
      )
      from deltas
    ),

    'facilitatorStats', (
      select json_build_object(
        'avgScore',            coalesce(round(avg(score::numeric), 1), 0),
        'toastmasterAvg',      coalesce(
          round(avg(score::numeric) filter (where role_name = 'Toastmaster'), 1), 0
        ),
        'generalEvaluatorAvg', coalesce(
          round(avg(score::numeric) filter (where role_name = 'General Evaluator'), 1), 0
        )
      )
      from (
        select mr.score, r.name as role_name
        from meeting_roles mr
        join roles r on r.id = mr.role_id
        where r.name in ('Toastmaster', 'General Evaluator')
          and mr.score is not null
      ) sub
    )

  ) into v_result;

  return v_result;
end;
$$;
