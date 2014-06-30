require 'sqlite3'

# To connect and use SQL database
# Each SQL file in src/sql_proc will be a method of this object
# Parameters will be passed using symbols hash
class Database
	# Constructor
	# @param String The connection string for players database. For SQLite, it's just the database file path
	# @param String The connection string for space database. For SQLite, it's just the database file path
	# @param String "true" if locking mode should be set to exclusive
	def initialize(connection_string, locking_mode_exclusive)
		# Initializing variables and connecting to the database
		@connection_string = connection_string
		@connection = SQLite3::Database.open(@connection_string)
		@connection.results_as_hash = true
		@sql_proc_directory = "./sql"
		@prepared_proc = {}
		
		# Creating some useful functions
		@connection.create_function("POW", 1, :numeric) do |func, x, y|
			func.result = x ** y
		end
		@connection.create_function("SQRT", 1, :numeric) do |func, x|
			func.result = Math.sqrt(x)
		end
		@connection.create_function("CLAMP", 1, :numeric) do |func, val, min, max|
			if val > max
				func.result = max
			elsif val < min
				func.result = min
			else
				func.result = val
			end
		end
		
		# Loading content located in init directory (temp tables ...)
		Dir["#{@sql_proc_directory}/init/*.sql"].each do |file|
			@connection.execute(File.read(file))
		end
		
		# Loading and preparing stored procedures
		Dir["#{@sql_proc_directory}/*.sql"].each do |file|
			proc_name = File.basename(file, ".sql")
			begin
				@prepared_proc[proc_name.to_sym] = @connection.prepare(File.read(file))
			rescue SQLite3::SQLException => e
				$stderr.print "Error preparing SQL procedure " + proc_name + " : " + e.message + "\n"
				raise e
			end
		end
	end
	
	def affected_rows()
		@connection.changes()
	end
	
	def last_inserted_id()
		@connection.last_insert_row_id()
	end
	
	def transaction()
		@connection.transaction()
	end
	
	def commit()
		@connection.commit()
	end
	
	def rollback()
		@connection.rollback()
	end
	
	# Called for each method. A method is defined by a SQL file in src/sql_proc.
	# @param Hash of symbols, for each parameter of the procedure
	# @return SQLite::ResultSet or Array of rows (each row is a flat Array) if method name ends by "!"
	# TODO better use define_method in constructor
	def method_missing(name, *args, &block)
		# TODO catch SQL Exceptions to add procedure name in error message
		if name.to_s[-1, 1] == "!" and @prepared_proc.has_key?(name[0, name.length - 1].to_sym)
			@prepared_proc[name[0, name.length - 1].to_sym].execute!(args[0])
		elsif @prepared_proc.has_key?(name)
			if args.length == 0
				@prepared_proc[name].execute()
			else
				@prepared_proc[name].execute(args[0])
			end
		else
			super
		end
	end
end
