package db

import (
	"log"
)

// Inserts a new building in the database, and checks all constraints.
func InsertBuilding(
	spaceShipId int64,
	typeId int64,
	position [3]float64,
	size [3]float64,
	rotation [4]float64,
) (bool, int64) {
	id, err := db.Insert(
		`
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
				data.building_rotation_w,
				data.building_size_x,
				data.building_size_y,
				data.building_size_z,
				building_type.building_type_default_state,
				(CASE
					WHEN (
						-- If there are no required items to build, it's already built
						SELECT COALESCE(SUM(item_slot.item_slot_maximum_amount), 0)
						FROM item_slot
						WHERE item_slot.building_type_id = building_type.building_type_id
						AND item_slot.item_slot_when_building = 1
					) = 0
					THEN 1
					ELSE 0
				END) AS building_is_built,
				NULL AS building_seed, -- TODO
				1 AS building_is_enabled
			FROM (
				-- Data to save
				SELECT
					?1  AS spaceship_id,
					?2  AS type_id,
					?3  AS building_position_x,
					?4  AS building_position_y,
					?5  AS building_position_z,
					?6  AS building_size_x,
					?7  AS building_size_y,
					?8  AS building_size_z,
					?9  AS building_rotation_x,
					?10 AS building_rotation_y,
					?11 AS building_rotation_z,
					?12 AS building_rotation_w
			) AS data
			INNER JOIN building_type ON building_type.building_type_id = data.type_id

			WHERE building_type.building_type_category_id IS NOT NULL

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
			;
		`,
		spaceShipId,
		typeId,
		position[0],
		position[1],
		position[2],
		size[0],
		size[1],
		size[2],
		rotation[0],
		rotation[1],
		rotation[2],
		rotation[3],
	)
	if err != nil {
		log.Panic(err)
	}
	
	return (id > 0), int64(id)
}
