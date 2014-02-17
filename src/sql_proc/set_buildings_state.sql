-- Updates the state of one or multiple building(s)
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param TEXT :model The model of the building(s) to update
-- @param REAL :state The new state
-- @param INTEGER :building_id The id of the building to update, 
-- or NULL if all buildings of the model have to be updated
UPDATE building
SET building_state = :state
WHERE spaceship_id = :spaceship_id
AND building_type_id IN (
	SELECT building_type_id
	FROM building_type
	WHERE building_type_model = :model
	AND :state >= building_type_min_state
	AND :state <= building_type_max_state
)
AND building_is_built = 1
AND (:building_id IS NULL OR building_id = :building_id)