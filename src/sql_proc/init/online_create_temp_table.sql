-- Creates the table containing the list on online users with the id of the spaceship they are using
CREATE TEMPORARY TABLE temp_online (
	user_id INTEGER,
	spaceship_id INTEGER
);

-- TODO add constraints (NOT NULL + primary key + FOREIGN KEY + CASCADE) ? What about performance ?