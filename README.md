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

- **Bí Cảnh** (đã thay bằng Vượt Ải, xem mục "Vượt Ải" ở dưới): auto-battle theo Thân pháp, chí mạng, tự dùng Hồi Huyết Đan, yêu thú vẽ trên canvas (4 dạng: thú, xà, linh, tượng).
- **Rơi đồ:** linh thạch, thảo dược, khoáng thạch, tàn quyển (gom 3 bản để lĩnh ngộ); dữ liệu trong `src/game/data.js`.
- **Túi đồ:** dùng đan, lĩnh ngộ, bán lấy linh thạch. Chỉ số vĩnh viễn giảm hiệu quả theo số lần dùng (kháng đan).
- **Luyện Đan:** 9 công thức, cấp Luyện Đan tăng tỉ lệ ra gấp đôi; có Phá Cảnh Đan (tăng tỉ lệ đột phá) và Hộ Kiếp Đan (giảm sát thương lôi).
- **Cân bằng:** `npm run sim` đo ải cao nhất qua được theo bậc tu vi (xem mục "Vượt Ải").

## Giai đoạn 2 (đã có)

- **Ngũ hành:** mỗi nhân vật một hệ (Kim/Mộc/Thủy/Hỏa/Thổ), yêu thú cũng có hệ; hệ khắc +20% sát thương, bị khắc -15%. Tab Bí Cảnh hiện mũi tên lợi/hại cho từng bí cảnh.
- **Võ kỹ** (chiêu thức chủ động, xem mục "Võ Kỹ và Công Pháp"): học bằng tàn quyển, 5 cấp, ô mở theo đại cảnh giới, tự thi triển khi hồi chiêu xong.
- **Trang bị:** vũ khí / y phục / pháp bảo, 5 phẩm cấp x 4 độ hiếm, cường hoá +10; rèn ở Động Phủ hoặc boss rơi. Pháp bảo còn tăng tốc độ linh khí.
- **Kỳ ngộ ngẫu nhiên:** 8 sự kiện có lựa chọn và rủi ro (có cả giao chiến mô phỏng); chiến đấu tự tạm dừng khi hộp thoại hiện.
- **Thành tựu:** 11 thành tựu nhiều mốc, nhận thưởng linh thạch và chỉ số vĩnh viễn.
- Dữ liệu ở `src/game/{elements,skills,equipment,randomEvents,achievements}.js`. Ảnh hưởng ngũ hành vẫn như cũ (+20% / -15%).

## Giai đoạn 3 (đã có)

- **Thêm cảnh giới:** Hóa Thần, Luyện Hư, Hợp Thể (27 bậc), mỗi đại cảnh giới có thiên kiếp 9 đạo riêng; thêm 3 bí cảnh (Thái Cổ Ma Uyên, Hư Không Giới, Hỗn Độn Sơ Khai), 3 phẩm cấp trang bị, vật phẩm và đan mới.
- **Luân Hồi:** từ Trúc Cơ Sơ Kỳ trở lên, đặt lại tiến trình để nhận Đạo Vận (`3 x 1.4^(bậc - 9)`); mua 6 cường hoá vĩnh viễn (Tu Chất, Thân Thể, Phúc Duyên, Túc Huệ, Thiên Mệnh, Bế Quan Dài). Giữ công pháp, trang bị, cấp Luyện Đan, thành tựu.
- **Linh Điền và Khoáng Mạch:** 6 loại cây, 2-6 luống mở theo tu vi, khoáng mạch tích luỹ tối đa 8 giờ; tính theo giờ thật nên chạy cả khi offline.
- **Farm offline:** nếu đang farm bí cảnh (bật tự động lặp) lúc thoát, quay lại sẽ nhận thu hoạch ước lượng bằng mô phỏng ở hiệu suất 50% (bỏ qua ngũ hành và công pháp). Dữ liệu: `src/game/{reincarnation,garden}.js`, `simulateOfflineFarm` trong `battle.js`.

## Làm mềm độ khó (đã có)

