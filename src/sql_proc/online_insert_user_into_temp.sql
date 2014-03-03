-- Inserts a user into temp_online
-- @param INTEGER :user_id The id of the user to insert
-- @param INTEGER :spaceship_id The id of the spaceship used
INSERT INTO temp_online (
	user_id,
	spaceship_id
) VALUES (
	:user_id,
	:spaceship_id
);