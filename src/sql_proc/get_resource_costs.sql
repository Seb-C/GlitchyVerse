-- Returns the full list of resource costs
SELECT
	object_type_id,
	resource_type_id,
	resource_cost_build_cost,
	resource_cost_consumption
FROM resource_cost