- **Kiên Trì:** mỗi lần tử trận trong một bí cảnh, lượt sau ở đó được +5% khí huyết/công/thủ (tối đa +30%), mất khi hạ boss. Hiện ở tab Bí Cảnh và log.
- **Ngẫu nhiên hơn:** sát thương mỗi đòn dao động ±20%; mỗi yêu thú sinh ra lệch ±20% khí huyết và công kích.
- Kiên Trì vẫn còn trong Vượt Ải (mỗi lần thua liên tiếp ở cùng một ải +5% chỉ số, tối đa +30%, xoá khi vượt ải).

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
nguồn linh khí, dòng linh thạch, Cống Hiến và nhịp luân hồi. `npm run sim` đo độ khó của ải.

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

## Vượt Ải (thay cho Bí Cảnh)

Chiến đấu không còn là chọn bí cảnh mà là **chuỗi ải vô hạn**, đánh tự động liên tục (`src/game/campaign.js`, `src/stores/battleStore.js`).

- **Loại ải:** thường; chia hết cho 5 = **Tiểu Boss**; chia hết cho 10 = **Đại Boss**; chia hết cho 100 = **Chúa Tể**. Mỗi 10 ải là một chương, bối cảnh và yêu thú quay vòng qua 8 bí cảnh cũ (hết vòng thì quay lại với yêu thú mạnh hơn).
- **Đánh liên tục:** thắng thì lên ải kế (khí huyết đầy ở mỗi ải); thua thì nghỉ 5 giây rồi thử lại đúng ải đó với Kiên Trì. Có thể tắt "Tự chiến đấu".
- **Thu nhập thụ động theo ải cao nhất đã vượt:** +2% tốc độ linh khí mỗi ải, linh thạch mỗi giây và nguyên liệu mỗi giờ (theo chương). Kẹt ở ải kế tiếp vẫn nhận thu nhập của ải đã vượt. Trần ải được tính thu nhập = 10 + 8 x bậc tu vi, để kiếp mới có trang bị cũ không hưởng thu nhập cao ngay từ bậc đầu.
- **Cày ải đã vượt:** chọn một ải cũ để đánh lặp (cày tàn quyển, trang bị) mà không tiến lên.
- **Phần thưởng:** hạ yêu thú cho linh thạch, ít linh khí, rơi đồ theo chương; boss cho thưởng lần đầu vượt ải, Cống Hiến, trang bị (Tiểu Boss 25%, Đại Boss 70%, Chúa Tể 100%). Cày ải quá yếu so với tu vi (hơn 6 bậc) thì thưởng giảm dần.
- **Offline:** nguyên liệu thụ động cộng đủ; ngoài ra mô phỏng tiếp tục thử ải kế tiếp ở hiệu suất 50%, báo cáo "ải X → ải Y".
- **Luân hồi:** ải cao nhất đặt lại về 0, kỷ lục mọi kiếp được giữ (dùng cho thành tựu "Vượt Ải", cốt truyện, Điển Tịch). Save cũ tự chuyển: mỗi bí cảnh cũ = một chương 10 ải.

**Cân bằng.** `npm run sim` đo ải cao nhất qua được theo bậc tu vi và hệ số chỉ số (người chơi thực tế khoảng x1.1 đầu game đến x4 cuối game nhờ trang bị/đan/công pháp). `npm run econ` (người chơi tự động) sau khi chỉnh:

| Hằng số | Giá trị | Ý nghĩa |
|---|---|---|
| `STAGE_PER_AI` | 0.5 | 2 ải = sức mạnh chuẩn của 1 bậc tu vi |
| `AI_GROWTH` | 1.006 | mỗi ải thêm 0.6% (cộng dồn) ngoài tăng theo bậc |
| `AI_EXP_PER_CLEAR` | 0.02 | +2% linh khí mỗi ải |
| `INCOME_AI_BASE/PER_STAGE` | 10 / 8 | trần ải tính thu nhập theo bậc |
| `BALANCE.requirementGrowth` | 2.26 | tăng từ 2.1 để bù thu nhập từ ải, công pháp, trang bị và các phần thưởng mốc |

