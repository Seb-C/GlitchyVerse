package main

import (
	"fmt"
	"log"
	"net/http"
	"bytes"
	"archive/tar"
	"glitchyverse/socket"
	"glitchyverse/database"
)


func main() {
	dbPath, wwwPath, ip, debug := GetConfig()
	
	fmt.Println("Starting server ...") // TODO more messages in console
	
	db.Open(dbPath)
	
	startItemProductionThread() // TODO use a init function ? where ?
	
	// Handling normal files
	http.Handle("/", http.FileServer(http.Dir("./www")))
	
	// TODO don't cache static files
	
	if debug {} // TODO
	
	// Creating content.tar in memory
	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	addDirToTar(wwwPath, "www", tw)
	if err := tw.Close(); err != nil {
		log.Panic(err)
	}
	tarContentBytes := buf.Bytes()
	
	// Handling content.tar (TODO no cache only in debug mode)
	http.HandleFunc("/content.tar", func(w http.ResponseWriter, r *http.Request) {
		headers := w.Header()
		headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
		headers.Add("Pragma",        "no-cache") // TODO remove no-cache ?
		headers.Add("Expires",       "0")
		w.Write(tarContentBytes)
	})
	
	// Handling WebSocket connection
	http.HandleFunc("/play", socket.Handler)
	
	http.ListenAndServe(ip, nil) // TODO custom port
}

// TODO use debug mode (==> http header for client + static files without cache + database pragmas ...))
// TODO use structs and tags (for json) everywhere on the database
// TODO orm for database ?