-- Returns the items of the spaceship
-- @param INTEGER :spaceship_id The id of the spaceship
SELECT
	item_id,
	item_type_id,
	item_state,
	building_id,
	item_slot_group_id
FROM item
NATURAL INNER JOIN building
WHERE spaceship_id = :spaceship_id