Nhịp đo được: kiếp đầu 15-27 giờ ảo (người chơi trực tuyến) và 23-28 giờ (ghé 30 phút/lần); kiếp 2 còn 7-11 giờ; kiếp 3 trở đi 5-8 giờ. Mỗi bậc đầu 1-6 phút, giữa 4-40 phút, cuối 1-7 giờ. Ải cao nhất cuối kiếp 1 khoảng 150-190.

## Võ Kỹ và Công Pháp

Màn **Công Pháp** có hai tab con (`src/components/tabs/SkillsTab.vue`):

- **Võ Kỹ** (`src/game/skills.js`) là chiêu thức chủ động, 13 loại, tự thi triển khi hồi chiêu xong. Ngoài sát thương, hồi máu, lá chắn, tăng tốc và làm chậm còn có: **Độc** (sát thương mỗi giây), **Choáng** (địch mất lượt), **Tuyệt Sát** (gấp đôi khi địch dưới 30% khí huyết), **Hút máu**, **Cuồng Bạo** (tăng công kích), **Phản Chấn** (phản sát thương) và **Tuyệt kỹ** (Thiên Hà Tuyệt Kích, sát thương rất lớn, cần Nguyên Anh để trang bị). Bốn ô, ô thứ tư mở ở Hóa Thần. Tàn quyển rơi ở ải theo chương và bán ở cửa hàng tông môn.
- **Công Pháp** (`src/game/arts.js`) là tăng bị động, 10 loại: linh khí, khí huyết, công kích, phòng ngự, Thân pháp, linh thạch, thu nhập thụ động từ ải, tỉ lệ rơi đồ, sát thương khi khắc hệ, Đạo Vận khi luân hồi. Học xong là cộng chỉ số trực tiếp cho nhân vật (không cần ô trang bị, mọi công pháp đã học đều có hiệu lực), cấp 1-10, mỗi cấp cộng +1,5-2,5%, thăng cấp bằng Công Pháp Tàn Quyển. Công pháp cùng hệ ngũ hành với tông môn được +50%. Tàn quyển rơi từ Tiểu Boss trở lên (công pháp mạnh hơn mở dần theo số ải) và bán ở cửa hàng tông môn từ Chân Truyền.
- Cả hai được giữ nguyên khi luân hồi. Save cũ tải bình thường: 6 võ kỹ cũ giữ nguyên cấp và ô trang bị.

## Đạo Lộ và cây kỹ năng

Từ **Trúc Cơ**, người chơi chọn một **Đạo Lộ** cho kiếp đó (đặt lại khi luân hồi để chọn lại; `src/game/paths.js`). Bốn đạo lộ: Kiếm, Đao, Thể, Phù. Mỗi đạo lộ có đặc quyền riêng và một **cây kỹ năng 8 nút** (`src/game/skilltree.js`, màn Kỹ Năng):

| Đạo lộ | Đặc quyền | Võ Kỹ (4) | Tuyệt Kỹ | Bí Kỹ (buff, 3) |
|---|---|---|---|---|
| Kiếm Tu (Kim) | +15% công kích, +10% chí mạng, chí mạng mạnh hơn, +15% sát thương võ kỹ | Ngự Kiếm Quyết, Phi Kiếm Liên Hoàn, Phong Lôi Kiếm Quyết, Vạn Kiếm Quy Tông | Tru Tiên Nhất Kiếm | Kiếm Tâm Thông Minh, Đạp Vân Bộ, Kiếm Ý Hộ Thể |
| Đao Tu (Hỏa) | +20% công kích, +5% chí mạng, chí mạng mạnh hơn một chút | Liệt Hỏa Trảm, Tâm Nguyệt Đao, Hỏa Hoàn Thuật, Phá Quân Đao | Thiên Hỏa Phần Thế | Đao Ý Cuồng Phong, Chiến Ý Sôi Trào, Bất Khuất Huyết Đao |
| Thể Tu (Thổ) | +15% khí huyết, +15% phòng ngự, mọi đòn hút 5% sát thương | Bách Lôi Quyền, Đoạn Kim Chưởng, Hắc Hổ Đảo Tâm, Chưởng Tâm Lôi | Thái Sơn Áp Đỉnh | Kim Cương Nộ Mục, Huyền Quy Tế Thể, Bất Hoại Kim Thân |
| Phù Tu (Thủy) | võ kỹ hồi chiêu nhanh hơn 15%, thêm 1 ô võ kỹ chung, +10% công pháp | Hỏa Phù Thuật, Lôi Phù Chấn, Băng Phù Phong Tỏa, Ngũ Hành Phù Trận | Thiên Lôi Chân Phù | Linh Phù Hộ Thể, Tụ Linh Phù, Phản Phù Chú |

