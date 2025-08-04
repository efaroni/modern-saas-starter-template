-- After signing up in Clerk, get your user ID from the Clerk dashboard
-- and run this script with your actual Clerk user ID and email

INSERT INTO users (id, email) 
VALUES ('YOUR_CLERK_USER_ID', 'your-email@example.com')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, updated_at = CURRENT_TIMESTAMP;