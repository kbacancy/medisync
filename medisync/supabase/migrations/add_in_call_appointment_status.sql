-- Add 'in-call' value to appointment_status enum for telehealth active-call tracking
alter type appointment_status add value if not exists 'in-call';