- **Tự mở theo cảnh giới:** chọn đạo lộ rồi đủ đại cảnh giới thì nút tự mở ở cấp 1 (Võ Kỹ 1 ở Trúc Cơ, Tuyệt Kỹ ở Nguyên Anh, nút chốt ở Luyện Hư...) và **tự thi triển trong trận, không chiếm ô võ kỹ**. Kỹ năng chung (học bằng tàn quyển) vẫn gắn vào ô như cũ.
- **Nâng cấp bằng điểm kỹ năng:** nhận theo thời gian (khoảng 1 điểm mỗi 10 phút ở đầu game, tăng 12% mỗi bậc), cả khi vắng mặt. Võ Kỹ và Bí Kỹ tối đa cấp 10 (tốn số điểm bằng cấp hiện tại), Tuyệt Kỹ tối đa cấp 5 (gấp đôi). Cấp nút và điểm giữ qua luân hồi.
- **Bí Kỹ** là kỹ năng buff trong trận (tăng chí mạng, tăng tốc, lá chắn, tăng công, hút máu, phản sát thương, hồi máu), độc lập với Công Pháp. Đơn Nhất tắt cả cây.
- Tranh icon cắt từ bảng vẽ và nằm ở `public/skills/`.
- Save cũ: Pháp Tu, Đan Sư, Trận Pháp Sư thành Phù Tu; võ kỹ độc quyền cũ bị bỏ (đã thay bằng cây kỹ năng).

## Đặc tính yêu thú và kỹ năng boss

Ải không còn chỉ là chỉ số (`ENEMY_MODS` trong `src/game/campaign.js`, hành vi trong `battleStore.js`). Đặc tính cố định theo số ải, hiện trước ở tab Vượt Ải và trên cảnh chiến đấu:

- **Yêu thú thường (từ ải 8, 25%) và Tiểu Boss (từ ải 5, 70%)** có một đặc tính: Cuồng Tốc, Giáp Dày, Ngoan Cường, Hung Hãn, Hồi Sinh, Hút Máu, Kháng Võ Kỹ.
- **Đại Boss** có một kỹ năng boss theo chương (Nhát Chém Ngàn Cân: đòn thứ 4 gấp 2.5; Cuồng Hóa dưới 40% khí huyết; Huyết Hồn Tái Sinh dưới 50%) và 50% thêm một đặc tính. **Chúa Tể** có hai kỹ năng boss và một đặc tính.
- Tỉ lệ thắng ước tính và mô phỏng offline đã tính xấp xỉ các hành vi này.
- Sau khi thêm, nhịp kiếp đầu đo được khoảng 20-30 giờ ảo tuỳ đạo lộ.

## Trang bị: dòng phụ, bộ, Huyền Thoại

- **Dòng phụ** (`AFFIXES` trong `src/game/equipment.js`): đồ từ độ hiếm Linh có 1-3 dòng phụ ngẫu nhiên (công kích, khí huyết, phòng ngự, Thân pháp, chí mạng, sát thương võ kỹ, hút máu, giảm hồi chiêu, khắc hệ, rơi đồ, linh khí), mỗi dòng chỉ xuất hiện ở các ô hợp lý và mạnh dần theo phẩm cấp. Có nút **Đổi dòng phụ** (tốn linh thạch) để đổi lại.
- **Bộ trang bị:** 8 bộ theo phẩm cấp. Mặc 2 hoặc 3 món cùng phẩm cấp nhận thêm thưởng bộ, hiện ở đầu tab Trang Bị.
- **Huyền Thoại:** chỉ rơi từ **Chúa Tể** (60%), mỗi ô một món, đặc hiệu cố định: Thanh Minh Thần Kiếm (25% đánh thêm một đòn), Vạn Cổ Chiến Giáp (phản 15% sát thương), Hồng Mông Thần Châu (linh khí, rơi đồ, giảm hồi chiêu, sát thương võ kỹ).
- Thưởng từ trang bị cộng chung với Đạo Lộ ở một chỗ (`battlePerk`), hồi chiêu giảm tối đa 50%.

