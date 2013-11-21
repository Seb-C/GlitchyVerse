-- Inserts a new object in the database, and checks all constraints.
-- After calling this procedure, the inserted rows number should be tested
-- to check if insert has been allowed or not.
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :type_id The id of the type of the object to insert
-- @param REAL :position_x The X position of the object
-- @param REAL :position_y The Y position of the object
-- @param REAL :position_z The Z position of the object
-- @param REAL :size_x The X size of the object
-- @param REAL :size_y The Y size of the object
-- @param REAL :size_z The Z size of the object
-- @param REAL :rotation_x The X rotation of the object
-- @param REAL :rotation_y The Y rotation of the object
-- @param REAL :rotation_z The Z rotation of the object
INSERT INTO object
SELECT DISTINCT
	NULL AS object_id,
	data.spaceship_id,
	object_type.object_type_id,
	data.object_position_x,
	data.object_position_y,
	data.object_position_z,
	data.object_rotation_x,
	data.object_rotation_y,
	data.object_rotation_z,
	data.object_size_x,
	data.object_size_y,
	data.object_size_z,
	object_type.object_type_default_state
FROM (
	-- Data to save
	SELECT
		:spaceship_id AS spaceship_id,
		:type_id AS type_id,
		:position_x AS object_position_x,
		:position_y AS object_position_y,
		:position_z AS object_position_z,
		:size_x AS object_size_x,
		:size_y AS object_size_y,
		:size_z AS object_size_z,
		:rotation_x AS object_rotation_x,
		:rotation_y AS object_rotation_y,
		:rotation_z AS object_rotation_z
) AS data
INNER JOIN object_type ON object_type.object_type_id = data.type_id
INNER JOIN resource_cost ON resource_cost.object_type_id = data.type_id
INNER JOIN (
	SELECT
		resource_cost.resource_type_id,
		SUM(resource_cost_consumption * object_size_x * object_size_y * object_size_z) AS consumption
	FROM resource_cost
	INNER JOIN object ON resource_cost.object_type_id = object.object_type_id
	WHERE object.spaceship_id = :spaceship_id
	GROUP BY resource_cost.resource_type_id
) AS current_consumption ON current_consumption.resource_type_id = resource_cost.resource_type_id

WHERE (object_type.object_type_rotation_x_allowed_divisions <> 0 OR data.object_rotation_x = 0)
AND   (object_type.object_type_rotation_y_allowed_divisions <> 0 OR data.object_rotation_y = 0)
AND   (object_type.object_type_rotation_z_allowed_divisions <> 0 OR data.object_rotation_z = 0)

AND (
	object_type.object_type_is_sizeable = 1
	OR (
		data.object_size_x = 1
		AND data.object_size_y = 1
		AND data.object_size_z = 1
	)
)

-- Checking coordinates values (must be interers or halfs)
AND (
	(
		-- Gap object --> positions must be integer except one of x or z
		object_type_is_gap = 1
		AND ROUND(data.object_position_y) = data.object_position_y
		AND (
			(
				ROUND(data.object_position_x) = data.object_position_x
				AND ROUND(data.object_position_z + 0.5) = data.object_position_z + 0.5
			) OR (
				ROUND(data.object_position_x + 0.5) = data.object_position_x + 0.5
				AND ROUND(data.object_position_z) = data.object_position_z
			)
		)
	) OR (
		-- Not gap object --> position must be integers
		object_type_is_gap = 0
		AND ROUND(data.object_position_x) = data.object_position_x
		AND ROUND(data.object_position_y) = data.object_position_y
		AND ROUND(data.object_position_z) = data.object_position_z
	)
)

-- Checking : 
-- - If object must be inside, then that there is a container on it's position
-- - If object must be outside, then that there is not a container on it's position
AND (
	object_type_is_inside IS NULL
	OR object_type_is_inside = (
		SELECT CASE WHEN COUNT(*) >= 1 THEN 1 ELSE 0 END
		FROM object
		NATURAL INNER JOIN object_type AS type
		WHERE object.spaceship_id = data.spaceship_id
		AND type.object_type_is_container = 1
		AND NOT (
			data.object_position_x > (object.object_position_x + object.object_size_x - 1)
			OR (data.object_position_x + data.object_size_x - 1) < object.object_position_x
		) AND NOT (
			data.object_position_y > (object.object_position_y + object.object_size_y - 1)
			OR (data.object_position_y + data.object_size_y - 1) < object.object_position_y
		) AND NOT (
			data.object_position_z > (object.object_position_z + object.object_size_z - 1)
			OR (data.object_position_z + data.object_size_z - 1) < object.object_position_z
		)
	)
)

-- Checking if there is no object on this position which have the same value for object_type_is_inside
AND (
	SELECT COUNT(*)
	FROM object
	NATURAL INNER JOIN object_type AS type
	WHERE object.spaceship_id = data.spaceship_id
	AND type.object_type_is_inside = object_type.object_type_is_inside
	AND NOT (
		data.object_position_x > (object.object_position_x + object.object_size_x - 1)
		OR (data.object_position_x + data.object_size_x - 1) < object.object_position_x
	) AND NOT (
		data.object_position_y > (object.object_position_y + object.object_size_y - 1)
		OR (data.object_position_y + data.object_size_y - 1) < object.object_position_y
	) AND NOT (
		data.object_position_z > (object.object_position_z + object.object_size_z - 1)
		OR (data.object_position_z + data.object_size_z - 1) < object.object_position_z
	)
) = 0

-- Checking that resource consumption is > 0 after adding object
AND (
	resource_cost.resource_cost_consumption <= 0
	OR resource_cost.resource_cost_consumption <= -current_consumption.consumption
)