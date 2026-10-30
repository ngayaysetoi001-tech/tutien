# Prompt vẽ nhân vật và quái vật cho Nano Banana

Khác với icon (nền tối), nhân vật và quái cần tách nền sạch nên dùng **nền xanh lá phẳng** (chroma key). Riêng các sheet có sinh vật màu xanh lá dùng **nền hồng tím phẳng**. Tôi sẽ tách nền bằng code (có xử lý viền ám màu).

Quy ước hướng: **quái nhìn sang trái** (đối mặt nhân vật), **nhân vật nhìn sang phải**. Toàn thân, nhìn nghiêng ba phần tư, đứng trên "mặt đất" tưởng tượng (không vẽ bóng đổ hay nền đất).

## Khối phong cách (dán đầu mọi prompt)

```
Sprite nhân vật/quái vật cho game tu tiên mobile (xianxia), phong cách tranh thuỷ mặc kết hợp sơn dầu kỹ thuật số giống bộ icon trước: nét mực đậm, mảng màu rực, điểm nhấn ánh vàng, dáng chibi 2,5 đầu dễ thương nhưng uy nghi, mắt to có thần. Bố cục dạng lưới đều, mỗi ô một nhân vật TOÀN THÂN đặt chính giữa, chừa khoảng trống rộng giữa các ô (15% cạnh ô). Nền PHẲNG MỘT MÀU [XANH LÁ #00FF00 / HỒNG TÍM #FF00FF], không chuyển sắc, không bóng đổ, không mặt đất, không hào quang kéo ra nền. TUYỆT ĐỐI KHÔNG vẽ viền, khung, chữ, số, logo, watermark. Nhìn nghiêng ba phần tư, toàn thân không bị cắt. Không dùng màu của nền cho chính nhân vật. Mỗi nhân vật đọc rõ khi thu nhỏ còn 100 px.
```

Yêu cầu xuất ảnh vuông 2048x2048.

---

## Đợt 1. Nhân vật chính (5 tư thế, 1 hàng 5 cột, ảnh 2560x512, nền XANH LÁ)

Cùng một đạo sĩ trẻ tóc đen búi cao, áo dài xanh nhạt viền vàng, cùng gương mặt ở cả 5 ô. Nhìn sang phải.

```
[khối phong cách, nền xanh lá]
Bảng 1 hàng 5 ô, cùng một nhân vật (đạo sĩ trẻ, tóc đen búi cao, áo dài xanh nhạt viền vàng, gương mặt giống hệt nhau ở mọi ô), nhìn sang phải:
1. Kiếm Tu: tư thế chiến đấu, tay phải cầm trường kiếm thẳng, mũi kiếm chếch về trước, ánh kiếm xanh lam.
2. Đao Tu: tư thế chiến đấu, hai tay cầm đại đao bản rộng, lửa đỏ cam quấn quanh lưỡi đao.
3. Thể Tu: tư thế quyền, trần tay áo, hai nắm đấm, khí vàng nâu bao quanh nắm tay, áo ngắn gọn.
4. Phù Tu: tư thế niệm chú, tay trái kẹp lá bùa vàng, vài lá bùa bay quanh, ánh xanh thuỷ.
5. Thiền định: ngồi xếp bằng, hai tay đặt trước bụng, khí xanh ngọc nhẹ quanh người.
```

## Đợt 2. Yêu thú thường, nền XANH LÁ (10 ô, 5 cột x 2 hàng, ảnh 2560x1024)

Quái nhìn sang trái, mỗi con dáng chibi, thân hình rõ màu chủ đạo.