## Tự động hoá, cường hoá luân hồi mới, Kiếp Thử Thách

- **Tự động hoá mở khoá dần** (`src/game/automation.js`, mục "Tự động hoá" ở Cài Đặt, mặc định tắt): tự mặc đồ tốt nhất (ải 20), tự nhận thưởng nhiệm vụ / thành tựu / rương mốc (10 nhiệm vụ), tự nâng Tụ Linh Trận (Luyện Khí Tầng 6), tự thu hoạch Linh Điền / khoáng mạch / đệ tử (10 lần thu hoạch), tự luyện loại đan đã chọn (25 đan), tự phân giải đồ Phàm khi túi quá 30 món (ải 40). Việc vặt trở thành phần thưởng của tiến độ.
- **Cường hoá luân hồi mới:** Ải Lộ (+5 ải trần thu nhập mỗi cấp), Pháp Duyên (+5% công pháp), Võ Đạo (+5% sát thương võ kỹ), Khai Thiên (+10% Đạo Vận). Tu Chất và Thân Thể nâng trần lên 30 cấp.
- **Kiếp Thử Thách** (`src/game/challenges.js`, tab Luân Hồi): chọn một ràng buộc cho kiếp sau, đạt bậc mục tiêu thì nhận thêm Đạo Vận (lần sau cùng thử thách thưởng nhiều hơn 50% mỗi lượt): **Tịnh Tâm** (không dùng đan), **Độc Hành** (không tông môn, đệ tử, công pháp), **Tay Không** (trang bị vô hiệu), **Đơn Nhất** (chỉ một võ kỹ). Có thành tựu "Vượt Thử Thách".

## Giữ chân người chơi và quyết định có ý nghĩa

- **Điểm danh ngày** (`src/game/daily.js`, thẻ "Điểm danh" ở màn Nhân Vật): chuỗi 7 ngày, ngày 7 thưởng lớn (công pháp tàn quyển, +1% linh khí vĩnh viễn). Ngày tính theo giờ địa phương, bỏ lỡ một ngày thì chuỗi về 0.
- **3 nhiệm vụ ngày** ngắn (mẫu nhiệm vụ có sẵn, mục tiêu bằng 60% nhiệm vụ Dễ), xong cả 3 nhận thêm thưởng. Có thành tựu "Chuyên Cần".
- **Thông báo khi linh khí đầy** (tuỳ chọn ở Cài Đặt, `src/services/notify.js`): chỉ khi trang / PWA còn mở ở nền, vì game không có máy chủ đẩy nên không báo được khi đã đóng hẳn.
- **Chọn 1 trong 3 phần thưởng boss** (`src/game/bossChoice.js`): lần đầu hạ Tiểu Boss / Đại Boss / Chúa Tể của một ải mới thì chọn một trong ba phần thưởng khác loại (linh thạch, chỉ số vĩnh viễn, công pháp tàn quyển, võ kỹ tàn quyển, +% linh khí). Không chọn sau 10 phút thì tự lấy phương án đầu.
- **Chuỗi kỳ ngộ nhiều bước:** kỳ ngộ có thể nối sang bước kế (`next`, `chainOnly` trong `randomEvents.js`). Hiện có chuỗi Cổ Mộ (3 bước, có giao chiến) và chuỗi Hồ Ly (3 bước). Bỏ ngỏ thì chuỗi dừng ở phương án an toàn.

## Hiện dần, mục tiêu, kho thời gian, thiền định

