# Prompt vẽ hoạt ảnh (chuỗi khung hình) cho Nano Banana

Hoạt ảnh = nhiều ảnh tĩnh phát liên tiếp (sprite sheet). Nano Banana không xuất video, nên vẽ **một dải ngang gồm N khung trong cùng một lần vẽ** (cùng một prompt thì các khung giống nhau nhất), rồi tôi cắt từng khung và phát lại bằng code.

## Cần mấy khung?

| Hành động | Số khung | Phát | Thời lượng |
|---|---|---|---|
| Chém / ra đòn (mỗi đạo lộ một dải) | 6 | khoảng 14 khung/giây, 1 lần | khoảng 0,45 giây |
| Bị đánh (nếu muốn) | 2 | 1 lần | khoảng 0,2 giây |
| Thiền thở (nếu muốn) | 4 | lặp | khoảng 1,2 giây |

Mẹo: **6 khung chém là đủ mượt** với game idle trên điện thoại. Nhiều hơn thì khó giữ nhân vật giống nhau giữa các khung. Hiệu ứng nhún, lao tới, chớp đỏ khi trúng đòn tôi vẫn làm bằng code như hiện nay, nên hoạt ảnh chỉ cần vẽ động tác của người.

Khi phát, tôi cho **đòn trúng đích đúng ở khung số 4** để số sát thương và tiếng đánh khớp với lúc lưỡi kiếm chạm.

## Cách để nhân vật giống hệt nhau giữa các khung

1. **Đính kèm ảnh nhân vật hiện có** (ví dụ `public/heroes/kiem.png`) vào Nano Banana cùng prompt, và ghi "nhân vật giống HỆT ảnh đính kèm: gương mặt, tóc, áo".
2. Luôn yêu cầu **một dải ngang**, mỗi khung cùng kích thước ô, **chân đặt trên cùng một đường nền**, cùng tỉ lệ cơ thể.
3. **Không vẽ vệt chém / hiệu ứng ánh sáng** trong khung (tôi thêm bằng code, nhìn sạch và không lệch). Chỉ vẽ người và vũ khí.
4. Nền xanh lá phẳng như các đợt trước.
5. Nếu một khung bị lệch hoặc khác mặt, vẽ lại cả dải; hoặc gửi riêng khung lỗi, tôi sẽ nhắc cách ghép lại.

## Khối chung (dán đầu mọi prompt hoạt ảnh)

```
Dải sprite hoạt ảnh cho game tu tiên mobile (xianxia). ĐÍNH KÈM là ảnh nhân vật chính: giữ nhân vật GIỐNG HỆT (gương mặt, tóc búi cao, áo dài xanh nhạt viền vàng, phong cách tranh thuỷ mặc/sơn dầu nét mực đậm, dáng chibi 2,5 đầu). Vẽ MỘT DẢI NGANG gồm N khung hình chia đều thành N ô vuông bằng nhau, đọc từ trái sang phải theo thứ tự thời gian. Nền XANH LÁ #00FF00 phẳng một màu, không chuyển sắc, không bóng đổ, không mặt đất. Trong mọi ô: nhân vật toàn thân, nhìn sang PHẢI, chân đặt trên cùng một đường nằm ngang ở sát đáy ô, cùng tỉ lệ cơ thể, đặt chính giữa ô theo chiều ngang (người lao ra thì thân vẫn giữ cân đối trong ô). KHÔNG vẽ vệt chém, tia sáng, hạt bụi hay hiệu ứng bay ra ngoài; chỉ vẽ người và vũ khí. KHÔNG viền ô, KHÔNG chữ, số, logo, watermark.
```

Xuất ảnh dài: 6 khung = 3072x512 (mỗi ô 512x512).

---

## Chém Kiếm Tu (6 khung)

```
[khối chung, N = 6] Động tác chém ngang bằng trường kiếm:
1. Lấy đà: kéo kiếm ra sau lưng, hạ thấp trọng tâm, gập gối.
2. Bắt đầu vung: thân xoay, kiếm bắt đầu lướt về phía trước.
3. Giữa động tác: kiếm vung ngang tầm vai, người lao nhẹ về phía trước.
4. TRÚNG ĐÍCH: tay duỗi hết cỡ, kiếm vươn thẳng về trước, thân nghiêng về trước, nét mặt quyết liệt (khung mạnh nhất).
5. Thu đà: kiếm vừa vung qua, thân còn nghiêng.
6. Thu thế: đứng thẳng lại, kiếm hạ thấp bên hông.
```

## Chém Đao Tu (6 khung)

