create index booking_items_service_item_idx on public.booking_items(service_item_id);
create index booking_status_history_actor_idx on public.booking_status_history(actor_id);
create index bookings_accepted_by_idx on public.bookings(accepted_by);
create index bookings_rejected_by_idx on public.bookings(rejected_by);
create index commission_ledger_professional_idx on public.commission_ledger(professional_id);
create index whatsapp_events_booking_idx on public.whatsapp_events(booking_id);