require 'thread'

# Stuff to generate space contents and send it to the clients when needed
class Space
	def initialize(message_handler)
		@message_handler = message_handler
		@chunk_generation_queue = Queue.new
		@seed = 1234 # TODO
		@chunk_size = 100000
		@client_chunk_radius_visibility = 1 # TODO determine it based on the max distance visibility from db ?
		@chunk_star_probability = 0.8
		
		@star_radius_range = 500.0 .. 2000.0
		@star_color_components_range = 0.5 .. 1.0
		
		@planet_count_range = 0 .. 20
		@planet_radius_range = 500.0 .. 1000.0
		@planet_distance_range = 2.0 .. 50.0 # Multiplicated by the star radius. It's not an euclidian distance, it's applied on each axis
		
		# TODO use star and planet max visibility attribute instead of just sending chunks
		
		# TODO multiple threads ?
		Thread.abort_on_exception = true
		@generator_thread = Thread.new do
			loop do
				user = @chunk_generation_queue.pop()
				visibility = @client_chunk_radius_visibility * @chunk_size
				min_coords = [
					user.position[0] - (user.position[0] % @chunk_size) - visibility,
					user.position[1] - (user.position[1] % @chunk_size) - visibility,
					user.position[2] - (user.position[2] % @chunk_size) - visibility,
				]
				max_coords = [
					user.position[0] - (user.position[0] % @chunk_size) + visibility,
					user.position[1] - (user.position[1] % @chunk_size) + visibility,
					user.position[2] - (user.position[2] % @chunk_size) + visibility,
				]
				
				# To check if a chunk has already been generated
				current_generated_chunk_index = 0
				generated_chunks = $DB.get_generated_chunks!(
					:min_x => min_coords[0],
					:min_y => min_coords[1],
					:min_z => min_coords[2],
					:max_x => max_coords[0],
					:max_y => max_coords[1],
					:max_z => max_coords[2]
				)
				# TODO don't re-send all chunks each time to the client ?
				
				# Looping each chunk and generating chunks if required
				(min_coords[0] .. max_coords[0]).step(@chunk_size) do |x|
					(min_coords[1] .. max_coords[1]).step(@chunk_size) do |y|
						(min_coords[2] .. max_coords[2]).step(@chunk_size) do |z|
							current_chunk_position = [x, y, z]
							if generated_chunks[current_generated_chunk_index] == current_chunk_position
								# Already generated, just going to next chunk
								current_generated_chunk_index += 1
							else
								# Generating it
								self.generate_chunk(current_chunk_position)
								print "Generated chunk #{current_chunk_position}\n" # TODO remove it, just a test
							end
						end
					end
				end
				@message_handler.send_message("data_space_content", self.get_visible_bodies(user.position), user)
			end
		end
	end
	
	# Queries the space thread to send visible chunks content to a client (asynchronous)
	# @param User The user requiring the chunks
	def send_visible_chunks(user)
		@chunk_generation_queue.push(user)
	end
	
	protected
	
	# Gets all bodies visible from the given position
	# @param Array(3) The position
	def get_visible_bodies(position)
		bodies = []
		$DB.get_visible_bodies(
			:position_x => position[0],
			:position_y => position[1],
			:position_z => position[2]
		).each do |row|
			bodies.push({
				"id"       => row["body_id"],
				"model"    => row["body_type_model"],
				"position" => [
					row["body_position_x"],
					row["body_position_y"],
					row["body_position_z"]
				],
				"radius"   => row["body_radius"],
				"seed"     => row["body_seed"]
			})
		end
		bodies
	end
	
	# Generates a chunk and it's content
	# @param Array(3) Position of the chunk to generate
	def generate_chunk(position)
		position.each do |x|
			unless x % @chunk_size == 0
				throw "Invalid chunk position : #{position}"
			end
		end
		
		$DB.transaction()
		
		rng = Random.new(make_unique_integer(@seed, *position))
		
		if rng.rand() < @chunk_star_probability
			self.generate_stellar_system(rng, [
				position[0] + rng.rand(@chunk_size.to_f),
				position[1] + rng.rand(@chunk_size.to_f),
				position[2] + rng.rand(@chunk_size.to_f)
			])
		end
		
		$DB.insert_chunk(
			:position_x => position[0],
			:position_y => position[1],
			:position_z => position[2]
		)
		
		$DB.commit()
	end
	
	# Generates and inserts a stellar system (star + planets) in the database
	# @param Random The random object (with seed) to use to generate attributes
	# @param Array(3) Position of the center of the stellar system (center of the star) in space
	def generate_stellar_system(rng, position)
		# Creating star
		star_radius = rng.rand(@star_radius_range)
		$DB.insert_body(
			:type_id    => 1, # Type 1 = Star
			:parent_id  => nil,
			:position_x => position[0],
			:position_y => position[1],
			:position_z => position[2],
			:radius     => star_radius,
			:seed       => rng.rand()
		)
		star_id = $DB.last_inserted_id()
		
		rng.rand(@planet_count_range).times do
			# Creating planet
			$DB.insert_body(
				:type_id    => 2, # Type 2 = Planet
				:parent_id  => star_id,
				:position_x => position[0] + rng.rand(@planet_distance_range) * star_radius * [-1, +1].sample(random: rng),
				:position_y => position[1] + rng.rand(@planet_distance_range) * star_radius * [-1, +1].sample(random: rng),
				:position_z => position[2] + rng.rand(@planet_distance_range) * star_radius * [-1, +1].sample(random: rng),
				:radius     => rng.rand(@planet_radius_range),
				:seed       => rng.rand()
			)
		end
	end
end