# Tu Tiên Ký - Idle RPG (MVP v1)

Web game tu tiên offline chạy trên trình duyệt: Vue 3 + Vite + TailwindCSS + PixiJS 8 + Pinia + break_infinity.js.

## Chạy local

```bash
npm install
npm run dev      # mở http://localhost:5173
```

Các lệnh khác:

```bash
npm run build    # build production (cũng là bước kiểm tra cú pháp toàn bộ file .vue/.js)
npm run check    # build + smoke test logic (scripts/smoke-test.mjs)
npm run preview  # chạy bản build
```

## Cấu trúc

```
src/
  main.js, App.vue, style.css
  game/        constants.js (cảnh giới, căn cốt, cân bằng)  formulas.js (công thức)
               format.js (số lớn)  events.js (bus store -> Pixi)
  stores/      gameStore.js (Pinia: state, getters, actions, offline, độ kiếp)
  services/    saveService.js (LocalStorage, export/import .json)
  pixi/        CultivatorScene.js (nền parallax, nhân vật, hạt, sấm sét)
  components/  GameCanvas, Dashboard, ProgressBar, LogPanel, OfflineModal, tabs/*
scripts/       smoke-test.mjs
```

## Đã có trong v1

- Cảnh giới Luyện Khí 1-9, Trúc Cơ, Kim Đan, Nguyên Anh (sơ/trung/hậu); tỉ lệ đột phá 90% giảm dần.
- Lôi Kiếp (3 đạo ở Trúc Cơ -> Kim Đan, 9 đạo ở Kim Đan -> Nguyên Anh), tính theo Khí huyết và Phòng ngự.
- Linh khí thụ động theo căn cốt + Tụ Linh Trận; nút Tụ Khí, Đột Phá, nhật ký cuộn.
- Autosave mỗi 5 giây, Export/Import `.json`, offline progress tối đa 8 giờ.

## Giai đoạn 1 (đã có)

- **Bí Cảnh:** 5 bí cảnh theo cảnh giới (6 tầng, tầng cuối là boss), auto-battle theo Thân pháp, chí mạng, tự lặp, tự dùng Hồi Huyết Đan, yêu thú vẽ trên canvas (4 dạng: thú, xà, linh, tượng).
- **Rơi đồ:** linh thạch, thảo dược, khoáng thạch, tàn quyển (gom 3 bản để lĩnh ngộ); dữ liệu trong `src/game/data.js`.
- **Túi đồ:** dùng đan, lĩnh ngộ, bán lấy linh thạch. Chỉ số vĩnh viễn giảm hiệu quả theo số lần dùng (kháng đan).
- **Luyện Đan:** 9 công thức, cấp Luyện Đan tăng tỉ lệ ra gấp đôi; có Phá Cảnh Đan (tăng tỉ lệ đột phá) và Hộ Kiếp Đan (giảm sát thương lôi).
- **Cân bằng:** `npm run sim` mô phỏng số tầng/tỉ lệ hạ boss theo bậc; chỉnh hệ số ở `difficulty` của từng bí cảnh trong `data.js`.

## Giai đoạn 2 (đã có)

- **Ngũ hành:** mỗi nhân vật một hệ (Kim/Mộc/Thủy/Hỏa/Thổ), yêu thú cũng có hệ; hệ khắc +20% sát thương, bị khắc -15%. Tab Bí Cảnh hiện mũi tên lợi/hại cho từng bí cảnh.
- **Công pháp:** 6 thần thông (sát thương, hồi máu, lá chắn, tăng tốc, làm chậm), học bằng tàn quyển rơi từ bí cảnh, 5 cấp, 3 ô mở theo đại cảnh giới, tự thi triển khi hồi chiêu xong.
- **Trang bị:** vũ khí / y phục / pháp bảo, 5 phẩm cấp x 4 độ hiếm, cường hoá +10; rèn ở Động Phủ hoặc boss rơi. Pháp bảo còn tăng tốc độ linh khí.
- **Kỳ ngộ ngẫu nhiên:** 8 sự kiện có lựa chọn và rủi ro (có cả giao chiến mô phỏng); chiến đấu tự tạm dừng khi hộp thoại hiện.
- **Thành tựu:** 11 thành tựu nhiều mốc, nhận thưởng linh thạch và chỉ số vĩnh viễn.
- Dữ liệu ở `src/game/{elements,skills,equipment,randomEvents,achievements}.js`. `npm run sim` có thêm bảng ảnh hưởng của ngũ hành.

