create policy history_delete_host_or_admin on public.game_history
for delete to authenticated using (host_id = auth.uid() or public.is_admin());