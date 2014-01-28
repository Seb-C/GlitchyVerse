require 'json'

# Handles the messages received and does the necessary actions
class MessageHandler
	# Initializes the message handler
	# @param Array[User] An array of all users (has to be always up to date))
	def initialize(users)
		@users = users
	end
	
	def handle_message(message, user)
		# Parsing JSON message
		msg = JSON.parse(message)
		
		# Check message validity
		unless msg.kind_of?(Array) or msg.length == 2 or msg[0].kind_of(String)
			throw "Received message is not valid"
		end
		
		# We have msg[0] = method name and msg[1] = Hash containing data
		method_symbol = msg[0].to_sym
		if self.respond_to?(method_symbol, true) and !self.respond_to?(method_symbol, false)
			# Now we are sure that method exists and is a private method ==> Calling it
			# TODO is it safe ? Force letters and underscores only ?
			# TODO catch error when all required parameters aren't set in data
			self.send(method_symbol, msg[1], user)
		else
			throw "Unknown method name : #{method_symbol}"
		end
	end
	
	def send_message(method, data, user)
		message = JSON.generate([method, data]);
		user.send(message);
	end
	
	def send_message_broadcast(method, data, user_to_except = nil)
		# TODO broadcast depending on the visible users is space
		message = JSON.generate([method, data]);
		@users.each do |user|
			unless user == user_to_except
				user.send(message)
			end
		end
	end
	
	private
	
	def auth_answer(data, user)
		is_valid = user.connect?(data["name"], data["password"])
		
		if is_valid
			message = "Connection success !"
		else
			message = "Name or password isn't valid."
		end
		
		self.send_message("auth_result", {
			"message" => message,
			"is_valid" => is_valid
		}, user)
		
		if is_valid
			# Sending spaceship data
			self.send_message("data_building_types_definition", $BUILDING_TYPES_DEFINITION, user)
			user.send_spaceship_data(self)
			
			# Sending space data
			$SPACE.send_visible_chunks(user)
		end
	end
	
	def update_propellers(data, user)
		user.update_propellers(self, data["id"], data["power"])
	end
	
	def update_doors(data, user)
		user.update_doors(self, data["id"], data["state"])
	end
	
	def update_position(data, user)
		user.update_position(self, data["position"], data["rotation"])
	end
	
	# TODO better and unique way to update building, with boolean indicating if the building is freely updatable or not
	
	def build_query(data, user)
		user.add_building(self, data["type_id"], data["position"], data["size"], data["rotation"])
	end
	
	def dismantle_query(data, user)
		user.delete_building(self, data)
	end
end
