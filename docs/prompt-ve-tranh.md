# Prompt vẽ tranh cho Nano Banana

Dùng chung **khối phong cách** (dán ở đầu mọi prompt), rồi dán phần riêng của từng đợt.

## Khối phong cách (dán đầu mọi prompt)

```
Tranh bảng sprite cho game tu tiên mobile (xianxia), phong cách tranh thuỷ mặc kết hợp sơn dầu kỹ thuật số: nét mực đậm, mảng màu rực, điểm nhấn ánh vàng kim và hào quang phát sáng. Nền phẳng một màu xanh đen #0b1020, KHÔNG hoa văn nền. Bố cục dạng lưới đều, mỗi ô một vật thể đặt chính giữa, chừa khoảng trống rộng giữa các ô (khoảng 15% cạnh ô). TUYỆT ĐỐI KHÔNG vẽ viền, khung, vòng tròn, bệ, ô vuông hay chữ quanh vật thể. KHÔNG chữ, KHÔNG số, KHÔNG logo, KHÔNG watermark. Mỗi vật thể có hình khối rõ, đọc được khi thu nhỏ còn 64 px. Ánh sáng từ trên trái, cùng một bảng màu giữa các ô.
```

Mẹo: yêu cầu xuất ảnh vuông 2048x2048 (hoặc cao nhất có thể). Nếu có ô vẽ lỗi, vẽ lại riêng ô đó rồi gửi kèm.

---

## Đợt A. Biểu tượng thanh dưới (5 ô, 1 hàng 5 cột, ảnh 2560x512)

```
[khối phong cách]
Bảng 1 hàng 5 ô, từ trái sang phải:
1. Tu Luyện: người ngồi thiền xếp bằng, linh khí xanh ngọc xoáy quanh, hào quang sau đầu.
2. Vượt Ải: cổng núi đá cổ kính giữa hai vách núi, thanh kiếm cắm trước cổng, mây mù.
3. Hành Trang: túi càn khôn bằng gấm đỏ thêu chỉ vàng, miệng túi toả ánh sáng, vài viên linh thạch lơ lửng.
4. Môn Phái: cổng tông môn gỗ đỏ mái cong nhiều tầng, lá cờ nhỏ, núi xa phía sau.
5. Thêm: cuộn trục mở ra nửa chừng, dây lụa vàng, vài vòng sáng huyền bí.
Màu chủ đạo mỗi ô: ngọc lục, xanh thép, đỏ gấm, vàng đồng, tím nhạt.
```

## Đợt B. Banner 5 nhóm (5 ảnh ngang riêng, tỉ lệ 3:1, 1500x500)

Làm từng ảnh một, KHÔNG viền, mép ảnh nên tối dần vào nền #0b1020 để code ghép mượt.

```
[khối phong cách, bỏ phần "lưới"]
Banner phong cảnh ngang tỉ lệ 3:1, phần giữa sáng, hai mép tối dần.
- Tu Luyện: đỉnh núi trong mây, một đạo nhân thiền trên mỏm đá, luồng linh khí xanh ngọc.
- Vượt Ải: con đường đá giữa núi dẫn tới ải cổng xa, kiếm khí lấp lánh.
- Hành Trang: kho báu trong hang động, rương gấm, đồ pháp bảo phát sáng.
- Môn Phái: quần thể điện các trên mây, cờ phướn tung bay, đệ tử nhỏ xíu.
- Thêm: thư viện cổ trong đình viện đêm trăng, cuộn sách bay, đom đóm.
```

## Đợt C. Công Pháp (10 ô, lưới 5 cột x 2 hàng, ảnh 2560x1024)

Hệ màu: Kim trắng vàng, Mộc xanh lục, Thuỷ xanh lam, Hoả đỏ cam, Thổ nâu vàng.

```
[khối phong cách]
Bảng 5 cột x 2 hàng, mỗi ô là một biểu tượng công pháp (hình trừu tượng, không có người):
Hàng 1:
1. Thanh Tâm Quyết (Thuỷ): đoá sen xanh lam nở trên mặt nước tĩnh, gợn sóng.
2. Cương Thể Công (Mộc): thân cây cổ thụ cuồn cuộn rễ, gân xanh lục như cơ bắp.
3. Phá Quân Quyết (Kim): mũi kiếm vàng trắng xuyên qua tấm giáp vỡ, tia sáng chói.
4. Kim Cang Bất Hoại (Thổ): bàn tay khổng lồ bằng đá vàng nâu, ấn kết, vân kim loại.
5. Truy Phong Bộ Pháp (Hoả): đôi giày bay cuốn ngọn lửa đỏ cam, vệt gió.
Hàng 2:
6. Tụ Bảo Quyết (Thổ): chiếc bình đầy linh thạch vàng, tia sáng vàng đổ vào.
7. Thiên Địa Hộ Pháp (Thuỷ): hai bàn tay tiên khép che chở một quả cầu nước xanh lam trong suốt.
8. Thiên Nhãn Thông (Mộc): con mắt thứ ba màu lục bích mở ra, tia sáng lục.
9. Ngũ Hành Quy Nhất (Kim): năm viên ngọc năm màu xoay quanh một điểm sáng trắng vàng.
10. Luân Hồi Bí Điển (Hoả): vòng luân hồi bằng lửa đỏ cam, hai đầu rồng cắn đuôi nhau.
```

## Đợt D. Pháp Bảo (11 ô, lưới 4 cột x 3 hàng, ô cuối để trống, ảnh 2048x1536)

