require 'eventmachine';
require 'rack';
require 'thin';
require 'faye/websocket'
require 'inifile'
require 'digest/sha1'
require 'archive/tar/minitar'

require_relative 'functions'
require_relative 'classes/database'
require_relative 'classes/message_handler'
require_relative 'classes/space'
require_relative 'classes/user'

# Determining application root directory and loading config file
Dir.chdir(File.expand_path(File.dirname(__FILE__) + "/.."))
CONFIG = IniFile.load("./config.ini")[:global]

# (Re)creating temp archive with all www content
if File::file?("./www/content.tar")
	File::delete("./www/content.tar")
end
Archive::Tar::Minitar.pack("www", "./www/content.tar")

# Connecting to database
$DB = Database.new(
	CONFIG["DATABASE_CONNECTION_STRING"], 
	CONFIG["SQLITE_LOCKING_MODE_EXCLUSIVE"] == "true"
)

# Loading some cache data
$BUILDING_TYPES_DEFINITION = get_building_types_definition();

$SPACESHIP_MAX_SPEED_PER_PROPELLER_UNIT = 20
$MOVE_MAXIMUM_ERROR_RATE = 0.1 # The maximum difference rate when the client sends new position

# Loading paths for serving normal http files
static         = Rack::File.new("./www", {
	"Cache-Control" => "no-cache, no-store, must-revalidate",
	"Pragma"        => "no-cache",
	"Expires"       => "0"
})
static_index   = Rack::File.new("./www/index.html", {
	"Cache-Control" => "no-cache, no-store, must-revalidate",
	"Pragma"        => "no-cache",
	"Expires"       => "0"
})

# Initializing some useful stuff
users = []
message_handler = MessageHandler.new(users)
$SPACE = Space.new(message_handler)

# Starting the server
Faye::WebSocket.load_adapter('thin')
App = lambda do |env|
	if Faye::WebSocket.websocket?(env) and env['PATH_INFO'] == "/play"
		ws = Faye::WebSocket.new(env, nil, {:ping => 3})
		user = User.new(ws)
		
		ws.onopen = lambda do |event|
			users.push(user)
			message_handler.send_message("auth_query", nil, user)
		end
		
		ws.onmessage = lambda do |event|
			message_handler.handle_message(event.data, user);
		end
		
		ws.onclose = lambda do |event|
			message_handler.send_message_broadcast("delete_spaceship", user.spaceship_id, user);
			users.delete(user)
			user = nil
		end
		
		ws.onerror = lambda do |event|
			message_handler.send_message_broadcast("delete_spaceship", user.spaceship_id, user);
			users.delete(user)
			user = nil
		end
		
		ws.rack_response
	elsif env['PATH_INFO'] == "/"
		static_index.call(env)
	else
		static.call(env)
	end
end

# TODO logs

EM.run {
	thin = Rack::Handler.get('thin')
	thin.run(App, :Port => CONFIG["SERVER_PORT"]) do |server|
		server.timeout = 30
	end
}
