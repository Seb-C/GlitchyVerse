package main

import (
	"fmt"
	"log"
	"net/http"
	"bytes"
	"archive/tar"
	"glitchyverse/database"
	"glitchyverse/socket"
	"glitchyverse/user"
)


func main() {
	fmt.Println("Hello World from foobar!")
	
	db.Open()
	user.StartItemProductionThread()
	
	// Handling normal files
	http.Handle("/", http.FileServer(http.Dir("./www")))
	
	// Creating content.tar in memory
	buf := new(bytes.Buffer)
	tw := tar.NewWriter(buf)
	addDirToTar("/home/sebastien/Bureau/Programmation/GlitchyVerse/www", "www", tw)
	if err := tw.Close(); err != nil {
		log.Fatal(err)
	}
	tarContentBytes := buf.Bytes()
	
	// Handling content.tar
	http.HandleFunc("/content.tar", func(w http.ResponseWriter, r *http.Request) {
		headers := w.Header()
		headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
		headers.Add("Pragma",        "no-cache") // TODO remove no-cache ?
		headers.Add("Expires",       "0")
		w.Write(tarContentBytes)
	})
	
	// Handling WebSocket connection
	http.HandleFunc("/play", socket.Handler)
	
	http.ListenAndServe(":8080", nil) // TODO custom port
}

// export GOPATH=~/Bureau/test && go install glitchyverse && bin/glitchyverse
