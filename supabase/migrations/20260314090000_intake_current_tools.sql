-- v1.76.0: Add optional current_tools field to lead_details
alter table lead_details add column if not exists current_tools text null;
