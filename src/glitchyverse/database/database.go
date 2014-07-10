package db

import (
	"math"
	"log"
	"github.com/gwenn/gosqlite"
)

var db *sqlite.Conn

func Open(filePath string) {
	var err error
	
	db, err = sqlite.Open(filePath)
	if err != nil {
		log.Panic(err)
	}
	
	// Creating custom functions
	db.CreateScalarFunction("POW", 2, true, 0, func(ctx *sqlite.ScalarContext, nArg int) {
		ctx.ResultDouble(math.Pow(ctx.Double(0), ctx.Double(1)))
	}, func(pApp interface{}) {})
	db.CreateScalarFunction("SQRT", 1, true, 0, func(ctx *sqlite.ScalarContext, nArg int) {
		ctx.ResultDouble(math.Sqrt(ctx.Double(0)))
	}, func(pApp interface{}) {})
	db.CreateScalarFunction("CLAMP", 3, true, 0, func(ctx *sqlite.ScalarContext, nArg int) {
		val := ctx.Double(0)
		
		if max := ctx.Double(2); val > max {
			ctx.ResultDouble(max)
		} else if min := ctx.Double(1); val < min {
			ctx.ResultDouble(min)
		} else {
			ctx.ResultDouble(val)
		}
	}, func(pApp interface{}) {})
	
	// Creating temporary tables
	// TODO add constraints (NOT NULL + primary key + FOREIGN KEY + CASCADE) ? What about performance ?
	createTableEmptiedBuildings()
	createTableItemVariation()
	createTableOnline()
	
	// TODO set some useful pragmas (PRAGMA foo = "BAR")
}

func int64ToNull(x int64) interface{} {
	if x <= 0 {
		return nil
	} else {
		return x
	}
}

func getNullInt64(s *sqlite.Stmt, i int) (*int64, error) {
	data, isNull, err := s.ScanInt64(i)
	var r *int64
	if isNull {
		r = nil
	} else {
		r = &data
	}
	
	return r, err
}

func getNullString(s *sqlite.Stmt, i int) *string {
	data, isNull := s.ScanText(i)
	if isNull {
		return nil
	} else {
		return &data
	}
}

func getNullBool(s *sqlite.Stmt, i int) (*bool, error) {
	data, isNull, err := s.ScanBool(i)
	var r *bool
	if isNull {
		r = nil
	} else {
		r = &data
	}
	
	return r, err
}