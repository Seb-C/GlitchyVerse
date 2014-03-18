-- Sets the state of the buildings to disable as disabled
UPDATE building
SET building_is_enabled = 0
WHERE building_id IN (
	SELECT building_id
	FROM temp_emptied_buildings
);