-- Update resources to buy an object
-- After calling this procedure, the updated rows number should be tested
-- to check if update has been done (rows updated > 0) or not.
-- Should be executed before inserting the new object
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :object_type_id The id of the type of the object to buy
-- @param BOOLEAN :use_money True if we only use money resource
-- @param REAL :object_size_x The X size of the object
-- @param REAL :object_size_y The Y size of the object
-- @param REAL :object_size_z The Z size of the object
UPDATE resource
SET resource_stock = resource_stock - ((
	SELECT resource_cost_build_cost
	FROM resource_cost
	WHERE object_type_id = :object_type_id
	AND resource_type_id = resource.resource_type_id
) * :object_size_x * :object_size_y * :object_size_z)
WHERE spaceship_id = :spaceship_id
AND resource_type_id IN (
	SELECT resource_type_id
	FROM resource_cost
	WHERE object_type_id = :object_type_id
	AND resource_cost_build_cost <> 0
)
AND resource_type_id IN (
	SELECT resource_type_id
	FROM resource_type
	WHERE resource_type_is_money = :use_money
)

-- Checking if the player has enough resources
AND (
	SELECT COUNT(resource_cost.resource_type_id)
	FROM resource_cost
	INNER JOIN resource ON resource.resource_type_id = resource_cost.resource_type_id
	LEFT OUTER JOIN (
		SELECT
			resource_type_id, 
			SUM(resource_container_capacity * object_size_x * object_size_y * object_size_z) AS capacity
		FROM resource_container
		INNER JOIN object ON object.object_type_id = resource_container.object_type_id
		WHERE object.spaceship_id = :spaceship_id
		GROUP BY resource_type_id
	) AS storage ON storage.resource_type_id = resource_cost.resource_type_id
	WHERE resource.spaceship_id = :spaceship_id
	AND resource_cost.object_type_id = :object_type_id
	AND resource_cost_build_cost <> 0
	AND (
		(
			resource_cost_build_cost > 0
			AND resource_cost_build_cost <= resource_stock
		) OR (
			resource_cost_build_cost < 0
			AND storage.capacity IS NOT NULL
			AND resource_stock + resource_cost_build_cost <= storage.capacity
		)
	)
) = (
	SELECT COUNT(resource_type_id)
	FROM resource_cost
	WHERE object_type_id = :object_type_id
	AND resource_cost_build_cost <> 0
)