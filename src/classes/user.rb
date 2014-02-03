# A user (connected or not)
class User
	attr_reader :websocket
	attr_reader :name
	attr_reader :position
	attr_reader :rotation
	attr_reader :id
	attr_reader :spaceship_id
	
	# TODO block double login
	
	# Initializes the user
	# @param WebSocket the websocket of the user
	def initialize(websocket)
		@websocket = websocket
		@send_lock = Mutex.new
		@user_id = nil
		@spaceship_id = nil
		@name = nil
		@position = nil
		@rotation = nil
		@last_position_update_time = nil
	end
	
	# Tries to connect the user
	# @param String The username
	# @param String The password
	# @return True if the login and password are correct and if the user is connected
	def connect?(name, password)
		return false unless @user_id.nil?
		hash_pass = Digest::SHA1.hexdigest(name + password).force_encoding('utf-8')
		@user_id      = $DB.get_user_id(:name => name, :password => hash_pass).next()["user_id"]
		unless @user_id.nil?
			@spaceship_id = $DB.get_first_spaceship_id(:user_id => @user_id).next()["spaceship_id"]
			
			spaceship_attributes = $DB.get_spaceship(:spaceship_id => @spaceship_id).next()
			@name     = spaceship_attributes["name"]
			@position = [
				spaceship_attributes["spaceship_position_x"],
				spaceship_attributes["spaceship_position_y"],
				spaceship_attributes["spaceship_position_z"]
			]
			@rotation = [
				spaceship_attributes["spaceship_rotation_x"],
				spaceship_attributes["spaceship_rotation_y"],
				spaceship_attributes["spaceship_rotation_z"]
			]
			@last_position_update_time = Time.new()
		end
		!@user_id.nil?
	end
	
	def send(message)
		@send_lock.synchronize do
			@websocket.send(message)
		end
	end
	
	# Formats a row from database (get_spaceship_building[s])
	# @param Object row from database
	# @return Object formated
	def format_building_row(row)
		{
			"id"      => row["building_id"],
			"type_id" => row["building_type_id"],
			"model"   => row["building_type_model"],
			"is_gap"  => row["building_type_is_gap"] == 1,
			"is_position_by_room_unit" => row["building_type_is_position_by_room_unit"] == 1,
			"position" => [
				row["building_position_x"],
				row["building_position_y"],
				row["building_position_z"]
			],
			"rotation" => [
				row["building_rotation_x"],
				row["building_rotation_y"],
				row["building_rotation_z"]
			],
			"size" => [
				row["building_size_x"],
				row["building_size_y"],
				row["building_size_z"]
			],
			"state"        => row["building_state"],
			"min_state"    => row["building_type_min_state"],
			"max_state"    => row["building_type_max_state"],
			"exert_thrust" => row["building_type_can_exert_thrust"],
			"is_controllable" => row["building_type_is_controllable"] == 1
		}
	end
	
	# Sends the spaceship informations using the message handler given
	# @param MessageHandler Object to use to send data
	def send_spaceship_data(message_handler)
		buildings = []
		$DB.get_spaceship_buildings(:user_id => @user_id).each do |row|
			buildings.push(self.format_building_row(row))
		end
		
		# Preparing data to send
		spaceship_data = {
			"id"         => @spaceship_id,
			"owner"      => true,
			"name"       => @name,
			"position"   => @position,
			"rotation"   => @rotation,
			"buildings"  => buildings,
			"attributes" => {
				"max_speed_per_propeller_unit" => $SPACESHIP_MAX_SPEED_PER_PROPELLER_UNIT
			}
		}
		
		# Sending spaceship definition to user
		message_handler.send_message("data_spaceship", spaceship_data, self)
		
		# Sending spaceship definition to all users
		spaceship_data["owner"] = false
		message_handler.send_message_broadcast("data_spaceship", spaceship_data, self)
	end
	
	def update_propellers(message_handler, propeller_id, power_level)
		$DB.set_propellers_power_rate(
			:spaceship_id => @spaceship_id,
			:power_rate   => power_level,
			:building_id  => propeller_id
		)
		message_handler.send_message_broadcast("update_propellers", {
			"spaceship_id" => @spaceship_id,
			"id"           => propeller_id,
			"power"        => power_level
		}, self)
	end
	
	def update_doors(message_handler, propeller_id, state)
		$DB.set_buildings_state(
			:spaceship_id => @spaceship_id,
			:model        => "Door", # TODO replace model by type_id here + block possibility to update multiple buildings at a time ?
			:state        => state,
			:building_id  => propeller_id
		)
		# TODO send information to other clients ?
	end
	
	def update_position(message_handler, position, rotation)
		time = Time.new()
		
		$DB.set_spaceship_position(
			:MAX_SPEED_PER_PROPELLER_UNIT => $SPACESHIP_MAX_SPEED_PER_PROPELLER_UNIT,
			:MOVE_MAXIMUM_ERROR_RATE => $MOVE_MAXIMUM_ERROR_RATE,
			:passed_time_rate => time - @last_position_update_time,
			:spaceship_id => @spaceship_id,
			:position_x => position[0],
			:position_y => position[1],
			:position_z => position[2],
			:rotation_x => rotation[0],
			:rotation_y => rotation[1],
			:rotation_z => rotation[2]
		)
		
		send_position_to_user = false
		@last_position_update_time = time
		if $DB.affected_rows() == 1
			@position = position
			@rotation = rotation
			$SPACE.send_visible_chunks(self)
		else
			send_position_to_user = true
		end
		message_handler.send_message_broadcast("update_position", {
			"spaceship_id" => @spaceship_id,
			"position"     => @position,
			"rotation"     => @rotation
		}, send_position_to_user ? self : nil)
	end
	
	# Tries to add a building to the spaceship
	# @param MessageHandler Object to use to send data
	# @param int The id of the building type
	# @param Array (vec3) Position of the new building
	# @param Array (vec3) Size of the new building
	# @param Array (vec3) Rotation of the new building
	# @return Id of the inserted building, or nil if the building hasn't been added
	def add_building(message_handler, type_id, position, size, rotation)
		# TODO add controls because it can crash if we don't send a well formated rotation (for example)
		# TODO also handle SQL errors (constraint violation, null values from the client) ...
		
		$DB.transaction()
		
		$DB.insert_building(
			:spaceship_id => @spaceship_id,
			:type_id      => type_id,
			:position_x   => position[0],
			:position_y   => position[1],
			:position_z   => position[2],
			:size_x       => size[0],
			:size_y       => size[1],
			:size_z       => size[2],
			:rotation_x   => rotation[0],
			:rotation_y   => rotation[1],
			:rotation_z   => rotation[2]
		)
		
		if $DB.affected_rows() == 0
			$DB.rollback()
			return false
		else
			$DB.commit()
			
			building = self.format_building_row(
				$DB.get_spaceship_building(
					:user_id => @user_id,
					:building_id => $DB.last_inserted_id()
				).next()
			)
			building["spaceship_id"] = @spaceship_id
			
			message_handler.send_message_broadcast("add_building", building)
			
			return true
		end
	end
	
	# Tries to delete a building from the spaceship
	# @param MessageHandler Object to use to send data
	# @param int The id of the building
	# @return boolean True if the building has been deleted
	def delete_building(message_handler, building_id)
		
		$DB.transaction()
		
		$DB.delete_building(
			:spaceship_id => @spaceship_id,
			:building_id  => building_id
		)
		
		if $DB.affected_rows() == 0
			$DB.rollback()
			return false
		else
			$DB.commit()
			
			message_handler.send_message_broadcast("delete_building", {
				"building_id"  => building_id,
				"spaceship_id" => @spaceship_id
			})
			
			return true
		end
	end
end
