# AUTOPILOT MODE — Zombie Apolycase

Bạn đang chạy ở chế độ **tự động dài hạn, không có người giám sát trực tiếp**.
Tôi sẽ không trả lời câu hỏi trong lúc bạn chạy — vì vậy **không bao giờ dừng lại
để hỏi tôi**. Nếu gặp điều mơ hồ, tự đưa ra quyết định hợp lý nhất, ghi lại lý do
trong commit message, và tiếp tục.

## Nguồn sự thật

`claude.md` ở gốc repo là tài liệu tham chiếu duy nhất về kiến trúc, pattern,
và quy ước của codebase. **Đọc lại file này trước khi bắt đầu mỗi task mới**
(không chỉ một lần ở đầu session) — vì bạn sẽ tự cập nhật nó liên tục và nó
có thể đã thay đổi so với lúc bạn đọc lần trước.

## Vòng lặp làm việc (lặp lại vô hạn cho đến khi hết task hoặc bị dừng)

Với MỖI task, thực hiện đúng các bước theo thứ tự sau, không bỏ bước:

1. **Chọn 1 task duy nhất, nhỏ, cụ thể.** Không gộp nhiều thay đổi không liên
   quan vào một lần sửa. Lấy task từ một trong các nguồn sau, theo thứ tự ưu tiên:
   - Bug hoặc vi phạm pattern đã ghi trong "Các Pattern Quan Trọng" của claude.md
     mà bạn phát hiện khi đọc code
   - Mất cân bằng gameplay rõ ràng (ví dụ: 1 skill quá mạnh/yếu so với rarity
     của nó, 1 tower vô dụng, scaling wave làm game không thể chơi được)
   - Thiếu sót trong cây skill (node base skill tree chưa có hiệu ứng rõ ràng,
     hoặc node không cân bằng so với cost crystal)
   - Cải thiện UI/UX nhỏ (đã có pattern trong HUD.ts/BreakPanel.ts) — không tự
     ý đổi sang framework hay đổi kiến trúc DOM/innerHTML hiện có
   - Polish hiệu ứng hình ảnh/âm thanh theo đúng pattern EffectsManager/AudioManager
     đã có, không tạo hệ thống effect mới song song
   - Dọn dẹp code: loại bỏ field/hàm "legacy" đã ghi chú trong claude.md
     (ví dụ `titanSplashPending`, `BASE_SKILL_POOL` cũ) **chỉ khi** đã xác nhận
     không còn nơi nào dùng

2. **Trước khi sửa code**, lướt qua các file liên quan trực tiếp đến task để
   xác nhận pattern hiện tại (đừng chỉ tin claude.md mù quáng — nó có thể lệch
   so với code thực tế nếu lần cập nhật trước bị sót).

3. **Sửa code**, tuân thủ nghiêm các quy ước đã ghi trong "Các Pattern Quan Trọng"
   (1–18) của claude.md. Đặc biệt:
   - Không bypass `game.resources.spend()`, `game.placeTower()`, `game.onZombieDead()`
   - Không tạo lại hệ thống effect/animation song song với cái đã có
   - Giữ nguyên kiến trúc: không thêm framework, không đổi sang React/Vue
   - Theme màu lấy từ `T` trong `theme.ts`, không hard-code hex mới trừ khi
     thêm vào `theme.ts` trước

4. **Build bắt buộc:** chạy `npm run build` (hoặc `tsc --noEmit` nếu build quá
   chậm để lặp nhanh, nhưng phải chạy `npm run build` đầy đủ trước khi commit).
   - Nếu lỗi → sửa ngay, không chuyển task khác cho đến khi build sạch.
   - Không bao giờ commit code không build được.

5. **Tự kiểm tra logic** bằng cách đọc lại đoạn code vừa sửa và lần theo luồng
   dữ liệu thủ công (vì không có test tự động) — đặc biệt với thay đổi số liệu
   cân bằng (damage, HP, cost), kiểm tra đơn vị và scale có hợp lý với các giá
   trị tương đương khác trong cùng bảng/pool không.

6. **Cập nhật `claude.md`** ngay trong cùng task nếu thay đổi ảnh hưởng đến:
   bảng số liệu (Tower Profiles, Weapon Profiles, skill tables), cấu trúc field
   mới trên entity, pattern mới, hoặc field/hàm bị xóa. Đây không phải bước
   tùy chọn — nếu claude.md lệch so với code, task coi như **chưa xong**.

7. **Commit git bằng tiếng Anh**, message ngắn, rõ, theo format
   `[category] short description`. Category là một trong:
   `balance`, `fix`, `feature`, `skill-tree`, `ui`, `effects`, `cleanup`, `docs`.
   Ví dụ:
   `[balance] Reduce shotgun_870 damage from 12x8 to 10x8, was overperforming for its cost`
   `[fix] Spitter zombie gets stuck when aggro target moves out of range`
   `[skill-tree] Add missing visual feedback for garrisonArmored node`
   `[docs] Sync claude.md tower profile table with code changes`
   Mỗi commit chỉ chứa 1 task. Không gộp "misc fixes". Commit message viết
   bằng tiếng Anh, súc tích, đúng ngữ pháp — đây là quy ước chuẩn cho repo này.

8. **Quay lại bước 1** với task tiếp theo. Không tự dừng, không tóm tắt giữa
   chừng, không hỏi "bạn có muốn tôi tiếp tục không" — cứ tiếp tục cho đến khi
   hết ý tưởng hợp lý để cải thiện hoặc gặp lỗi không tự sửa được.

## Giới hạn cứng — không bao giờ làm

- Không refactor kiến trúc lớn (đổi rendering pipeline, đổi state management,
  thêm framework) trong autopilot — việc đó cần thảo luận với tôi trực tiếp.
- Không xóa hoặc viết lại toàn bộ một hệ thống lớn (ví dụ viết lại hết
  SkillManager) trong 1 task — chỉ sửa tăng dần.
- Không đổi tỉ lệ rarity weight (`60/30/10`) hoặc core game loop
  (`enterBreak`/`exitBreak` timing) trừ khi đó chính là task đang làm và có
  lý do rõ trong commit message.
- Không bao giờ revert commit trước đó để "thử cách khác" mà không ghi rõ lý do.
- Nếu một thay đổi cân bằng trước đó (đọc từ git log) có vẻ sai, **sửa tiếp lên
  trên nó** bằng commit mới, không quietly undo.

## Khi nào dừng vòng lặp

Dừng và báo cáo (không tiếp tục im lặng) nếu:
- Build lỗi liên tục không tự sửa được sau ~3 lần thử trên cùng 1 task
- Phát hiện mâu thuẫn nghiêm trọng giữa claude.md và code mà không rõ cái nào
  đúng (ví dụ field được claude.md nói đã xóa nhưng vẫn được gọi ở nhiều nơi)
- Hết ý tưởng cải thiện hợp lý (đã rà soát hết các mục trong checklist bước 1)

Khi dừng, để lại 1 commit `[autopilot] Pause session — <short reason>` tóm tắt
ngắn các task đã làm trong session và đề xuất hướng tiếp theo (commit message
này cũng viết bằng tiếng Anh).

## Bắt đầu

Đọc `claude.md`, sau đó liệt kê ra (trong đầu, không cần in ra cho tôi) 5–10
task ứng viên theo thứ tự ưu tiên ở bước 1, rồi bắt đầu task đầu tiên ngay.