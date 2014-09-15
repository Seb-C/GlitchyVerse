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
	fileServerHandler := http.FileServer(http.Dir("./www"))
	if debug {
		fileServerHandler = (func(h http.Handler) http.HandlerFunc {
			return func(w http.ResponseWriter, r *http.Request) {
				AddNoCacheHeaders(w)
				h.ServeHTTP(w, r)
			}
		})(fileServerHandler)
	}
	http.Handle("/", fileServerHandler)
	
	// Creating content.tar in memory
	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	addDirToTar(wwwPath, "www", tw)
	if err := tw.Close(); err != nil {
		log.Panic(err)
	}
	tarContentBytes := buf.Bytes()
	
	// Handling content.tar
	http.HandleFunc("/content.tar", func(w http.ResponseWriter, r *http.Request) {
		if debug {
			AddNoCacheHeaders(w)
		}
		w.Write(tarContentBytes)
	})
	
	// Handling WebSocket connection
	http.HandleFunc("/play", socket.Handler)
	
	http.ListenAndServe(ip, nil) // TODO custom port
}

// TODO use debug mode (==> http header for client + static files without cache + database pragmas ...))