- **Hiện dần hệ thống** (`UNLOCKS` trong `src/game/screens.js`): game mới chỉ có 3 màn (Nhân Vật, Vượt Ải, Cài Đặt), các màn khác mở theo tiến độ (ví dụ Động Phủ và Linh Điền ở Luyện Khí Tầng 2, Tông Môn ở Tầng 3, Công Pháp và Trang Bị khi hạ Tiểu Boss đầu tiên, Luân Hồi ở Trúc Cơ). Màn vừa mở có chấm đỏ. Thanh điều hướng tự chia đều các hàng.
- **Mục tiêu kế tiếp** (`src/game/goals.js`): thanh luôn hiện một đích gần kèm tiến độ (đột phá, Tiểu Boss/Đại Boss kế tiếp, rương mốc, điểm danh, màn sắp mở khoá), việc đã sẵn sàng lên đầu.
- **Rương mốc ải:** 10 mốc (ải 10, 25, 50, 75, 100, 150, 200, 300, 400, 500), mỗi mốc nhận một lần theo kỷ lục mọi kiếp, thưởng vĩnh viễn (chỉ số, công pháp tàn quyển, thỉnh thoảng +1% linh khí).
- **Kho thời gian + Tăng tốc x4:** phần vắng mặt vượt giới hạn offline không mất mà vào kho (tối đa 24 giờ), điểm danh ngày 7 thêm 1 giờ, xong 3 nhiệm vụ ngày thêm 30 phút. Bật nút ⏩ ở thanh trên để chạy nhanh gấp 4, mỗi giây thật tiêu 3 giây trong kho; hết kho tự tắt.
- **Chế độ thiền định** (nút hoa sen ở thanh trên): màn hình tối giản, ngừng vẽ cảnh và tắt hiệu ứng, vòng lặp chỉ tick mỗi 0.5 giây để tiết kiệm pin. Game vẫn chạy bình thường, chạm để thoát.
- Giới hạn bộ nhớ khi để chạy lâu: danh sách trang bị rơi tối đa 50 mục, nhật ký 200 dòng, túi trang bị 40 món; có test chạy nhiều giờ giả lập.

## Linh Thú, Động Phủ, thám hiểm, Thiên Phú, Đại Thừa và Độ Kiếp

- **Linh Thú đồng hành** (`src/game/pets.js`, tab con "Linh Thú" ở màn Công Pháp): 10 linh thú thu phục bằng Linh Thú Phách (rơi từ boss Tiểu Boss trở lên, bán ở cửa hàng tông môn từ Trưởng Lão). Cấp 1-10, ra trận một con (hai con từ Hóa Thần). Thợ săn (Tiểu Hổ, Băng Ly, Hỏa Phụng, Kim Hồ) cắn địch theo chu kỳ, Linh Hạc hồi khí huyết, còn lại cho thưởng bị động (phòng ngự, rơi đồ, linh thạch, linh khí, Kỳ Lân Ấu tăng công/máu/thủ...). Cùng hệ ngũ hành với người chơi +25%.
- **Công trình Động Phủ** (`src/game/dwelling.js`, tab Động Phủ): Linh Mạch, Luyện Đan Phòng, Tàng Kinh Các, Luyện Khí Phòng (rèn ra đồ hiếm hơn), Diễn Võ Trường. Cấp 1-10, cần bậc tu vi tương ứng, **giữ khi luân hồi**.
- **Thám hiểm của đệ tử** (`src/game/expedition.js`, tab Đệ Tử): 5 nhiệm vụ từ 30 phút đến 8 giờ theo giờ thật, cử đoàn 1-5 đệ tử, thành công tuỳ sức mạnh đoàn so với độ khó (thất bại chỉ còn 25% thưởng). Thưởng linh thạch, thảo dược, quặng và tàn quyển công pháp, linh thú, võ kỹ. Đệ tử đi thì tạm bỏ việc thường. Số đoàn đi cùng lúc theo cấp bậc tông môn (1 đến 3).
- **Thiên Phú** (`src/game/talents.js`, màn Nhân Vật): mỗi kiếp bốc 3 thiên phú (13 loại, ba độ hiếm), chọn 1; bốc lại bằng 3 Đạo Vận; kiếp sau bốc lại.
- **Đại Thừa và Độ Kiếp:** thêm 2 đại cảnh giới (6 bậc), tổng 33 bậc, mỗi bước có thiên kiếp riêng (Hợp Thể → Đại Thừa 9 đạo, Đại Thừa → Độ Kiếp 12 đạo). Từ sau Hợp Thể hệ số tăng yêu cầu đột phá nhẹ hơn (1.62 thay vì 2.22) để các bậc cuối không kéo dài vô lý. Nhân vật có thêm vòng sáng và đốm sáng bay lên.
- Sửa lỗi: từ vòng ải thứ hai (sau ải 80) trang bị rơi luôn là phẩm cấp cao nhất thay vì quay về phẩm cấp thấp theo bối cảnh.

