-- Inserts a new building in the database, and checks all constraints.
-- After calling this procedure, the inserted rows number should be tested
-- to check if insert has been allowed or not.
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :type_id The id of the type of the building to insert
-- @param REAL :position_x The X position of the building
-- @param REAL :position_y The Y position of the building
-- @param REAL :position_z The Z position of the building
-- @param REAL :size_x The X size of the building
-- @param REAL :size_y The Y size of the building
-- @param REAL :size_z The Z size of the building
-- @param REAL :rotation_x The X rotation of the building
-- @param REAL :rotation_y The Y rotation of the building
-- @param REAL :rotation_z The Z rotation of the building
INSERT INTO building
SELECT DISTINCT
	NULL AS building_id,
	data.spaceship_id,
	building_type.building_type_id,
	data.building_position_x,
	data.building_position_y,
	data.building_position_z,
	data.building_rotation_x,
	data.building_rotation_y,
	data.building_rotation_z,
	data.building_size_x,
	data.building_size_y,
	data.building_size_z,
	building_type.building_type_default_state,
	0 AS building_is_built, -- TODO
	NULL AS building_seed -- TODO
FROM (
	-- Data to save
	SELECT
		:spaceship_id AS spaceship_id,
		:type_id AS type_id,
		:position_x AS building_position_x,
		:position_y AS building_position_y,
		:position_z AS building_position_z,
		:size_x AS building_size_x,
		:size_y AS building_size_y,
		:size_z AS building_size_z,
		:rotation_x AS building_rotation_x,
		:rotation_y AS building_rotation_y,
		:rotation_z AS building_rotation_z
) AS data
INNER JOIN building_type ON building_type.building_type_id = data.type_id

WHERE (building_type.building_type_rotation_x_allowed_divisions <> 0 OR data.building_rotation_x = 0)
AND   (building_type.building_type_rotation_y_allowed_divisions <> 0 OR data.building_rotation_y = 0)
AND   (building_type.building_type_rotation_z_allowed_divisions <> 0 OR data.building_rotation_z = 0)

AND building_type.building_type_category_id IS NOT NULL

AND (
	building_type.building_type_is_sizeable = 1
	OR (
		data.building_size_x = 1
		AND data.building_size_y = 1
		AND data.building_size_z = 1
	)
)

-- Checking coordinates values (must be interers or halfs)
AND (
	(
		-- Gap building --> positions must be integer except one of x or z
		building_type_is_gap = 1
		AND ROUND(data.building_position_y) = data.building_position_y
		AND (
			(
				ROUND(data.building_position_x) = data.building_position_x
				AND ROUND(data.building_position_z + 0.5) = data.building_position_z + 0.5
			) OR (
				ROUND(data.building_position_x + 0.5) = data.building_position_x + 0.5
				AND ROUND(data.building_position_z) = data.building_position_z
			)
		)
	) OR (
		-- Not gap building --> position must be integers
		building_type_is_gap = 0
		AND ROUND(data.building_position_x) = data.building_position_x
		AND ROUND(data.building_position_y) = data.building_position_y
		AND ROUND(data.building_position_z) = data.building_position_z
	)
)

-- Checking : 
-- - If building must be inside, then that there is a container on it's position
-- - If building must be outside, then that there is not a container on it's position
AND (
	building_type_is_inside IS NULL
	OR building_type_is_inside = (
		SELECT CASE WHEN COUNT(*) >= 1 THEN 1 ELSE 0 END
		FROM building
		NATURAL INNER JOIN building_type AS type
		WHERE building.spaceship_id = data.spaceship_id
		AND type.building_type_is_container = 1
		AND NOT (
			data.building_position_x > (building.building_position_x + building.building_size_x - 1)
			OR (data.building_position_x + data.building_size_x - 1) < building.building_position_x
		) AND NOT (
			data.building_position_y > (building.building_position_y + building.building_size_y - 1)
			OR (data.building_position_y + data.building_size_y - 1) < building.building_position_y
		) AND NOT (
			data.building_position_z > (building.building_position_z + building.building_size_z - 1)
			OR (data.building_position_z + data.building_size_z - 1) < building.building_position_z
		)
	)
)

-- Checking if there is no building on this position which have the same value for building_type_is_inside
AND (
	SELECT COUNT(*)
	FROM building
	NATURAL INNER JOIN building_type AS type
	WHERE building.spaceship_id = data.spaceship_id
	AND type.building_type_is_inside = building_type.building_type_is_inside
	AND NOT (
		data.building_position_x > (building.building_position_x + building.building_size_x - 1)
		OR (data.building_position_x + data.building_size_x - 1) < building.building_position_x
	) AND NOT (
		data.building_position_y > (building.building_position_y + building.building_size_y - 1)
		OR (data.building_position_y + data.building_size_y - 1) < building.building_position_y
	) AND NOT (
		data.building_position_z > (building.building_position_z + building.building_size_z - 1)
		OR (data.building_position_z + data.building_size_z - 1) < building.building_position_z
	)
) = 0
