-- Deletes a user from temp_online
-- @param INTEGER :user_id The id of the user to delete
DELETE FROM temp_online
WHERE user_id = :user_id;