extends CanvasLayer
## Virtual joystick (left), attack button (right), HP/level label.

var move_vec := Vector2.ZERO
var player: Node

var _stick_id := -1
var _stick_origin := Vector2.ZERO
var _label: Label
var _stick_bg: ColorRect
var _stick_knob: ColorRect
var _atk_btn: Button
const RADIUS := 90.0

func _ready() -> void:
	_label = Label.new()
	_label.position = Vector2(20, 12)
	_label.add_theme_font_size_override("font_size", 28)
	add_child(_label)
	_stick_bg = ColorRect.new()
	_stick_bg.size = Vector2.ONE * RADIUS * 2
	_stick_bg.color = Color(1, 1, 1, 0.15)
	_stick_bg.visible = false
	add_child(_stick_bg)
	_stick_knob = ColorRect.new()
	_stick_knob.size = Vector2.ONE * 70
	_stick_knob.color = Color(1, 1, 1, 0.45)
	_stick_knob.visible = false
	add_child(_stick_knob)
	_atk_btn = Button.new()
	_atk_btn.text = "ĐÁNH"
	_atk_btn.custom_minimum_size = Vector2(170, 170)
	_atk_btn.anchor_left = 1.0
	_atk_btn.anchor_right = 1.0
	_atk_btn.anchor_top = 1.0
	_atk_btn.anchor_bottom = 1.0
	_atk_btn.offset_left = -210
	_atk_btn.offset_right = -40
	_atk_btn.offset_top = -210
	_atk_btn.offset_bottom = -40
	_atk_btn.pressed.connect(func(): if player: player.attack())
	add_child(_atk_btn)

func refresh() -> void:
	if player:
		_label.text = "HP %d/%d   Lv %d   XP %d" % [player.hp, player.max_hp, player.level, player.xp]

func _input(e: InputEvent) -> void:
	var half := get_viewport().get_visible_rect().size.x * 0.5
	if e is InputEventScreenTouch:
		if e.pressed and _stick_id == -1 and e.position.x < half:
			_stick_id = e.index
			_stick_origin = e.position
			_stick_bg.position = e.position - _stick_bg.size / 2
			_stick_bg.visible = true
			_stick_knob.visible = true
			_stick_knob.position = e.position - _stick_knob.size / 2
		elif not e.pressed and e.index == _stick_id:
			_stick_id = -1
			move_vec = Vector2.ZERO
			_stick_bg.visible = false
			_stick_knob.visible = false
	elif e is InputEventScreenDrag and e.index == _stick_id:
		var off: Vector2 = (e.position - _stick_origin).limit_length(RADIUS)
		move_vec = off / RADIUS
		_stick_knob.position = _stick_origin + off - _stick_knob.size / 2
