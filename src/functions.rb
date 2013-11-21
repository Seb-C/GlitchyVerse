# Euclidian distance between two points
# @param Array(3) Position of point A
# @param Array(3) Position of point B
# @return float Euclidian distance between A and B
def euclidian_distance(a, b)
	Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 + (b[2] - a[2]) ** 2)
end

# Makes a unique number with the given arguments
# @param *int Any number of integers (at least one)
# @return int A unique integer for this combination
def make_unique_integer(*args)
	args.map(&:to_i).join("b").gsub("-", "a").to_i(12)
end

# Creates an object containing objects types, categories and constraints definition, 
# to send to clients when connecting
# @return Array Containing types definition and a sub-array with constraints
def get_object_types_definition()
	definition = []
	$DB.get_object_types().each do |row|
		definition.push({
			"id"               => row["object_type_id"],
			"name"             => row["object_type_name"],
			"category"         => row["object_type_category_name"],
			"model"            => row["object_type_model"],
			"is_gap"           => row["object_type_is_gap"] == 1,
			"default_state"    => row["object_type_default_state"],
			"allow_rotation_x" => row["object_type_allow_rotation_x"],
			"allow_rotation_y" => row["object_type_allow_rotation_y"],
			"allow_rotation_z" => row["object_type_allow_rotation_z"],
			"is_sizeable"      => row["object_type_is_sizeable"] == 1,
			"rotation_allowed_divisions" => [
				row["object_type_rotation_x_allowed_divisions"],
				row["object_type_rotation_y_allowed_divisions"],
				row["object_type_rotation_z_allowed_divisions"]
			]
		})
	end
	
	definition
end

# Creates an object containing resource types and costs
# to send to clients when connecting
# @return Array Containing resources types definition
def get_resources_definition()
	definition = {}
	
	$DB.get_resource_types().each do |row|
		definition[row["resource_type_id"]] = {
			"name"       => row["resource_type_name"],
			"is_money"   => row["resource_type_is_money"],
			"costs"      => [],
			"containers" => []
		}
	end
	
	$DB.get_resource_costs().each do |row|
		definition[row["resource_type_id"]]["costs"].push({
			"object_type_id" => row["object_type_id"],
			"build_cost"     => row["resource_cost_build_cost"],
			"consumption"    => row["resource_cost_consumption"]
		})
	end
	
	$DB.get_resource_containers().each do |row|
		definition[row["resource_type_id"]]["containers"].push({
			"object_type_id" => row["object_type_id"],
			"capacity"       => row["resource_container_capacity"]
		})
	end
	
	definition
end