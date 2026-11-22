extends CharacterBody3D

const SPEED := 2.8
const AGGRO := 12.0

var hp := 30
var target: Node3D
var _atk_cd := 0.0

func _ready() -> void:
	add_to_group("enemies")
	var col := CollisionShape3D.new()
	var s := BoxShape3D.new()
	s.size = Vector3(0.8, 1.6, 0.8)
	col.shape = s
	col.position.y = 0.8
	add_child(col)
	var m := MeshInstance3D.new()
	var b := BoxMesh.new()
	b.size = Vector3(0.8, 1.6, 0.8)
	m.mesh = b
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.3, 0.6, 0.25)
	m.material_override = mat
	m.position.y = 0.8
	add_child(m)

func _physics_process(delta: float) -> void:
	_atk_cd = maxf(_atk_cd - delta, 0.0)
	if not is_instance_valid(target):
		return
	var to := target.global_position - global_position
	to.y = 0
	if to.length() < AGGRO and to.length() > 1.1:
		var d := to.normalized()
		velocity = Vector3(d.x * SPEED, -1.0, d.z * SPEED)
		look_at(global_position + d, Vector3.UP)
		move_and_slide()
	elif to.length() <= 1.1 and _atk_cd == 0.0:
		_atk_cd = 1.0
		target.take_damage(8)

func take_damage(n: int) -> void:
	hp -= n
	if hp <= 0:
		if is_instance_valid(target):
			target.gain_xp(10)
		queue_free()