## Giai đoạn 3 (đã có)

- **Thêm cảnh giới:** Hóa Thần, Luyện Hư, Hợp Thể (27 bậc), mỗi đại cảnh giới có thiên kiếp 9 đạo riêng; thêm 3 bí cảnh (Thái Cổ Ma Uyên, Hư Không Giới, Hỗn Độn Sơ Khai), 3 phẩm cấp trang bị, vật phẩm và đan mới.
- **Luân Hồi:** từ Trúc Cơ Sơ Kỳ trở lên, đặt lại tiến trình để nhận Đạo Vận (`3 x 1.4^(bậc - 9)`); mua 6 cường hoá vĩnh viễn (Tu Chất, Thân Thể, Phúc Duyên, Túc Huệ, Thiên Mệnh, Bế Quan Dài). Giữ công pháp, trang bị, cấp Luyện Đan, thành tựu.
- **Linh Điền và Khoáng Mạch:** 6 loại cây, 2-6 luống mở theo tu vi, khoáng mạch tích luỹ tối đa 8 giờ; tính theo giờ thật nên chạy cả khi offline.
- **Farm offline:** nếu đang farm bí cảnh (bật tự động lặp) lúc thoát, quay lại sẽ nhận thu hoạch ước lượng bằng mô phỏng ở hiệu suất 50% (bỏ qua ngũ hành và công pháp). Dữ liệu: `src/game/{reincarnation,garden}.js`, `simulateOfflineFarm` trong `battle.js`.

## Làm mềm độ khó (đã có)

- **Kiên Trì:** mỗi lần tử trận trong một bí cảnh, lượt sau ở đó được +5% khí huyết/công/thủ (tối đa +30%), mất khi hạ boss. Hiện ở tab Bí Cảnh và log.
- **Ngẫu nhiên hơn:** sát thương mỗi đòn dao động ±20%; mỗi yêu thú sinh ra lệch ±20% khí huyết và công kích.
- `npm run sim` có thêm đường cong "hạ boss theo hệ số sức mạnh" và "số lượt thử trung bình để hạ boss nhờ Kiên Trì".

## Hình ảnh & âm thanh (đã có)

- **Nền theo bí cảnh** (`src/pixi/themes.js`): mỗi bí cảnh một bầu trời, bối cảnh tiền cảnh cuộn chậm (rừng, hang động, băng, nghĩa địa, dung nham, hư không) và hạt khí quyển (lá, bào tử, tro tàn, tuyết, ma trơi, tinh tú).
- **Chiêu thức theo ngũ hành** (`src/pixi/vfx.js`): Kim phi kiếm + vệt chém, Hỏa cầu lửa nổ, Thủy mảnh băng + bông tuyết, Mộc dây leo, Thổ gai đá; khiên dạng vòm, hồi máu, tăng tốc có hiệu ứng riêng; đòn trúng được trễ khớp lúc chiêu bay tới.
- **Nhân vật sống động:** bùa chú xoay quanh người (nhiều hơn khi cảnh giới cao), dải lụa bay trong gió; đột phá có cột sáng, tia sáng toả ra và chữ ĐỘT PHÁ.
- **Âm thanh tổng hợp bằng WebAudio** (`src/game/audio.js`, không cần file): tiếng bấm, đòn đánh, chiêu thức, sấm sét, đột phá; nhạc nền ngũ cung, nhịp trống khi chiến đấu. Bật/tắt riêng trong Cài Đặt.

## Giao diện UI (đã có)

