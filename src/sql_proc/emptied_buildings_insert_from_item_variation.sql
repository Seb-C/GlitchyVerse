-- Inserts into temp_emptied_buildings the buildings which requires items to work, and where there are no items left.
INSERT INTO temp_emptied_buildings
SELECT
	building.building_id
FROM temp_item_variation
INNER JOIN item AS itemA ON itemA.item_id = temp_item_variation.item_id
INNER JOIN building ON building.building_id = itemA.building_id
INNER JOIN item_slot ON item_slot.building_type_id = building.building_type_id
INNER JOIN item AS itemB ON (
	itemB.building_id = building.building_id
	AND itemB.item_slot_group_id = item_slot.item_group_id
)
WHERE item_slot.item_slot_state_variation < 0
AND item_slot.item_slot_when_building = 0
GROUP BY building.building_id
HAVING SUM(itemB.item_state) <= 0