## Giao diện (biểu tượng + 5 nhóm)

- **Thanh dưới 5 nhóm**: Tu Luyện (Nhân Vật, Động Phủ, Linh Điền, Luân Hồi), Vượt Ải (Vượt Ải, Võ Kỹ, Công Pháp, Linh Thú), Hành Trang (Trang Bị, Túi Đồ), Môn Phái (Tông Môn, Đệ Tử), Thêm (Cốt Truyện, Thành Tựu, Cài Đặt). Màn con chọn bằng chip ở đầu màn hình; nhóm/màn hiện dần khi mở khoá.
- **Lưới biểu tượng + bảng trượt**: Võ Kỹ, Công Pháp, Linh Thú, Trang Bị, Túi Đồ hiển thị bằng ô icon (khung theo độ hiếm, màu theo ngũ hành, huy hiệu cấp, thanh tiến độ tàn quyển, chấm đỏ khi làm được); bấm ô để mở chi tiết và nút hành động.
- **Nhân Vật dạng bảng điều khiển**: chip chỉ số, hàng tốc độ, ô "Việc cần làm" (điểm danh, thiên phú, đạo lộ, thử thách) mở bảng trượt.
- **Phong cách chung**: phông Noto Serif gói sẵn (offline vẫn đẹp, có tiếng Việt), khung icon phát sáng theo màu độ hiếm/hệ (Huyền Thoại nhấp nháy, tắt khi bật giảm chuyển động), panel nền sâu hơn, thanh nắm ở bảng trượt, rung nhẹ khi bấm nút (bật/tắt trong Cài Đặt).
- **Bố cục riêng từng màn**: Trang Bị dạng búp bê (6 ô quanh nhân vật), Công Pháp có 4 cột cộng hưởng đầy dần với vạch mốc 5/12/20, Pháp Bảo gắn trên bệ thờ phát sáng theo hệ, Linh Thú ra trận là thẻ chân dung. Tranh vẽ tay nằm ở `public/{nav,skills,arts,pets,treasures,gear,items,banners}`; tranh nền mờ theo nhóm ở `public/banners`.
- Bộ glyph vẽ bằng code nằm ở `src/components/glyphs.js` (thêm icon: sửa `GLYPHS` và bảng id→glyph). Chỉ giao diện, không đổi cân bằng.

## Trang Bị, Pháp Bảo, Võ Kỹ, Công Pháp (làm lại)