```
[khối chung, N = 6] Động tác bổ đại đao từ trên xuống:
1. Lấy đà: giương đại đao cao qua đầu, hai tay nắm chặt, gập gối.
2. Đao bắt đầu hạ, thân rướn lên rồi lao về trước.
3. Giữa động tác: đao hạ chéo ngang đầu, người lao tới.
4. TRÚNG ĐÍCH: đao bổ thẳng xuống phía trước, thân cúi, hai chân vững (khung mạnh nhất).
5. Thu đà: đao chạm thấp, hơi lún người.
6. Thu thế: nhấc đao lên vai, đứng thẳng lại.
```

## Quyền Thể Tu (6 khung)

```
[khối chung, N = 6] Động tác đấm thẳng một đòn nặng:
1. Lấy đà: nắm đấm phải kéo sát hông sau, người xoay nghiêng, hạ thấp tấn.
2. Bắt đầu đấm: vặn eo, vai quay, bước chân trước.
3. Giữa động tác: nắm đấm vươn nửa đường, thân lao tới.
4. TRÚNG ĐÍCH: tay phải duỗi thẳng tối đa, cả thân dồn về trước, nét mặt gồng (khung mạnh nhất).
5. Thu đà: tay còn duỗi, thân hơi nghiêng.
6. Thu thế: rút tay về, đứng tấn lại.
```

## Tung bùa Phù Tu (6 khung)

```
[khối chung, N = 6] Động tác tung lá bùa vàng về phía trước:
1. Lấy đà: tay trái kẹp lá bùa vàng đặt trước ngực, tay phải kết ấn.
2. Giơ bùa lên cao ngang mặt.
3. Giữa động tác: cánh tay bắt đầu vung về phía trước.
4. TRÚNG ĐÍCH: cánh tay duỗi thẳng ra phía trước, lá bùa vừa rời tay, thân nghiêng tới (khung mạnh nhất).
5. Thu đà: tay còn duỗi, bàn tay mở.
6. Thu thế: rút tay về, kết ấn trước ngực.
```

---

## Tuỳ chọn (làm sau nếu muốn)

- **Bị đánh (2 khung):** khung 1 giật lùi, nghiêng người ra sau, nhăn mặt; khung 2 chao đảo gần đứng lại. Dùng chung cho cả 4 đạo lộ.
- **Thiền thở (4 khung):** ngồi xếp bằng, ngực nhô lên rồi xẹp xuống nhẹ, vai hơi nhấp. Hiện thiền đã có code nhún nên không cần gấp.
- **Quái vật:** hiện lao tới và nghiêng bằng code là đủ. Nếu muốn hoạt ảnh tấn công cho **boss** (4 khung: lấy đà, vồ, trúng đích, thu thế), tôi viết prompt riêng cho từng boss sau.

## Sau khi vẽ xong

Gửi mỗi dải thành một ảnh, ghi rõ đạo lộ. Tôi sẽ:
1. Cắt từng ô, căn lại chân cho cùng đường nền (tránh nhân vật nhảy lên xuống giữa các khung), tách nền xanh.
2. Đổi nhân vật sang phát hoạt ảnh khi ra đòn (khung 4 = lúc trúng đích), còn lại giữ ảnh đứng hiện tại.
3. Nối vào hiệu ứng có sẵn (vệt chém, số sát thương, rung màn hình) nên không đổi nhịp chơi.

---

## Kiếm Tu: các hoạt ảnh bổ sung (làm trước, chưa làm ba đạo lộ kia)

Dùng khối chung ở trên (đính kèm ảnh nhân vật Kiếm Tu hiện có, nền xanh lá, nhìn sang phải, chân cùng đường nền, KHÔNG vẽ vệt sáng hay hiệu ứng). Mỗi dải 6 khung (3 cột x 2 hàng, mỗi ô vuông bằng nhau). Mẹo từ lần trước: hãy chừa khoảng trống rộng giữa các ô vì kiếm vung xa dễ chạm mép ô.

### A. Tuyệt Kỹ Tru Tiên Nhất Kiếm (6 khung, khung 4 là trúng đích)

```
[khối chung, N = 6] Đạo sĩ Kiếm Tu thi triển một nhát kiếm tối thượng, động tác lớn và dứt khoát hơn chém thường:
1. Nhảy lên hơi nhún người, hai tay nâng kiếm lên cao qua đầu.
2. Bay lên cao nhất, thân thẳng, kiếm giơ cao chếch về sau.
3. Bắt đầu lao xuống: thân nghiêng chúi về trước, kiếm kéo sau lưng.
4. TRÚNG ĐÍCH: thân lao ngang về trước, kiếm chém dài ra phía trước duỗi hết cỡ, nét mặt quyết liệt.
5. Trượt đà: chân chạm đất, người còn nghiêng về trước, kiếm vừa chém qua.
6. Thu thế: đứng thẳng, kiếm hạ xuống bên hông.
```

### B. Bí Kỹ tăng sức (6 khung, dùng cho các nút Bí Kỹ: tăng chí mạng, tăng tốc, lá chắn)