- **Phong cách thủy mặc - vàng kim:** khung `panel` viền vàng mảnh với góc trang trí, thẻ `card` gradient, nút có độ nổi và hiệu ứng nhấn; mọi lớp dùng chung nằm ở `src/style.css`.
- **Icon SVG nét mảnh** (`components/Icon.vue`, ~25 icon) cho điều hướng, chỉ số, tài nguyên, nút hành động.
- **HUD trên canvas:** biển hiệu cảnh giới + hệ ngũ hành, chip linh thạch / Đạo Vận / bí cảnh đang đánh, thanh khí huyết viền vàng.
- **Thanh tu vi** có vạch chia 25%, vệt sáng chạy, nhấp nháy khi đầy; nút Đột Phá toả sáng khi sẵn sàng.
- **Điều hướng dưới đáy** 2 hàng x 5 có icon (thuận ngón cái), chuyển tab có hiệu ứng; nhật ký thu gọn thành một dòng, chạm để mở rộng.
- Hộp thoại xuất quan / kỳ ngộ có khung trang trí và hiệu ứng hiện dần; hỗ trợ vùng an toàn (tai thỏ).

## Chiều sâu lối chơi (đã có)

- **Tông Môn** (`src/game/sect.js`): 5 tông môn theo ngũ hành, mỗi nơi một đặc quyền (công kích, thảo dược, tốc độ linh khí, sát thương công pháp, khí huyết/phòng ngự). 6 cấp bậc theo tổng Cống Hiến (Ngoại Môn -> Chưởng Môn), mỗi cấp tăng 25% đặc quyền và mở thêm chỗ đệ tử và hàng ở cửa hàng. Đổi tông môn mất 50% Cống Hiến. Giữ nguyên khi luân hồi.
- **Nhiệm vụ** (`src/game/quests.js`): bảng 4 nhiệm vụ tự sinh theo tu vi (hạ yêu thú, boss, thông quan, thu hoạch, luyện đan, rèn, tụ khí, đột phá, kỳ ngộ), 3 độ khó; thưởng linh thạch, Cống Hiến và vật phẩm; có thể làm mới bằng linh thạch.
- **Cửa hàng Cống Hiến:** đổi đan quý, quặng, tàn quyển công pháp, mở dần theo cấp bậc. Cống Hiến kiếm từ nhiệm vụ và hạ boss.
- **Đệ tử** (`src/game/disciples.js`): thu nhận bằng linh thạch (giá nhân đôi mỗi người), 4 phẩm cấp, cấp 1-20 (trần theo tu vi), giao việc Hái Thuốc / Khai Khoáng / Trấn Thủ; sản lượng tích luỹ theo giờ thật tối đa 8 giờ, cùng hệ tông môn được +10%.
- Bản đồ hệ thống mới nối với thành tựu "Cần Mẫn Việc Tông" và có test (`npm run check`).

## Cốt truyện (đã có)

- **Câu chuyện chính** (`src/game/story.js`): chương mở đầu + 10 chương gắn với các cảnh giới và bí cảnh, từ cô nhi nhặt về ở Thanh Hư Cốc đến cuộc đối mặt với Thái Cổ Ma Thần nơi Hỗn Độn. Cốt truyện gắn với cơ chế luân hồi: nhân vật là nửa thần hồn của Đạo Tổ thứ chín, mỗi kiếp là một lần gia cố phong ấn.
- **Lựa chọn có hệ quả:** cờ cốt truyện (ví dụ chia linh thảo cho Mặc Vô Ngân, tha hay giết A Tử), điểm Nhân Tâm (+) / Sát Đạo (-), thưởng chỉ số khác nhau; cảnh thoại đổi theo cờ. 3 kết cục (Thủ Hộ, Ma Đạo, Siêu Thoát cần Nhân Tâm >= 4 và ký ức Băng Phong) kèm danh hiệu hiện ở HUD.
- **Trình đọc truyện** (`StoryModal.vue`): lời dẫn, thoại có màu theo nhân vật, nhập tên nhân vật ở đầu game, đọc lại chương đã xong (không thưởng, không đổi lựa chọn). Truyện tự mở khi đủ điều kiện và tạm dừng chiến đấu/kỳ ngộ.
- **Điển Tịch** (`src/game/lore.js`): ~35 mục (Thế giới, Cảnh giới, Bí cảnh, Tông môn, Nhân vật, Khái niệm) mở dần theo tiến độ, có chấm đỏ cho mục mới.
- **Lời dẫn trong nhật ký:** đột phá lên đại cảnh giới và vào bí cảnh có câu văn tả cảnh. Chương phụ "Chuyển Thế" mở sau lần luân hồi đầu tiên.

