-- Changes the state of a building from "not built" to "built",
-- only if the requirements (items) are met
-- The resulting rows modified should be checked to remive items used.
-- @param INTEGER :building_id The id of the building
-- @param INTEGER :spaceship_id The id of the spaceship

UPDATE building
SET building_is_built = 1
WHERE spaceship_id = :spaceship_id
AND building_id = :building_id
AND building_is_built = 0
AND (
	SELECT SUM(item_slot_maximum_amount) * building_size_x * building_size_y * building_size_z
	FROM building
	INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
	WHERE item_slot.item_slot_when_building = 1
	AND building.building_id = :building_id
) = (
	SELECT COUNT(*)
	FROM item
	WHERE building_id = :building_id
)
