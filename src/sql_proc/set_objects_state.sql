-- Updates the state of one or multiple object(s)
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param TEXT :model The model of the object(s) to update
-- @param REAL :state The new state
-- @param INTEGER :object_id The id of the object to update, 
-- or NULL if all objects of the model have to be updated
UPDATE object
SET object_state = :state
WHERE spaceship_id = :spaceship_id
AND object_type_id IN (
	SELECT object_type_id
	FROM object_type
	WHERE object_type_model = :model
	AND :state >= object_type_min_state
	AND :state <= object_type_max_state
)
AND (:object_id IS NULL OR object_id = :object_id)