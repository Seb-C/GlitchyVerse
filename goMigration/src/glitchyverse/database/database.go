package db

import (
	"math"
	"log"
	"github.com/gwenn/gosqlite"
)

const databaseFilePath = "./glitchyverse.db"

var db *sqlite.Conn

func Open() {
	var err error
	
	db, err = sqlite.Open(databaseFilePath)
	if err != nil {
		log.Fatal(err)
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