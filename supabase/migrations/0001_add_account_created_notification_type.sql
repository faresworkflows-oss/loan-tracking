-- Run this in the Supabase SQL Editor.
-- Adds "account_created" as a valid notifications_log.type, for the
-- welcome SMS sent when an admin creates a new borrower account.

alter table notifications_log drop constraint notifications_log_type_check;

alter table notifications_log
  add constraint notifications_log_type_check
  check (type in ('payment_received', 'reminder', 'overdue', 'account_created'));