## Nhân vật & quái (đã có)

- **13 kiểu quái** vẽ bằng code, chuyển động mỗi khung (`src/pixi/art.js`): sói/thú, rắn, linh thể, tượng đá, vượn, mộc yêu, thi quỷ, ma tướng có cánh, phượng băng, u hồn, bộ xương cầm kiếm, rồng, dơi. Mỗi kiểu có hoạt ảnh chờ (thở, vẫy đuôi, đập cánh) và động tác tấn công riêng (há miệng, vung tay, bổ kiếm, phun lửa). Mỗi quái trong `data.js` có kiểu hình riêng.
- **Nhân vật đổi trang phục theo 7 đại cảnh giới:** áo vải, áo ngọc, giáp vai và mão vàng, áo choàng tím + thần hồn Nguyên Anh, vòng hào quang Hóa Thần, sao trời Luyện Hư, vầng sáng và cánh ánh sáng Hợp Thể.
- **Sống động hơn:** nét mặt chi tiết, chớp mắt khi đứng, mắt sáng lên khi linh khí đầy (sẵn sàng đột phá), nghiêng người và vệt chém cong khi đánh thường.
- **Vũ khí đổi theo độ hiếm** của vũ khí đang trang bị (Phàm / Linh / Bảo / Tiên: màu lưỡi, chắn kiếm có cánh, hào quang).
- **Bạch Linh** (hồ ly) đồng hành sau chương "Đồng Môn": thêm một đuôi mỗi 3 bậc tu vi (tối đa 9), nhún nhảy khi chủ ra đòn.
- **Chân dung** cho 6 nhân vật trong hộp thoại truyện (Thanh Hư, Mặc Vô Ngân, Bạch Linh, A Tử, Hồn Cũ, Thái Cổ Ma Thần).

## Rà soát cân bằng (đã làm)

Công cụ: `npm run econ` chạy một "người chơi tự động" bằng chính store của game trên đồng hồ ảo
(`scripts/economy-sim.mjs`; tuỳ chọn `--rebirth --seeds 4 --autobreak --act 1800`). Nó đo thời gian mỗi cảnh giới,
nguồn linh khí, dòng linh thạch, Cống Hiến và nhịp luân hồi. `npm run sim` vẫn đo độ khó chiến đấu.

Vấn đề tìm ra và cách sửa:

| Vấn đề | Đo được | Sửa |
|---|---|---|
| Cả game xong trong 20 phút | Hạ quái cho 8-15 giây sản lượng và tỉ lệ thuận với Tụ Linh Trận | Thưởng linh khí hạ quái còn 3-5 giây, giảm 30% mỗi bậc vượt bí cảnh; kỳ ngộ tối đa 0.8% yêu cầu |
| Tụ Linh Trận nhân tốc độ hàng trăm lần | x90 ở cấp 45 | Tăng tuyến tính +10%/cấp, giá nhân 1.4 mỗi cấp |
| Đan Ngộ Đạo / tàn quyển cộng dồn vô hạn | +558% linh khí, +228.000 khí huyết | Kháng đan 0.93^n không có sàn: tổng hữu hạn |
| Tụ Khí Đan nhảy một bậc mỗi viên | 1 viên = 1 bậc | Tối đa 10% yêu cầu, mỗi viên liên tiếp trong cùng bậc còn 60% |
| Kỳ ngộ dừng chiến đấu | Người chơi ghé 30 phút/lần chậm gấp 4 lần | Không dừng chiến đấu; bỏ ngỏ 90 giây thì tự chọn phương án an toàn |
| Cống Hiến lên Chưởng Môn sau 6 giờ | 77.000/6 giờ | Boss 1 thay vì 5, nhiệm vụ 3 thay vì 6, giảm khi vượt bậc |
| Đệ tử gần như vô nghĩa | 0.01% thu nhập | Trấn Thủ ~60 lần hạ quái/giờ, Hái Thuốc 12/giờ |
| Căn cốt chênh nhau 3 lần | 0.8x đến 2.5x | 0.85x đến 1.9x |
| Phải bấm đột phá mỗi bậc | Bậc đầu chỉ 1 phút | Tuỳ chọn "Tự động đột phá bậc nhỏ" (bậc có thiên kiếp vẫn bấm tay) |

