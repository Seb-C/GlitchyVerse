-- Updates the item states using values in temp_item_variation table
UPDATE item
SET item_state = (
	SELECT new_item_state
	FROM temp_item_variation
	WHERE temp_item_variation.item_id = item.item_id
)
WHERE item_id IN (
	SELECT item_id
	FROM temp_item_variation
);