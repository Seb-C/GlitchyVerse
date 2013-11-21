-- Update resources to sell an object
-- After calling this procedure, the updated rows number should be tested
-- to check if update has been done (rows updated > 0) or not.
-- Must be executed before deleting the object
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :object_id The id of the object to remove
UPDATE resource
SET resource_stock = resource_stock + (
	SELECT resource_cost_build_cost * object_size_x * object_size_y * object_size_z
	FROM resource_cost
	INNER JOIN object ON object.object_type_id = resource_cost.object_type_id
	WHERE object_id = :object_id
	AND resource_cost.resource_type_id = resource.resource_type_id
)
WHERE spaceship_id = :spaceship_id
AND resource_type_id IN (
	SELECT resource_cost.resource_type_id
	FROM resource_cost
	INNER JOIN object ON object.object_type_id = resource_cost.object_type_id
	WHERE object_id = :object_id
	AND resource_cost_build_cost <> 0
)
AND resource_type_id IN (
	SELECT resource_type_id
	FROM resource_type
	WHERE resource_type_is_money = 1
)

-- Checking if the player can store the money
AND (
	SELECT COUNT(resource_cost.resource_type_id)
	FROM resource_cost
	INNER JOIN resource ON resource.resource_type_id = resource_cost.resource_type_id
	INNER JOIN resource_type ON resource_type.resource_type_id = resource.resource_type_id
	INNER JOIN object ON object.object_type_id = resource_cost.object_type_id
	LEFT OUTER JOIN (
		SELECT
			resource_type.resource_type_id, 
			SUM(resource_container_capacity * object_size_x * object_size_y * object_size_z) AS capacity
		FROM resource_container
		INNER JOIN resource_type ON resource_type.resource_type_id = resource_container.resource_type_id
		INNER JOIN object ON object.object_type_id = resource_container.object_type_id
		WHERE object.spaceship_id = :spaceship_id
		AND resource_type_is_money = 1
		GROUP BY resource_type.resource_type_id
	) AS storage ON storage.resource_type_id = resource_cost.resource_type_id
	WHERE resource.spaceship_id = :spaceship_id
	AND object_id = :object_id
	AND resource_cost_build_cost <> 0
	AND resource_type_is_money = 1
	AND (
		(
			resource_cost_build_cost < 0
			AND -resource_cost_build_cost <= resource_stock
		) OR (
			resource_cost_build_cost > 0
			AND storage.capacity IS NOT NULL
			AND resource_stock - resource_cost_build_cost <= storage.capacity
		)
	)
) = (
	SELECT COUNT(resource_cost.resource_type_id)
	FROM resource_cost
	INNER JOIN resource_type ON resource_type.resource_type_id = resource_cost.resource_type_id
	INNER JOIN object ON object.object_type_id = resource_cost.object_type_id
	WHERE object_id = :object_id
	AND resource_cost_build_cost <> 0
	AND resource_type_is_money = 1
)