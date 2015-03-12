/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