```
[khối chung, N = 6] Đạo sĩ Kiếm Tu vận công tăng sức, không tấn công:
1. Đứng thế vững, kiếm chống xuống đất bên cạnh.
2. Nhắm mắt hít sâu, hai bàn tay khép trước ngực.
3. Hai tay mở ra hai bên, ngực nở.
4. Mở mắt sáng quắc, tay phải nhấc kiếm lên ngang người, thân vững.
5. Dậm chân, kiếm giơ chếch lên ra hiệu sẵn sàng.
6. Thu thế: về thế chờ gập gối, kiếm sau lưng.
```

### C. Bị đánh (2 khung)

```
[khối chung, N = 2, dải 2 ô] Đạo sĩ Kiếm Tu bị đòn:
1. Giật lùi về sau, thân nghiêng ra sau, nhăn mặt, một tay đưa lên đỡ, kiếm vẫn cầm.
2. Loạng choạng gần lấy lại thăng bằng, thân còn hơi nghiêng, mặt cắn răng.
```

### Nên vẽ theo thứ tự nào?

1. **Tuyệt Kỹ** trước: khác hẳn chém thường nên thấy ngay hiệu quả; Tru Tiên Nhất Kiếm là chiêu đẹp nhất của Kiếm Tu.
2. **Bí Kỹ tăng sức**: hiện các Bí Kỹ (Kiếm Tâm Thông Minh, Đạp Vân Bộ, Kiếm Ý Hộ Thể) không có động tác riêng.
3. **Bị đánh**: nhẹ nhất, chỉ 2 khung.

---

## Hiệu ứng kỹ năng: tranh cho Tuyệt Kỹ và Vạn Kiếm Quy Tông

Hiệu ứng 8 chiêu của Kiếm Tu đã có bản vẽ bằng code (`src/pixi/skillfx.js`). Hai chiêu lớn nhất nên có tranh. Hiệu ứng KHÔNG có nhân vật, nền XANH LÁ #00FF00 phẳng (hoặc ĐEN thuần nếu là ánh sáng: ánh sáng trên nền đen tôi trộn cộng thẳng vào cảnh, đẹp hơn tách nền).

### A. Kiếm ánh sáng khổng lồ cho Tru Tiên Nhất Kiếm (1 ảnh 2048x1024, nền ĐEN thuần)

```
Một thanh kiếm ánh sáng khổng lồ nằm ngang chiếm gần hết bề rộng ảnh, mũi kiếm chỉ sang phải: lưỡi kiếm trắng xanh lam phát sáng chói, đường nét kiếm cổ thanh thoát có hoa văn rồng vàng nhạt ở sống kiếm, chuôi và hộ thủ vàng kim bên trái, hào quang xanh lam toả ra quanh lưỡi kiếm, vài tia sáng và hạt sáng bay quanh. NỀN ĐEN THUẦN #000000, không chữ, không viền, không nhân vật.
```

### B. Bốn khung chém ánh sáng cho Tru Tiên Nhất Kiếm (dải 4 khung, 4096x512, nền ĐEN thuần)

```
Dải 4 khung ngang bằng nhau mô tả một nhát chém kiếm khổng lồ chéo từ trên trái xuống dưới phải, nền ĐEN THUẦN #000000: 1. vệt sáng hẹp mới xuất hiện ở góc trên trái; 2. vệt chém dài chéo xuyên ô, lõi trắng, viền xanh lam; 3. vệt chém đạt độ sáng và độ dày cực đại kèm tia nổ ở cuối đường chém; 4. vệt chém mờ dần, rải hạt sáng tan ra. Không chữ, không viền ô.
```

### C. Trận pháp kiếm cho Vạn Kiếm Quy Tông (1 ảnh 1024x512, nền ĐEN thuần)

```
Trận pháp tròn nhìn nghiêng ba phần tư (dẹt hình elip, như vẽ trên mặt đất) toả sáng vàng và xanh lam: hai vòng đồng tâm, giữa có hoa văn bát quái và phù văn cổ, tám thanh kiếm nhỏ cắm đứng quanh vòng ngoài, ánh sáng phát lên trên. NỀN ĐEN THUẦN #000000, không chữ, không viền.
```

### D. Thanh kiếm rơi cho Vạn Kiếm Quy Tông (1 ảnh 512x1024, nền ĐEN thuần)

```
Một thanh trường kiếm thẳng đứng mũi chúc xuống, đang rơi nhanh: lưỡi kiếm trắng xanh, chuôi vàng ở trên, vệt sáng xanh kéo dài phía trên chuôi như đang lao xuống. NỀN ĐEN THUẦN #000000, không chữ.
```

Gửi ảnh lên, tôi sẽ thay phần vẽ bằng code của hai chiêu này bằng tranh, vẫn giữ chuyển động và rung màn hình.
