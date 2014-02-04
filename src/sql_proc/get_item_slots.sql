-- Returns the slots available for each building types (referencing group ids)
SELECT
	building_type_id,
	item_group_id,
	item_slot_when_building,
	item_slot_maximum_amount,
	item_slot_state_variation
FROM item_slot
