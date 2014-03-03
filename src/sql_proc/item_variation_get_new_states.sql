-- Returns the new states of updated items
-- @param INTEGER :spaceship_id The id of the spaceship concerned by the update
SELECT
	item_id,
	new_item_state,
	building_id
FROM temp_item_variation
NATURAL INNER JOIN item
NATURAL INNER JOIN building
WHERE building.spaceship_id = :spaceship_id;