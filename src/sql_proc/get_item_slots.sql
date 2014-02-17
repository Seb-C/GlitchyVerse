-- Returns the slots available for each building types (referencing group ids)
SELECT
	building_type_id,
	item_group_id,
	item_slot_when_building,
	item_slot_maximum_amount,
	item_slot_state_variation
FROM item_slot
NATURAL INNER JOIN item_group
ORDER BY
	CASE WHEN item_group_id = 0 THEN 1 ELSE 0 END ASC, -- "any" slots at last
	item_group_name -- Ordering by name