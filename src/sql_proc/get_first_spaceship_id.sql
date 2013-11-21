-- Returns the spaceship_id of the first spaceship of the user
-- @param INTEGER :user_id The id of the user
SELECT MIN(spaceship_id) AS spaceship_id
FROM spaceship
WHERE user_id = :user_id