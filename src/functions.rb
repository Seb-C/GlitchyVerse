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

# Creates an object containing building types, categories and constraints definition, 
# to send to clients when connecting
# @return Array Containing types definition and a sub-array with constraints
def get_building_types_definition()
	definition = []
	$DB.get_building_types().each do |row|
		definition.push({
			"id"               => row["building_type_id"],
			"name"             => row["building_type_name"],
			"category"         => row["building_type_category_name"],
			"model"            => row["building_type_model"],
			"is_gap"           => row["building_type_is_gap"] == 1,
			"default_state"    => row["building_type_default_state"],
			"allow_rotation_x" => row["building_type_allow_rotation_x"],
			"allow_rotation_y" => row["building_type_allow_rotation_y"],
			"allow_rotation_z" => row["building_type_allow_rotation_z"],
			"is_sizeable"      => row["building_type_is_sizeable"] == 1,
			"rotation_allowed_divisions" => [
				row["building_type_rotation_x_allowed_divisions"],
				row["building_type_rotation_y_allowed_divisions"],
				row["building_type_rotation_z_allowed_divisions"]
			]
		})
	end
	
	definition
end