-- Removes an object from the database
-- After calling this procedure, the deleted rows number should be tested
-- to check if delete has been allowed or not.
-- @param INTEGER :object_id The id of the object to remove
-- @param INTEGER :spaceship_id The id of the spaceship
DELETE FROM object
WHERE object_id = :object_id
AND spaceship_id = :spaceship_id

-- If object is a container, checking that there is not an object inside it
AND (
	object_type_id NOT IN (
		SELECT object_type_id
		FROM object_type
		WHERE object_type_is_container = 1
	) OR (
		SELECT COUNT(*)
		FROM object AS o
		NATURAL INNER JOIN object_type
		WHERE object.spaceship_id = o.spaceship_id
		AND object_type_is_inside = 1
		AND NOT (
			o.object_position_x > (object.object_position_x + object.object_size_x - 1)
			OR (o.object_position_x + o.object_size_x - 1) < object.object_position_x
		) AND NOT (
			o.object_position_y > (object.object_position_y + object.object_size_y - 1)
			OR (o.object_position_y + o.object_size_y - 1) < o.object_position_y
		) AND NOT (
			o.object_position_z > (object.object_position_z + object.object_size_z - 1)
			OR (o.object_position_z + o.object_size_z - 1) < o.object_position_z
		)
	) = 0
)