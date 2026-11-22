extends CharacterBody3D

signal died
signal stats_changed

const SPEED := 6.0
const ATTACK_RANGE := 2.4
const ATTACK_COOLDOWN := 0.4

var hud: Node
var hp := 100
var max_hp := 100
var damage := 12
var xp := 0
var level := 1
var _cd := 0.0
var _body: Node3D

func _ready() -> void:
	add_to_group("player")
	var col := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.4
	cap.height = 1.8
	col.shape = cap
	col.position.y = 0.9
	add_child(col)
	_body = Node3D.new()
	add_child(_body)
	_box(_body, Vector3(0.7, 0.9, 0.4), Vector3(0, 0.95, 0), Color(0.2, 0.5, 0.9))
	_box(_body, Vector3(0.5, 0.5, 0.5), Vector3(0, 1.65, 0), Color(0.9, 0.75, 0.6))
	_box(_body, Vector3(0.12, 0.12, 1.1), Vector3(0.5, 1.0, -0.5), Color(0.8, 0.8, 0.85)) # sword

func _box(parent: Node3D, size: Vector3, pos: Vector3, color: Color) -> void:
	var m := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = size
	m.mesh = b
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	m.material_override = mat
	m.position = pos
	parent.add_child(m)

func _physics_process(delta: float) -> void:
	_cd = maxf(_cd - delta, 0.0)
	var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if hud and hud.move_vec != Vector2.ZERO:
		dir = hud.move_vec
	var v := Vector3(dir.x, 0, dir.y) * SPEED
	velocity.x = v.x
	velocity.z = v.z
	velocity.y = -1.0
	if dir.length() > 0.1:
		_body.rotation.y = atan2(-dir.x, -dir.y)
	move_and_slide()
	if Input.is_action_just_pressed("attack"):
		attack()

func attack() -> void:
	if _cd > 0.0:
		return
	_cd = ATTACK_COOLDOWN
	var forward := -_body.global_transform.basis.z
	for e in get_tree().get_nodes_in_group("enemies"):
		var to: Vector3 = e.global_position - global_position
		if to.length() <= ATTACK_RANGE and to.normalized().dot(forward) > -0.2:
			e.take_damage(damage)
	var tw := create_tween()
	tw.tween_property(_body, "scale", Vector3(1.2, 1.0, 1.2), 0.06)
	tw.tween_property(_body, "scale", Vector3.ONE, 0.1)

func take_damage(n: int) -> void:
	hp -= n
	stats_changed.emit()
	if hp <= 0:
		died.emit()

func gain_xp(n: int) -> void:
	xp += n
	if xp >= level * 30:
		xp -= level * 30
		level += 1
		max_hp += 10
		damage += 3
		hp = max_hp
	stats_changed.emit()
