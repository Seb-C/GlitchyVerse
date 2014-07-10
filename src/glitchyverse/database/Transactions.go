package db

import (
	"log"
	"github.com/gwenn/gosqlite"
	"errors"
)

// Callback must return true to commit, false to rollback
func DeferredTransaction(f func() bool) {
	err := db.Transaction(sqlite.Deferred, func(c *sqlite.Conn) error {
		if f() {
			return nil
		} else {
			return errors.New("Rollback")
		}
	})
	if err != nil {
		log.Panic(err) // TODO is there an error in case of rollback (shouldn't be the case)
	}
}