```
[khối phong cách]
Bảng 4 cột x 3 hàng, mỗi ô một pháp bảo tiên hiệp, toả hào quang theo hệ; ô cuối (hàng 3, cột 4) để TRỐNG nền phẳng.
1. Càn Khôn Đỉnh (Thổ): đỉnh đồng ba chân cổ, khói vàng nâu bốc lên.
2. Thất Tinh Kiếm (Kim): thanh kiếm dài thân khắc bảy ngôi sao sáng, ánh vàng trắng.
3. Hộ Thân Linh Phù (Thuỷ): lá bùa giấy vàng chữ cổ ánh xanh lam, bay lơ lửng.
4. Tụ Linh Bình (Mộc): bình ngọc nhỏ, linh khí xanh lục dâng quanh miệng bình.
5. Phong Lôi Phiến (Hoả): chiếc quạt xếp lông vũ, lửa đỏ cam và tia sét trên mặt quạt.
6. Huyết Sát Châu (Hoả): viên châu đỏ thẫm bên trong có khói máu chuyển động.
7. Hỗn Nguyên Chung (Thổ): chuông đồng lớn hoa văn mây, sóng âm vàng nâu lan ra.
8. Thiên Cơ La Bàn (Kim): la bàn bát quái bằng vàng, kim chỉ phát sáng.
9. Vạn Lôi Ấn (Kim): ấn ngọc vuông khắc rồng, sét trắng vàng quấn quanh.
10. Tinh Hà Bảo Bình (Thuỷ): bình ngọc chứa dải ngân hà xanh lam tím, sao lấp lánh.
11. Huyền Vũ Giáp Ấn (Thổ): ấn hình rùa quấn rắn bằng đá đen vân vàng nâu.
Độ hoành tráng tăng dần từ ô 1 đến ô 11.
```

## Đợt E. Linh Thú (8 ô, lưới 4 cột x 2 hàng, ảnh 2048x1024)

Chân dung nửa thân, tư thế hơi nghiêng, dễ thương nhưng uy nghi.

```
[khối phong cách]
Bảng 4 cột x 2 hàng, mỗi ô là chân dung một linh thú, mắt to có thần, phong cách dễ thương uy nghi:
Hàng 1:
1. Tiểu Hổ Con (Kim): hổ con lông vàng trắng sọc đen, vuốt nhỏ sắc, hào quang vàng.
2. Huyền Quy (Thổ): rùa đen mai khắc vân, rắn nhỏ quấn bên, nền khí nâu vàng.
3. Linh Hạc (Mộc): hạc trắng cổ dài đỉnh đầu đỏ, cánh xoè, lá xanh bay quanh.
4. Kim Thiềm (Kim): cóc vàng ba chân ngậm đồng tiền cổ, vây quanh vàng kim.
Hàng 2:
5. Vân Hồ (Thuỷ): cáo trắng chín đuôi ngắn, đuôi toả sương xanh lam, mắt thông minh.
6. Băng Ly (Thuỷ): mèo hồ ly băng, lông trắng xanh lam, tinh thể băng quanh người.
7. Thanh Long Ấu (Mộc): rồng non màu lục bích, sừng nhỏ, luồng khí xanh lục.
8. Hỏa Phụng (Hoả): phượng hoàng nhỏ đỏ cam, đuôi lửa dài, tàn lửa bay.
```

## Đợt F. Biểu tượng trang bị (6 ô, 1 hàng 6 cột, ảnh 3072x512)

Vẽ phiên bản "chung" cho mỗi vị trí; code sẽ nhuộm khung theo phẩm cấp.

```
[khối phong cách]
Bảng 1 hàng 6 ô, trang bị tiên hiệp bằng bạc xám có điểm nhấn vàng và ngọc, không đặt trên người:
1. Vũ khí: thanh trường kiếm thẳng đứng, chuôi quấn dây lụa.
2. Giáp: áo giáp ngực kiểu cổ, vai thú, đai vàng.
3. Mũ: mũ đạo quan kim loại có trâm ngọc.
4. Giày: đôi ủng chiến mũi cong, mây văn.
5. Nhẫn: chiếc nhẫn ngọc bích có khắc phù văn nhỏ.
6. Ngọc bội: ngọc bội tròn khoét giữa, dây tua đỏ.
```

## Đợt G. Vật phẩm thường dùng (12 ô, lưới 4 x 3, ảnh 2048x1536)

(Có thể thêm bớt sau khi bạn kiểm tra túi đồ trong game.)

```
[khối phong cách]
Bảng 4 cột x 3 hàng, vật phẩm game tu tiên:
1. Linh thạch: viên tinh thể xanh lam sáng, vài mảnh vỡ nhỏ.
2. Đan dược: ba viên đan tròn đỏ vàng trên lá sen nhỏ, khói thơm.
3. Tàn quyển: mảnh sách cổ rách mép, chữ cổ mờ.
4. Hạt giống linh: hạt giống phát ánh lục, nảy mầm nhỏ.
5. Đạo Vận: giọt sáng tím vàng hình bát quái xoay.
6. Điểm kỹ năng: ngôi sao sáng nhiều cánh, tia vàng.
7. Thảo dược: bó cỏ linh lục, hoa nhỏ phát sáng.
8. Khoáng thạch: khối quặng xám có vân xanh lam.
9. Linh quả: quả đào tiên hồng hào, lá xanh.
10. Phù chú: lá bùa vàng đỏ chữ cổ.
11. Chìa khoá bí cảnh: chìa khoá đồng cổ có ngọc đỏ.
12. Rương báu: rương gỗ khảm vàng, mở hé, ánh sáng bên trong.
```

---

## Sau khi vẽ xong

Gửi mỗi đợt thành một ảnh (định dạng png/webp), ghi rõ số đợt. Tôi sẽ cắt từng ô bằng đúng cách đã làm với bảng kỹ năng (cắt tròn hoặc vuông, nền trong suốt), ghép khung độ hiếm bằng code và nối vào game.
