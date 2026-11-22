class_name DungeonGen
extends RefCounted
## Procedural dungeon: rooms joined by corridors on a grid. true = floor.

const W := 48
const H := 48

var grid: Array = []
var rooms: Array[Rect2i] = []

func generate(rng: RandomNumberGenerator, room_count := 9) -> void:
	grid.clear()
	rooms.clear()
	for x in W:
		var col := []
		col.resize(H)
		col.fill(false)
		grid.append(col)
	var tries := 0
	while rooms.size() < room_count and tries < 200:
		tries += 1
		var size := Vector2i(rng.randi_range(5, 9), rng.randi_range(5, 9))
		var pos := Vector2i(rng.randi_range(2, W - size.x - 3), rng.randi_range(2, H - size.y - 3))
		var r := Rect2i(pos, size)
		var overlap := false
		for o in rooms:
			if r.grow(2).intersects(o):
				overlap = true
				break
		if overlap:
			continue
		rooms.append(r)
		_carve_room(r)
		if rooms.size() > 1:
			_carve_corridor(_center(rooms[-2]), _center(r), rng)

func _center(r: Rect2i) -> Vector2i:
	return r.position + r.size / 2

func _carve_room(r: Rect2i) -> void:
	for x in range(r.position.x, r.end.x):
		for y in range(r.position.y, r.end.y):
			grid[x][y] = true

func _carve_corridor(a: Vector2i, b: Vector2i, rng: RandomNumberGenerator) -> void:
	var horizontal_first := rng.randf() < 0.5
	var p := a
	while p != b:
		if (horizontal_first and p.x != b.x) or p.y == b.y:
			p.x += signi(b.x - p.x)
		else:
			p.y += signi(b.y - p.y)
		for dx in 2:
			for dy in 2:
				var c := p + Vector2i(dx, dy)
				if c.x > 0 and c.y > 0 and c.x < W - 1 and c.y < H - 1:
					grid[c.x][c.y] = true

func is_floor(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < W and y < H and grid[x][y]
