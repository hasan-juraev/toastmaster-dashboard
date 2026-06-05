-- Atomically nullify all FK references to a member, delete their votes,
-- then delete the member row. Runs inside a single transaction.
create or replace function delete_member(p_member_id uuid)
returns void language plpgsql security definer as $$
begin
  -- Verify caller is admin
  if get_my_club_role() <> 'admin' then
    raise exception 'Only admins can delete members';
  end if;

  -- Nullify all nullable FK references (preserves historical records)
  update meeting_roles      set member_id    = null where member_id    = p_member_id;
  update speeches           set speaker_id   = null where speaker_id   = p_member_id;
  update speeches           set evaluator_id = null where evaluator_id = p_member_id;
  update grammarian_reports set member_id    = null where member_id    = p_member_id;
  update ah_counter_reports set speaker_id   = null where speaker_id   = p_member_id;
  update evaluator_reports  set member_id    = null where member_id    = p_member_id;
  update timer_reports      set member_id    = null where member_id    = p_member_id;
  update speech_comments    set commenter_id = null where commenter_id = p_member_id;
  update profiles           set member_id    = null where member_id    = p_member_id;

  -- votes.voter_id is non-nullable — delete those rows entirely
  delete from votes
  where voter_id = p_member_id or voted_for_member_id = p_member_id;

  -- Delete the member
  delete from members where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;