- **Trang Bị 6 ô** (`src/game/equipment.js`): Vũ khí, Y phục, Mũ, Giày, Nhẫn, Ngọc bội. Mỗi ô một thiên hướng chỉ số và dòng phụ riêng; tổng chỉ số 6 ô bằng 3 ô cũ nên cân bằng không đổi. Bộ trang bị mặc 2 / 4 / 6 món cùng phẩm cấp. Đồ Huyền Thoại có cho cả 6 ô. Đổi dòng phụ có thể khoá một dòng (đắt gấp đôi). Save cũ: ô Pháp bảo cũ thành Ngọc bội.
- **Pháp Bảo** (`src/game/treasures.js`, tab Hành Trang > Pháp Bảo): hệ thống riêng, mỗi pháp bảo một thần thông kích hoạt trong trận (hồi máu theo chu kỳ, mỗi 7 đòn đánh thêm, chặn đòn chí mạng, hút máu, lá chắn đầu ải, chí mạng với boss...). Mảnh rơi từ Đại Boss và Chúa Tể; luyện hoá rồi nâng 5 phẩm; 2 ô, mở thêm theo cảnh giới (tối đa 4); có võ kỹ đang gắn cùng hệ ngũ hành thì thần thông mạnh thêm 30%.
- **Võ Kỹ**: chiêu tấn công gây trạng thái theo hệ (Hỏa: Thiêu, Thủy: Băng làm chậm, Kim: Phá Giáp, Mộc: Độc qua chiêu độc). Liên kích: tung chiêu đúng hệ khi địch mang trạng thái hợp thì gây thêm sát thương (Băng Vỡ, Hàn Hỏa Giao Tranh, Độc Hỏa Công Tâm, Phá Giáp Quán Thủy). Võ kỹ đạt cấp tối đa chọn nhánh Cường Lực (+30%) hoặc Tốc Biến (-25% hồi chiêu).
- **Nguồn Pháp Bảo**: ngoài boss, Mảnh Pháp Bảo còn là thưởng thám hiểm khó (Săn Tìm Linh Thú, Vực Sâu Thượng Cổ) và bán ở cửa hàng tông môn từ Trưởng Lão (150 Cống Hiến). Mỗi võ kỹ có hai tên nhánh riêng (ví dụ Liệt Hỏa Chưởng: Phần Thiên Chưởng / Liệt Diễm Liên Châu).
- **Dòng đặc tính có tên** trên trang bị: sát thương lên boss, hạ yêu thú hồi máu, hạ yêu thú có lá chắn, đòn thường gây Thiêu, mỗi 5 đòn giảm hồi chiêu (xuất hiện ở các ô phù hợp, lẫn với dòng phụ thường).
- **Tiện ích**: dải "Có bản mới, bấm để cập nhật" (so `version.json` mỗi lần build với bản đang chạy, không cần service worker); nhắc sao lưu save khi chơi trên 2 giờ và quá 7 ngày chưa xuất; cỡ chữ Nhỏ / Vừa / Lớn trong Cài Đặt; khoá món đồ, lọc theo ô và sắp xếp túi trang bị; nút "Gắn tốt nhất" cho võ kỹ và pháp bảo; trạng thái và liên kích hiện trên cảnh trận; thẻ Khởi đầu có thêm bước trang bị, liên kích, pháp bảo. Pháp bảo hậu kỳ (ải 90 / 120 / 150): Vạn Lôi Ấn, Tinh Hà Bảo Bình, Huyền Vũ Giáp Ấn. Đo cân bằng nhiều kiếp: `node scripts/economy-sim.mjs --rebirth --hours 90 --seeds 2`; `--no-combo` đo mức bot không tối ưu liên kích.
- **Linh thạch chỉ tăng theo thời gian**: hạ quái, lần đầu vượt ải, rương mốc, thưởng chọn của boss và Tụ Linh Bình không còn cho linh thạch; vượt ải chỉ làm thu nhập linh thạch thụ động (theo ải cao nhất, có trần theo bậc) tăng lên. Mọi tốc độ hiển thị (linh khí, linh thạch) tính theo PHÚT. Giá các khoản chi (`stoneRef`, `COST_SECONDS`, `refCost`, `craftCost` ở `src/game/campaign.js`) tính bằng N giây thu nhập tham chiếu của bậc mở khoá (công trình, rèn, cường hoá, đổi dòng phụ, hạt giống, đệ tử, luyện đan, làm mới nhiệm vụ; Trấn Thủ thu 2 phút thu nhập mỗi giờ); Tụ Linh Trận vẫn giá nhân theo cấp.
- **Công Pháp** chia 4 hệ (Thể, Công, Tốc, Đạo): tổng cấp một hệ đạt 5 / 12 / 20 thì mở cộng hưởng; công pháp cấp tối đa ngộ đạo, chọn 1 trong 3 đặc tính riêng của nó.
