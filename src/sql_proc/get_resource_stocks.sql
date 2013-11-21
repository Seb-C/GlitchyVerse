-- Returns stocks of the spaceship
-- @param INTEGER :spaceship_id The id of the spaceship
SELECT
	resource_type_id,
	resource_stock
FROM resource
WHERE spaceship_id = :spaceship_id