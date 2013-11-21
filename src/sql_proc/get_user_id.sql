-- If the user and password are correct, the user_id is returned. Else NULL.
-- @param TEXT :name The name of the user
-- @param TEXT :password The password of the user
SELECT 
	CASE 
		WHEN COUNT(user_id) = 0 
		THEN NULL 
        ELSE user_id
	END AS user_id
FROM user
WHERE user_name = :name
AND user_password = :password