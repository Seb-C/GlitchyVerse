package space

import (
	"log"
	"math/rand"
	"glitchyverse/database"
)

// TODO replace all [3]float64 arrays with a type + int64 by id type

const (
	seed = int16(1234) // TODO remove seed ?
	chunkSize = int64(100000)
	clientChunkRadiusVisibility = 1.0 // TODO determine it based on the max distance visibility from db ?
	chunkStarProbability = 0.8
	
	starRadiusMin,          starRadiusMax          = 500.0, 2000.0
	starColorComponentsMin, starColorComponentsMax = 0.5,   1.0
	
	planetCountMin,    planetCountMax    = 0,     20
	planetRadiusMin,   planetRadiusMax   = 500.0, 1000.0
	planetDistanceMin, planetDistanceMax = 2.0,   50.0 // Multiplicated by the star radius. It's not an euclidian distance, it's applied on each axis
)

type chunkGeneratorQueueMember interface {
	GetPosition() [3]float64
	SendSpaceContent(data []Body)
}

type Body struct {
	Id        int64      `json:"id"`
	TypeModel string     `json:"model"`
	Position  [3]float64 `json:"position"`
	Radius    float64    `json:"radius"`
	Seed      float64    `json:"seed"`
}

var chunkGeneratorQueue = make(chan chunkGeneratorQueueMember)

// TODO use star and planet max visibility attribute instead of just sending chunks

// TODO multiple threads ?
func init() {
	go func() {
		visibility := clientChunkRadiusVisibility * chunkSize
		
		var user chunkGeneratorQueueMember
		for {
			user = <-chunkGeneratorQueue
			pos := user.GetPosition()
			rpos := [3]int64 {
				int64(pos[0]),
				int64(pos[1]),
				int64(pos[2]),
			}
			
			minCoords := [3]int64 {
				rpos[0] - rpos[0] % chunkSize - visibility,
				rpos[1] - rpos[1] % chunkSize - visibility,
				rpos[2] - rpos[2] % chunkSize - visibility,
			}
			maxCoords := [3]int64 {
				rpos[0] - rpos[0] % chunkSize + visibility,
				rpos[1] - rpos[1] % chunkSize + visibility,
				rpos[2] - rpos[2] % chunkSize + visibility,
			}
			
			// To check if a chunk has already been generated
			generatedChunks := db.GetGeneratedChunks(minCoords, maxCoords)
			
			// TODO don't re-send all chunks each time to the client ?
			
			// Looping each chunk and generating chunks if required
			currentGeneratedChunkIndex := 0
			for x := minCoords[0] ; x <= maxCoords[0] ; x += chunkSize {
				for y := minCoords[1] ; y <= maxCoords[1] ; y += chunkSize {
					for z := minCoords[2] ; z <= maxCoords[2] ; z += chunkSize {
						currentChunkPosition := [3]int64{x, y, z}
						if generatedChunks[currentGeneratedChunkIndex] == currentChunkPosition {
							currentGeneratedChunkIndex += 1 // Already generated, just going to next chunk
						} else {
							generateChunk(currentChunkPosition)
						}
					}
				}
			}
			
			user.SendSpaceContent(getVisibleBodies(pos))
		}
	}()
}

func SendVisibleChunks(user chunkGeneratorQueueMember) {
	chunkGeneratorQueue <- user
}

func getVisibleBodies(position [3]float64) []Body {
	bodies := make([]Body, 0)
	
	db.GetVisibleBodies(position, func(
		id, typeId int64,
		parentId *int64,
		position [3]float64,
		radius float64,
		seed float64,
		typeName string,
		typeModel string,
		maxVisivilityDistance float64,
	) {
		bodies = append(bodies, Body {
			Id       : id,
			TypeModel: typeModel,
			Position : position,
			Radius   : radius,
			Seed     : seed,
		})
	},)
	
	return bodies
}

func generateChunk(position [3]int64) {
	if position[0] % chunkSize != 0 || position[1] % chunkSize != 0 || position[2] % chunkSize != 0 {
		log.Panicf("Invalid chunk position : %v", position)
	}
	
	db.DeferredTransaction(func() bool {
		// Generating chunk seed from seed and position
		var chunkSeed int64 = 0
		chunkSeed = chunkSeed | int64(seed)
		chunkSeed = (chunkSeed << 16) | int64(int16(position[0] / chunkSize))
		chunkSeed = (chunkSeed << 16) | int64(int16(position[1] / chunkSize))
		chunkSeed = (chunkSeed << 16) | int64(int16(position[2] / chunkSize))
		
		rng := rand.New(rand.NewSource(chunkSeed))
		
		if rng.Float64() < chunkStarProbability {
			generateStellarSystem(rng, [3]float64 {
				float64(position[0]) + float64(rng.Int31n(int32(chunkSize))),
				float64(position[1]) + float64(rng.Int31n(int32(chunkSize))),
				float64(position[2]) + float64(rng.Int31n(int32(chunkSize))),
			})
		}
		
		db.InsertChunk(position)
		
		return true
	},)
}

func generateStellarSystem(rng *rand.Rand, position [3]float64) {
	// Creating star
	starRadius := starRadiusMin + float64(rng.Int31n(starRadiusMax - starRadiusMin))
	
	starId := db.InsertBody(
		1, // Type 1 = Star
		0,
		position,
		starRadius,
		rng.Float64(),
	)
	
	// Creating planets
	planetCount := planetCountMin + rng.Int31n(planetCountMax - planetCountMin)
	for i := int32(0) ; i < planetCount ; i++ {
		var planetPosition [3]float64
		for axis := 0 ; axis < 3 ; axis++ {
			symbol := float64(+1)
			if rng.Float32() < 0.5 {
				symbol = -1
			}
			
			planetDistance := planetDistanceMin + float64(rng.Int63n(planetDistanceMax - planetDistanceMin))
			planetPosition[axis] = (position[axis] + (starRadius * symbol * planetDistance))
		}
		
		db.InsertBody(
			2, // Type 2 = Planet
			starId,
			planetPosition,
			planetRadiusMin + float64(rng.Int31n(planetRadiusMax - planetRadiusMin)),
			rng.Float64(),
		)
	}
}