```
[khối phong cách, nền xanh lá]
Bảng 5 cột x 2 hàng, yêu thú nhìn sang trái:
Hàng 1:
1. Sói Yêu: sói xám xanh, mắt vàng, nanh nhỏ, lông gai.
2. Huyết Lang: sói đỏ thẫm, vằn đen, mắt đỏ, hơi nóng bốc lên.
3. Hỗn Độn Thú: thú bốn chân da vàng nhạt, sừng cong, vằn khí hỗn độn.
4. Hầu Yêu: khỉ nâu, tay dài, răng nhe, tư thế chồm tới.
5. Ma Viên: khỉ tím sẫm, mắt phát sáng, lông xù, cánh tay to.
Hàng 2:
6. Hắc Thi: xác chết cương thi tím xám, mũ quan, lá bùa dán trán, hai tay giơ thẳng.
7. Ma Thi: cương thi tím đen, áo rách, mắt đỏ, móng dài.
8. Xương Giáp Binh: bộ xương trắng ngà mặc giáp rỉ, cầm kiếm gãy.
9. Hư Ảnh: dơi ma xanh lam trong suốt, cánh rộng, mắt sáng.
10. U Hồn: hồn ma tím nhạt, thân khói kéo đuôi, mặt buồn, mắt sáng vàng.
```

## Đợt 3. Yêu thú thường, nền HỒNG TÍM (6 ô, 3 cột x 2 hàng, ảnh 1536x1024)

Dành cho sinh vật xanh lá/xanh lục để không lẫn nền.

```
[khối phong cách, nền HỒNG TÍM #FF00FF]
Bảng 3 cột x 2 hàng, yêu thú nhìn sang trái:
1. Xà Yêu: rắn xanh lục cuộn, lưỡi chẻ, mắt vàng.
2. Băng Xà: rắn băng xanh nhạt, vảy tinh thể.
3. Hư Không Xà: rắn xanh lam tím, thân có vết nứt sao.
4. Mộc Yêu: cây yêu nhỏ có mặt, tay là cành, lá xanh.
5. Băng Linh: linh thể băng hình người nhỏ, xanh nhạt, mắt xanh.
6. Hỗn Độn Linh: linh thể vàng ánh kim hình ngọn lửa người, mắt trắng.
```

## Đợt 4. Boss, nền XANH LÁ (7 ô, 4 cột x 2 hàng, ô cuối trống, ảnh 2048x1024)

Boss to lớn, uy nghi, chi tiết hơn quái thường (mỗi con chiếm trọn ô, nhìn sang trái).

```
[khối phong cách, nền xanh lá]
Bảng 4 cột x 2 hàng, mỗi ô một BOSS khổng lồ uy nghi nhìn sang trái, mắt đỏ rực, ô cuối cùng (hàng 2, cột 4) để TRỐNG nền phẳng:
1. Hắc Phong Lang Vương: sói chúa đen tuyền, bờm gió xoáy, mắt đỏ, sẹo mắt.
2. Huyết Ma Vương: ma vương đỏ thẫm, sừng dài, áo choàng rách, cầm đinh ba.
3. Thái Cổ Ma Thần: ma thần ba mắt, giáp cổ đỏ tía, xích quanh tay.
4. Hư Không Thú Vương: rồng đen xanh lam, thân nứt khí hư không, cánh rách.
5. Hỗn Độn Đế Quân: tượng khổng lồ vàng đồng, mặt nạ đế vương, khí hỗn độn.
6. Cực Địa Băng Hoàng: phượng băng xanh nhạt, cánh xoè, đuôi băng dài.
7. Hoàng Tuyền Quỷ Vương: quỷ vương tím, mũ vua, cười rùng rợn, khói âm.
```

## Đợt 5. Boss hệ Mộc, nền HỒNG TÍM (1 ô, ảnh 1024x1024)

```
[khối phong cách, nền HỒNG TÍM #FF00FF]
Một BOSS khổng lồ uy nghi nhìn sang trái: Vạn Niên Mộc Linh, cây cổ thụ vạn năm có mặt giận dữ, rễ như chân, cành như tay, lá xanh sẫm, mắt đỏ.
```

---

## Sau khi vẽ xong

Gửi từng đợt thành một ảnh, ghi rõ số đợt. Tôi sẽ:
1. Tách nền, cắt từng nhân vật, lưu `public/heroes/`, `public/monsters/`.
2. Thay vẽ bằng code trong `src/pixi/art.js` bằng sprite, giữ nguyên các chuyển động hiện có (thở, lao tới khi đánh, chớp đỏ khi trúng, mờ dần khi chết, quầng đỏ cho boss).
3. Quái chưa có tranh vẫn dùng hình vẽ code như cũ nên có thể thêm dần từng đợt.
