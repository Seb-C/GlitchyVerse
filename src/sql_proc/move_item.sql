-- Moves an item to another building inventory
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :item_id The id of the item
-- @param INTEGER :target_building_id The id of the targetted building
-- @param INTEGER :target_slot_group_id The id of the targetted slot group

-- TODO change the filter on spaceships to allow exchanges between spaceships ?

UPDATE item SET
	building_id = :target_building_id,
	item_slot_group_id = :target_slot_group_id
WHERE item_id = :item_id
AND building_id IN (
	SELECT building_id
	FROM building
	WHERE spaceship_id = :spaceship_id
)
AND (
	SELECT COUNT(*)
	FROM building
	INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
	INNER JOIN item_type_in_item_group ON item_type_in_item_group.item_group_id = item_slot.item_group_id
	WHERE building.spaceship_id = :spaceship_id
	AND building.building_id = :target_building_id
	AND item_type_in_item_group.item_type_id = (
		SELECT item_type_id
		FROM item
		WHERE item_id = :item_id
	)
	AND (
		SELECT COUNT(*)
		FROM item
		WHERE building_id = :target_building_id
		AND item_slot_group_id = :target_slot_group_id
	) < item_slot.item_slot_maximum_amount
) > 0
;