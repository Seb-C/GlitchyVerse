package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetBuildingTypes(rowHandler func(
	id int64,
	name string,
	category string,
	model string,
	isGap bool,
	defaultState float64,
	isSizeable bool,
	isContainer bool,
	isInside bool,
	isPositionByRoomUnit bool,
	minState float64,
	maxState float64,
	canExertThrust bool,
	isControllable bool,
)) {
	s, err := db.Prepare(`
		SELECT
			building_type_id,
			building_type_name,
			building_type_category_name,
			building_type_model,
			building_type_is_gap,
			building_type_default_state,
			building_type_is_sizeable,
			building_type_is_container,
			building_type_is_inside,
			building_type_is_position_by_room_unit,
			building_type_min_state,
			building_type_max_state,
			building_type_can_exert_thrust,
			building_type_is_controllable
		FROM building_type
		NATURAL LEFT JOIN building_type_category
		;
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		id,                   _, err := s.ScanInt64 (0 ); if err != nil { return err }
		name,                 _      := s.ScanText  (1 )
		category,             _      := s.ScanText  (2 )
		model,                _      := s.ScanText  (3 )
		isGap,                _, err := s.ScanBool  (4 ); if err != nil { return err }
		defaultState,         _, err := s.ScanDouble(5 ); if err != nil { return err }
		isSizeable,           _, err := s.ScanBool  (6 ); if err != nil { return err }
		isContainer,          _, err := s.ScanBool  (7 ); if err != nil { return err }
		isInside,             _, err := s.ScanBool  (8 ); if err != nil { return err }
		isPositionByRoomUnit, _, err := s.ScanBool  (9 ); if err != nil { return err }
		minState,             _, err := s.ScanDouble(10); if err != nil { return err }
		maxState,             _, err := s.ScanDouble(11); if err != nil { return err }
		canExertThrust,       _, err := s.ScanBool  (12); if err != nil { return err }
		isControllable,       _, err := s.ScanBool  (13); if err != nil { return err }
		
		rowHandler(
			id,
			name,
			category,
			model,
			isGap,
			defaultState,
			isSizeable,
			isContainer,
			isInside,
			isPositionByRoomUnit,
			minState,
			maxState,
			canExertThrust,
			isControllable,
		)
		
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}