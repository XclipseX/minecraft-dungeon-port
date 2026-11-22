# Blocky Depths

Game dungeon crawler hành động góc nhìn isometric, phong cách voxel, **hoàn toàn offline** cho Android.
Dự án gốc (không dùng tài sản/mã/tên của Minecraft hay Minecraft Dungeons), viết bằng **Godot 4.3+**.

## Tính năng hiện có
- Dungeon sinh ngẫu nhiên (phòng + hành lang)
- Nhân vật, quái đuổi theo, chiến đấu cận chiến, XP/lên cấp
- Joystick ảo + nút đánh (cảm ứng); WASD + Space trên PC
- Không cần quyền Internet

## Chạy thử
Mở thư mục bằng Godot 4.3+ và nhấn F5.

## Xuất APK
1. Cài Android SDK + JDK 17, đặt đường dẫn trong *Editor Settings → Export → Android*.
2. Cài Android export templates.
3. *Project → Export → Android* → Export Project (preset có sẵn trong `export_presets.cfg`).

## Hướng phát triển
Boss, nhiều loại vũ khí/loot, kỹ năng, lưu game (`user://`), âm thanh, màn chơi theo tầng.
