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
	
	# Formats a row from database (get_spaceship_object[s])
	# @param Object row from database
	# @return Object formated
	def format_object_row(row)
		{
			"id"      => row["object_id"],
			"type_id" => row["object_type_id"],
			"model"   => row["object_type_model"],
			"is_gap"  => row["object_type_is_gap"] == 1,
			"is_position_by_room_unit" => row["object_type_is_position_by_room_unit"] == 1,
			"position" => [
				row["object_position_x"],
				row["object_position_y"],
				row["object_position_z"]
			],
			"rotation" => [
				row["object_rotation_x"],
				row["object_rotation_y"],
				row["object_rotation_z"]
			],
			"size" => [
				row["object_size_x"],
				row["object_size_y"],
				row["object_size_z"]
			],
			"state"        => row["object_state"],
			"min_state"    => row["object_type_min_state"],
			"max_state"    => row["object_type_max_state"],
			"exert_thrust" => row["object_type_can_exert_thrust"]
		}
	end
	
	# Sends the spaceship informations using the message handler given
	# @param MessageHandler Object to use to send data
	def send_spaceship_data(message_handler)
		objects = []
		$DB.get_spaceship_objects(:user_id => @user_id).each do |row|
			objects.push(self.format_object_row(row))
		end
		
		# Preparing data to send
		spaceship_data = {
			"id"       => @spaceship_id,
			"owner"    => true,
			"name"     => @name,
			"position" => @position,
			"rotation" => @rotation,
			"objects"  => objects,
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
	
	def send_resource_stock(message_handler)
		stocks = {}
		$DB.get_resource_stocks(:spaceship_id => @spaceship_id).each do |row|
			stocks[row["resource_type_id"]] = row["resource_stock"]
		end
		message_handler.send_message("data_resource_stock", stocks, self)
	end
	
	def update_propellers(message_handler, propeller_id, power_level)
		$DB.set_propellers_power_rate(
			:spaceship_id => @spaceship_id,
			:power_rate   => power_level,
			:object_id    => propeller_id
		)
		message_handler.send_message_broadcast("update_propellers", {
			"spaceship_id" => @spaceship_id,
			"id"           => propeller_id,
			"power"        => power_level
		}, self)
	end
	
	def update_doors(message_handler, propeller_id, state)
		$DB.set_objects_state(
			:spaceship_id => @spaceship_id,
			:model        => "Door", # TODO replace model by type_id here + block possibility to update multiple objects at a time ?
			:state        => state,
			:object_id    => propeller_id
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
	
	# Tries to add an object to the spaceship
	# @param MessageHandler Object to use to send data
	# @param int The id of the object type
	# @param Array (vec3) Position of the new object
	# @param Array (vec3) Size of the new object
	# @param Array (vec3) Rotation of the new object
	# @param boolean True if we only use money resource
	# @return Id of the inserted object, or nil if the object hasn't been added
	def add_object(message_handler, type_id, position, size, rotation, use_money)
		# TODO add controls because it can crash if we don't send a well formated rotation (for example)
		# TODO also handle SQL errors (constraint violation, null values from the client) ...
		
		$DB.transaction()
		
		$DB.buy_object(
			:spaceship_id   => @spaceship_id,
			:object_type_id => type_id,
			:use_money      => use_money ? 1 : 0,
			:object_size_x  => size[0],
			:object_size_y  => size[1],
			:object_size_z  => size[2]
		)
		if $DB.affected_rows() == 0
			$DB.rollback()
			return false
		end
		
		$DB.insert_object(
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
			
			object = self.format_object_row(
				$DB.get_spaceship_object(
					:user_id => @user_id,
					:object_id => $DB.last_inserted_id()
				).next()
			)
			object["spaceship_id"] = @spaceship_id
			
			message_handler.send_message_broadcast("add_object", object)
			self.send_resource_stock(message_handler)
			
			return true
		end
	end
	
	# Tries to delete an object from the spaceship
	# @param MessageHandler Object to use to send data
	# @param int The id of the object
	# @return boolean True if the object has been deleted
	def delete_object(message_handler, object_id)
		
		$DB.transaction()
		
		$DB.sell_object(
			:spaceship_id => @spaceship_id,
			:object_id    => object_id
		)
		#if $DB.affected_rows() == 0
		#	$DB.rollback()
		#	return false
		#end
		
		$DB.delete_object(
			:spaceship_id => @spaceship_id,
			:object_id    => object_id
		)
		
		if $DB.affected_rows() == 0
			$DB.rollback()
			return false
		else
			$DB.commit()
			
			message_handler.send_message_broadcast("delete_object", {
				"object_id"    => object_id,
				"spaceship_id" => @spaceship_id
			})
			self.send_resource_stock(message_handler)
			
			return true
		end
	end
end
