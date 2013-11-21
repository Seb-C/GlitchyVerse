-- Updates the state of one or multiple propeller(s), based on a rate
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param REAL :power_rate -1.0 .. 1.0
-- @param INTEGER :object_id The id of the object to update, 
-- or NULL if all objects of the model have to be updated
UPDATE object
SET object_state = (
	CASE
		WHEN :power_rate < -1 THEN -1
		WHEN :power_rate >  1 THEN  1
		ELSE :power_rate
	END
) * (
	SELECT CASE
		WHEN :power_rate < 0
		THEN -1 * T.object_type_min_state
		ELSE T.object_type_max_state
	END
	FROM object_type AS T
	WHERE T.object_type_id = object.object_type_id
)
WHERE spaceship_id = :spaceship_id
AND object_type_id IN (
	SELECT object_type_id
	FROM object_type
	WHERE object_type_can_exert_thrust = 1
)
AND (:object_id IS NULL OR object_id = :object_id)