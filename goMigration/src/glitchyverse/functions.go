package main

import (
	"archive/tar"
	"io/ioutil"
)

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