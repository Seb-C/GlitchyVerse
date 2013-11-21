-- Returns the position of the chunks which has already been generated in the given coordinates range
-- @param REAL :min_x The position of the first chunk on the X axis
-- @param REAL :min_y The position of the first chunk on the Y axis
-- @param REAL :min_z The position of the first chunk on the Z axis
-- @param REAL :max_x The position of the last chunk on the X axis
-- @param REAL :max_y The position of the last chunk on the Y axis
-- @param REAL :max_z The position of the last chunk on the Z axis
SELECT
	chunk_position_x,
	chunk_position_y,
	chunk_position_z
FROM chunk
WHERE chunk_position_x >= :min_x AND chunk_position_x <= :max_x
AND   chunk_position_y >= :min_y AND chunk_position_y <= :max_y
AND   chunk_position_z >= :min_z AND chunk_position_z <= :max_z
ORDER BY 1, 2, 3 -- Required by space.rb optimized loops