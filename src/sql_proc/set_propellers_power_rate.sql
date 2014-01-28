-- Updates the state of one or multiple propeller(s), based on a rate
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param REAL :power_rate -1.0 .. 1.0
-- @param INTEGER :building_id The id of the building to update, 
-- or NULL if all buildings of the model have to be updated
UPDATE building
SET building_state = (
	CASE
		WHEN :power_rate < -1 THEN -1
		WHEN :power_rate >  1 THEN  1
		ELSE :power_rate
	END
) * (
	SELECT CASE
		WHEN :power_rate < 0
		THEN -1 * T.building_type_min_state
		ELSE T.building_type_max_state
	END
	FROM building_type AS T
	WHERE T.building_type_id = building.building_type_id
)
WHERE spaceship_id = :spaceship_id
AND building_type_id IN (
	SELECT building_type_id
	FROM building_type
	WHERE building_type_can_exert_thrust = 1
)
AND (:building_id IS NULL OR building_id = :building_id)