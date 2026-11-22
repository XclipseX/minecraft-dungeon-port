extends Node3D
## Builds the whole game in code: dungeon, player, enemies, camera, HUD.

const CELL := 2.0
const CAM_OFFSET := Vector3(9, 11, 9)

var gen := DungeonGen.new()
var player: CharacterBody3D
var cam: Camera3D
var hud: CanvasLayer
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	_setup_input()
	rng.randomize()
	gen.generate(rng)
	_build_world()
	_spawn_player()
	_spawn_enemies()
	_setup_camera_and_light()
	hud = preload("res://scripts/hud.gd").new()
	add_child(hud)
	hud.player = player
	player.hud = hud
	player.stats_changed.connect(hud.refresh)
	player.died.connect(func(): get_tree().reload_current_scene())
	hud.refresh()

func _setup_input() -> void:
	var map := {
		"move_left": KEY_A, "move_right": KEY_D,
		"move_up": KEY_W, "move_down": KEY_S, "attack": KEY_SPACE,
	}
	for a in map:
		if not InputMap.has_action(a):
			InputMap.add_action(a)
			var ev := InputEventKey.new()
			ev.keycode = map[a]
			InputMap.action_add_event(a, ev)

func _mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	return m

func _build_world() -> void:
	var floor_mat := _mat(Color(0.35, 0.33, 0.3))
	var wall_mat := _mat(Color(0.2, 0.2, 0.24))
	var body := StaticBody3D.new()
	add_child(body)
	for x in DungeonGen.W:
		for y in DungeonGen.H:
			var p := Vector3(x * CELL, 0, y * CELL)
			if gen.is_floor(x, y):
				_block(body, p + Vector3(0, -0.25, 0), Vector3(CELL, 0.5, CELL), floor_mat)
			elif _near_floor(x, y):
				_block(body, p + Vector3(0, 1.5, 0), Vector3(CELL, 3.0, CELL), wall_mat, true)

func _near_floor(x: int, y: int) -> bool:
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if gen.is_floor(x + dx, y + dy):
				return true
	return false

func _block(parent: Node, pos: Vector3, size: Vector3, mat: Material, solid := true) -> void:
	var m := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	m.mesh = b
	m.material_override = mat
	m.position = pos
	parent.add_child(m)
	if solid:
		var c := CollisionShape3D.new()
		var s := BoxShape3D.new()
		s.size = size
		c.shape = s
		c.position = pos
		parent.add_child(c)

func _room_world_center(r: Rect2i) -> Vector3:
	var c := r.position + r.size / 2
	return Vector3(c.x * CELL + CELL * 0.5, 0.5, c.y * CELL + CELL * 0.5)

func _spawn_player() -> void:
	player = preload("res://scripts/player.gd").new()
	add_child(player)
	player.global_position = _room_world_center(gen.rooms[0])

func _spawn_enemies() -> void:
	var enemy_script := preload("res://scripts/enemy.gd")
	for i in range(1, gen.rooms.size()):
		var r: Rect2i = gen.rooms[i]
		for n in rng.randi_range(2, 4):
			var e: CharacterBody3D = enemy_script.new()
			e.target = player
			add_child(e)
			var cx := rng.randi_range(r.position.x, r.end.x - 1)
			var cy := rng.randi_range(r.position.y, r.end.y - 1)
			e.global_position = Vector3(cx * CELL + CELL * 0.5, 0.5, cy * CELL + CELL * 0.5)

func _setup_camera_and_light() -> void:
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 18.0
	add_child(cam)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, 35, 0)
	add_child(sun)
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color(0.05, 0.05, 0.08)
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.5, 0.5, 0.6)
	env.environment = e
	add_child(env)

func _process(_d: float) -> void:
	if is_instance_valid(player) and cam:
		cam.global_position = player.global_position + CAM_OFFSET
		cam.look_at(player.global_position, Vector3.UP)
