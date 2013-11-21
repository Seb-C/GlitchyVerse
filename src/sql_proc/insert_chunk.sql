-- Inserts a chunk in the list of generated chunk
-- @param REAL :position_x The X position of the chunk
-- @param REAL :position_y The Y position of the chunk
-- @param REAL :position_z The Z position of the chunk
INSERT INTO chunk (
	chunk_position_x,
	chunk_position_y,
	chunk_position_z
) VALUES (
	:position_x,
	:position_y,
	:position_z
);
