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
