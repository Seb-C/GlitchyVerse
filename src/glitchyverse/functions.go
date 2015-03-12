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
	"archive/tar"
	"io/ioutil"
	"os"
	"time"
	"glitchyverse/database"
	"glitchyverse/user"
	"fmt"
	"net/http"
)

func GetConfig() (db string, www string, ip string, debug bool) {
	db = "./glitchyverse.db" // Default
	
	ok := true
	
	for i := 1 ; i < len(os.Args) ; i++ {
		if arg := os.Args[i] ; arg == "--debug" {
			debug = true
		} else {
			if i == len(os.Args) - 1 {
				ok = false
				break
			}
			value := os.Args[i + 1]
			i++
			if arg == "-w" {
				www = value
			} else if arg == "-d" {
				db = value
			} else if arg == "-i" {
				ip = value
			} else {
				ok = false
				break
			}
		}
	}
	
	if !ok {
		fmt.Println("usage: glitchyverse [-d <database path>] [-w <www directory path>]" +
		" [-i [<server ip or dns>]:[<port>]] [--debug]\n\n" +
		"Debug mode is not safe and not optimal for a production")
		// TODO describe debug mode
		os.Exit(1)
	}
	
	return
}

func addDirToTar(path string, pathInArchive string, tw *tar.Writer) (err error) {
	// Listing files of the directory
	files, err := ioutil.ReadDir(path)
	if err != nil {
		return err
	}
	
    for _, file := range files {
		if file.IsDir() {
			addDirToTar(path + "/" + file.Name(), pathInArchive + "/" + file.Name(), tw)
		} else {
			// Generating file header
			hdr := &tar.Header{
				Name: pathInArchive + "/" + file.Name(),
				Size: file.Size(),
			}
			if err := tw.WriteHeader(hdr); err != nil {
				return err
			}
			
			// Reading file contents
			content, err := ioutil.ReadFile(path + "/" + file.Name())
			if err != nil {
				return err
			}
			
			// Writing file body
			if _, err := tw.Write(content); err != nil {
				return err
			}
		}
    }
    
    return
}

func startItemProductionThread() {
	// Item production / consumption thread
	itemVariationDelay := 3 * time.Second
	
	go func() {
		lastUpdateTime := time.Now()
		
		for {
			time.Sleep(itemVariationDelay)
			
			currentTime := time.Now()
			passedTime := currentTime.Sub(lastUpdateTime)
			lastUpdateTime = currentTime
			
			secondsPassed := passedTime.Seconds()
			
			db.DeferredTransaction(func() bool {
				db.PutDataIntoItemVariation(secondsPassed)
				db.UpdateItemVariationFromTemp()
				
				db.InsertIntoEmptiedBuildingsFromItemVariation()
				db.UpdateEmptiedBuildingsFromTemp()
				
				user.LoopUsers(func(user *user.User) {
					user.SendItemVariation()
					user.SendDisabledBuildings()
				})
				
				db.TruncateItemVariation()
				db.TruncateEmptiedBuildings()
				
				return true
			})
		}
	}()
}

func AddNoCacheHeaders(w http.ResponseWriter) {
	headers := w.Header()
	headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
	headers.Add("Pragma",        "no-cache")
	headers.Add("Expires",       "0")
}