Nhịp sau khi chỉnh (người chơi tự động luôn trực tuyến, 4 hạt giống): kiếp đầu 16-30 giờ ảo (trung bình ~24), người ghé 30 phút/lần
~29 giờ, kiếp 2 còn 11-13 giờ nhờ Đạo Vận. Bậc đầu 1-20 phút, giữa 20-90 phút, cuối 2-6 giờ.
Các hằng số nằm trong `BALANCE` (`src/game/constants.js`) và có test bảo vệ trong `scripts/smoke-test.mjs`.

## Chơi thử và chỉnh (đã làm)

Chơi thử như người chơi mới trên khung điện thoại 375px và chỉnh các chỗ vướng:

- **Gợi ý "việc nên làm":** dòng gợi ý trên bảng nội dung (`src/game/guide.js`) nhắc việc kế tiếp theo tiến độ: đột phá, thiên kiếp, vào bí cảnh, nâng Tụ Linh Trận, luyện đan, Linh Điền, nhận nhiệm vụ / thành tựu, gia nhập tông môn, học công pháp, mặc trang bị, thu đệ tử, luân hồi. Có nút "Đi" mở đúng tab và nút tắt gợi ý.
- **Bảng nội dung cao hơn ~25%** trên điện thoại: canvas 36%, nút hành động, thanh điều hướng và nhật ký gọn hơn.

Ý tưởng tiếp theo: âm thanh, sprite thật, làm mềm độ khó chiến đấu theo bậc, PWA.

## Mỗi tab một màn hình

- 13 màn hình riêng (`src/game/screens.js`), thanh điều hướng đáy 2 hàng x 7 ô; màn cuối được ghi nhớ.
- Chỉ **Nhân Vật** (canvas tu luyện) và **Bí Cảnh** (canvas chiến đấu) có cảnh PixiJS ở trên; các màn khác chiếm toàn bộ chiều cao.
- Thanh trên (`TopBar`) luôn hiện: cảnh giới, linh thạch, Đạo Vận, tiến độ tu vi, nút Nhật ký; khi đủ linh khí ở màn khác có nút "Đột Phá!" đưa về màn Nhân Vật.
- Một thể hiện Pixi duy nhất, ẩn bằng CSS khi ở màn khác và vẽ 4 khung/giây; logic game vẫn chạy.

## Kỳ ngộ và thành tựu mở rộng (đã có)

- **18 kỳ ngộ** (thêm 10): Thương Nhân Bí Ẩn, Thác Nước Linh Tuyền, Cổ Kiếm Cắm Đá, Tà Tu Chặn Đường, Bí Cảnh Nhỏ Mở Ra, Lão Đạo Chỉ Điểm, Hỏa Sơn Phun Trào, Ma Âm Quấy Nhiễu, Thiên Lôi Giáng Xuống, Kho Báu Thượng Cổ. Mở dần theo cảnh giới, từ Luyện Khí đến Hóa Thần.
- **19 thành tựu** (thêm 5): Bách Chiết Bất Hồi, Kiên Trì Đạo Tâm, Nghiện Đan, Đệ Tử Đầy Nhà, Kho Pháp Khí. Tính từ dữ liệu có sẵn nên không cần đổi định dạng save.

## PWA và triển khai

- Cài lên màn hình chính, chạy offline (`public/manifest.webmanifest`, `public/sw.js`, `public/icons/`).
- Đẩy lên nhánh `main` thì GitHub Actions (`.github/workflows/deploy.yml`) tự build và đăng lên GitHub Pages.
