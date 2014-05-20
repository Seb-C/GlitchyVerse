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

# Creates an object containing building types, categories and item slots definition, 
# to send to clients when connecting
# @return Array Containing types definition
def get_building_types_definition()
	definition = []
	slots_by_building_id = {}
	$DB.get_building_types().each do |row|
		slots_by_building_id[row["building_type_id"]] = []
		
		definition.push({
			"id"               => row["building_type_id"],
			"name"             => row["building_type_name"],
			"model"            => row["building_type_model"],
			"category"         => row["building_type_category_name"],
			"is_gap"           => row["building_type_is_gap"] == 1,
			"default_state"    => row["building_type_default_state"],
			"is_sizeable"      => row["building_type_is_sizeable"] == 1,
			"is_container"     => row["building_type_is_container"] == 1,
			"is_inside"        => row["building_type_is_inside"] == 1,
			"is_position_by_room_unit" => row["building_type_is_position_by_room_unit"] == 1,
			"min_state"        => row["building_type_min_state"],
			"max_state"        => row["building_type_max_state"],
			"can_exert_thrust" => row["building_type_can_exert_thrust"] == 1,
			"is_controllable"  => row["building_type_is_controllable"],
			"slots" => slots_by_building_id[row["building_type_id"]]
		})
	end
	
	$DB.get_item_slots().each do |row|
		slots_by_building_id[row["building_type_id"]].push({
			"group"           => row["item_group_id"],
			"when_building"   => row["item_slot_when_building"] == 1,
			"maximum_amount"  => row["item_slot_maximum_amount"],
			"state_variation" => row["item_slot_state_variation"]
		})
	end
	
	definition
end

# Creates an object containing item group names
# @return Object key = group id, value = group name
def get_item_groups_definition()
	definition = {}
	$DB.get_item_groups().each do |row|
		definition[row["item_group_id"]] = row["item_group_name"]
	end
	
	definition
end

# Creates an object containing item types definition
# @return Array Item types
def get_item_types_definition()
	definition = []
	groups_by_item_type_id = {}
	$DB.get_item_types().each do |row|
		type = {
			"id"        => row["item_type_id"],
			"name"      => row["item_type_name"],
			"max_state" => row["item_type_max_state"],
			"groups"    => []
		}
		
		definition.push(type)
		groups_by_item_type_id[type["id"]] = type["groups"]
	end
	
	$DB.get_item_types_in_item_groups().each do |row|
		groups_by_item_type_id[row["item_type_id"]].push(row["item_group_id"])
	end
	
	definition
end
