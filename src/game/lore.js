// =====================================================================
// lore.js - Điển Tịch: các mục tri thức về thế giới Thương Khung, mở dần theo tiến độ.
// Mở khoá khi:
//   * chương truyện liệt kê id trong `unlock` hoàn thành (story.lore[id]), hoặc
//   * điều kiện `auto`: { stage: n } bậc cao nhất đã đạt >= n
//                       { dungeon: id } đã vào bí cảnh (hoặc đã vượt xa bậc chuẩn)
//                       { sect: true|id } đã gia nhập tông môn (bất kỳ / cụ thể)
//                       { flag: 'cờ' } cờ cốt truyện
//                       { stat: [khoá, tối thiểu] } thống kê
// =====================================================================

export const LORE_CATS = ['Thế giới', 'Cảnh giới', 'Bí cảnh', 'Tông môn', 'Nhân vật', 'Khái niệm']

export const LORE = [
  // ---------------- Thế giới ----------------
  { id: 'world_thuong_khung', cat: 'Thế giới', title: 'Đại lục Thương Khung',
    text: `Đại lục rộng lớn nằm giữa bốn biển, nơi linh khí từng dồi dào như nước. Người, yêu, ma và vô số tông môn sinh sống cùng nhau, và mọi kẻ tu hành đều tin rằng đỉnh cao của con đường là chạm tới cõi vô thượng.`,
    hint: 'Hoàn thành chương “Cô Nhi Thanh Hư”' },
  { id: 'world_ngu_hanh_an', cat: 'Thế giới', title: 'Ngũ Hành Phong Ấn Trận',
    text: `Trận pháp khổng lồ gồm năm cột trụ Kim, Mộc, Thủy, Hỏa, Thổ, do năm tông môn lớn gìn giữ. Nó neo giữ phong ấn của Thái Cổ Ma Thần dưới đáy Thái Cổ Ma Uyên. Linh khí suy yếu khiến các cột trụ mòn dần theo năm tháng.`,
    hint: 'Hoàn thành chương “Đạo Cơ Đã Thành”' },
  { id: 'world_dai_kiep', cat: 'Thế giới', title: 'Đại Kiếp Thái Cổ',
    text: `Thuở xa xưa, một tà thần từ khe nứt của trời đất trỗi dậy, nuốt chửng linh khí và sinh linh. Chín vị Đạo Tổ liên thủ phong ấn nó, nhưng cái giá là gần như toàn bộ linh mạch của đại lục. Từ đó, thiên địa mãi suy kiệt.`,
    hint: 'Hoàn thành chương “Thái Cổ Ma Uyên”' },
  { id: 'world_ket_cuc', cat: 'Thế giới', title: 'Bình Minh Sau Đại Kiếp',
    text: `Sau cuộc đối mặt cuối cùng nơi Hỗn Độn, thế gian bước vào một thời đại mới. Dù con đường nào được chọn, mọi người đều biết: vòng luân hồi vẫn quay, và còn nhiều điều chưa được kể.`,
    hint: 'Hoàn thành chương cuối' },

  // ---------------- Cảnh giới ----------------
  { id: 'realm_luyen_khi', cat: 'Cảnh giới', title: 'Luyện Khí',
    text: `Bước đầu tiên của người tu hành: dẫn linh khí vào cơ thể, tẩy luyện kinh mạch. Chín tầng Luyện Khí là chín lần kinh mạch được mở rộng, đặt nền cho mọi cảnh giới sau.`,
    auto: { stage: 0 } },
  { id: 'realm_truc_co', cat: 'Cảnh giới', title: 'Trúc Cơ',
    text: `Linh khí tản mạn kết thành nền móng trong đan điền. Qua cảnh giới này, thọ nguyên kéo dài, và người tu hành có thể ngự phi kiếm, bay trên không. Nhiều người dừng bước ở đây vì không vượt nổi lôi kiếp đầu tiên.`,
    auto: { stage: 9 } },
  { id: 'realm_kim_dan', cat: 'Cảnh giới', title: 'Kim Đan',
    text: `Linh lực nén thành một viên đạo quả vàng ròng. Kim Đan càng tròn, nền tảng càng vững. Đây là cảnh giới phân định kẻ tầm thường và kẻ có chí đạo.`,
    auto: { stage: 12 } },
  { id: 'realm_nguyen_anh', cat: 'Cảnh giới', title: 'Nguyên Anh',
    text: `Đan vỡ, nguyên anh sinh. Thần hồn có hình hài riêng, một niệm có thể rời thân xác đi xa vạn dặm. Kẻ đạt Nguyên Anh đã được xem là lão tổ ở phần lớn tông môn.`,
    auto: { stage: 15 } },
  { id: 'realm_hoa_than', cat: 'Cảnh giới', title: 'Hóa Thần',
    text: `Thần hồn thấu hiểu một mảnh pháp tắc của trời đất, mỗi cử động đều mang uy áp lên không gian. Từ cảnh giới này, tu sĩ bắt đầu thực sự thách thức thiên địa.`,
    auto: { stage: 18 } },
  { id: 'realm_luyen_hu', cat: 'Cảnh giới', title: 'Luyện Hư',
    text: `Hư và thực giao hoà. Thân thể có thể đi xuyên qua không gian, tựa như một khoảnh khắc đã ở nơi khác. Truyền thuyết nói rằng chỉ ở đây mới thấy rõ những khe nứt giữa các thế giới.`,
    auto: { stage: 21 } },
  { id: 'realm_hop_the', cat: 'Cảnh giới', title: 'Hợp Thể',
    text: `Thân, hồn, đạo hợp làm một. Cảnh giới cuối cùng mà phàm nhân biết đến, và là bậc thang đưa lên những tầng cao hơn nữa của đại đạo.`,
    auto: { stage: 24 } },

  // ---------------- Bí cảnh ----------------
  { id: 'dungeon_hac_phong', cat: 'Bí cảnh', title: 'Hắc Phong Cốc',
    text: `Thung lũng đầy yêu lang, nơi gió đen quanh năm gào qua vách núi. Đệ tử mới nhập môn thường đến đây rèn luyện, và đôi khi không bao giờ trở lại. Gần đây, mắt của lũ sói lại đỏ ngầu và có khói đen vấn vít.`,
    auto: { dungeon: 'hac_phong' } },
  { id: 'dungeon_linh_duoc', cat: 'Bí cảnh', title: 'Linh Dược Sơn',
    text: `Ngọn núi linh dược quý giá, nhưng mỗi gốc thảo mộc ngàn năm đều có thể đã thành tinh. Người hái thuốc sành sỏi luôn mang theo muối và đồng tiền cổ để xua yêu mộc.`,
    auto: { dungeon: 'linh_duoc' } },
  { id: 'dungeon_huyet_sat', cat: 'Bí cảnh', title: 'Huyết Sát Động',
    text: `Hang động ngầm do Huyết Ma Giáo chiếm cứ. Vách đá ngấm máu nhiều thế hệ, và những kẻ bị bắt buộc tu ma công ép phải sống trong đó đến hết đời.`,
    auto: { dungeon: 'huyet_sat' } },
  { id: 'dungeon_bang_phong', cat: 'Bí cảnh', title: 'Băng Phong Cực Địa',
    text: `Vùng cực bắc băng phủ vạn năm. Dưới tầng băng sâu có những di tích của thời Thái Cổ, bảo tồn nguyên vẹn như vừa mới được đặt xuống hôm qua.`,
    auto: { dungeon: 'bang_phong' } },
  { id: 'dungeon_cuu_u', cat: 'Bí cảnh', title: 'Cửu U Hoàng Tuyền',
    text: `Cõi âm giao thoa với dương gian. Linh hồn lạc lối tụ họp ở đây chờ một lối ra mà không bao giờ tìm thấy. Có kẻ nói chính những oan hồn này canh giữ lối vào Thái Cổ Ma Uyên.`,
    auto: { dungeon: 'cuu_u' } },
  { id: 'dungeon_ma_uyen', cat: 'Bí cảnh', title: 'Thái Cổ Ma Uyên',
    text: `Vực sâu không đáy, nơi Thái Cổ Ma Thần bị phong ấn. Ma khí đặc quánh như mực và đáy vực dường như đang thở. Năm cột sáng của Ngũ Hành Phong Ấn Trận chớp tắt yếu ớt dưới sâu.`,
    auto: { dungeon: 'ma_uyen' } },
  { id: 'dungeon_hu_khong', cat: 'Bí cảnh', title: 'Hư Không Giới',
    text: `Nơi các khe nứt giữa thế giới giao nhau. Không gian vặn xoắn, quy luật không còn đáng tin, và những kẻ lạc vào đây thường chỉ trở về trong dạng ảo ảnh.`,
    auto: { dungeon: 'hu_khong' } },
  { id: 'dungeon_hon_don', cat: 'Bí cảnh', title: 'Hỗn Độn Sơ Khai',
    text: `Tàn tích của buổi trời đất chưa phân. Ở đây thời gian trôi ngược, và mọi thứ đều có thể là chính nó hoặc là điều ngược lại.`,
    auto: { dungeon: 'hon_don' } },

  // ---------------- Tông môn ----------------
  { id: 'sect_all', cat: 'Tông môn', title: 'Ngũ Đại Tông Môn',
    text: `Thiên Kiếm Tông (Kim), Vạn Mộc Cốc (Mộc), Nguyệt Thủy Các (Thủy), Xích Viêm Môn (Hỏa) và Hậu Thổ Sơn (Thổ) là năm tông môn gìn giữ Ngũ Hành Phong Ấn Trận. Mỗi tông môn đều có một đệ tử lớn tuổi nhất canh giữ cột trụ, quanh năm không rời chỗ.`,
    hint: 'Hoàn thành chương “Đạo Cơ Đã Thành”' },
  { id: 'sect_join', cat: 'Tông môn', title: 'Cống Hiến và Cấp Bậc',
    text: `Trong tông môn, Cống Hiến là thước đo công lao. Từ Ngoại Môn đến Chưởng Môn là sáu cấp bậc, mỗi cấp mở thêm đặc quyền và cánh cửa tới những bảo vật bí mật của tông.`,
    auto: { sect: true } },

  // ---------------- Nhân vật ----------------
  { id: 'char_thanh_hu', cat: 'Nhân vật', title: 'Thanh Hư',
    text: `Vị lão nhân áo xanh sống ẩn trong Thanh Hư Cốc, nhận {name} làm đồ đệ khi còn là cô nhi. Ông ít nói, hay nhìn xa xăm. Sau này mới biết, ông chính là một nửa thần hồn của Đạo Tổ thứ chín.`,
    hint: 'Hoàn thành chương “Cô Nhi Thanh Hư”' },
  { id: 'char_bach_linh', cat: 'Nhân vật', title: 'Bạch Linh',
    text: `Hồ ly nhỏ lông trắng như tuyết, nghe và nói được tiếng người. Bạch Linh luôn cảm thấy một nỗi quen thuộc kỳ lạ với {name}, như thể đã gặp từ rất lâu, rất nhiều kiếp trước.`,
    hint: 'Hoàn thành chương “Đồng Môn”' },
  { id: 'char_mac_vo_ngan', cat: 'Nhân vật', title: 'Mặc Vô Ngân',
    text: `Thiên linh căn, thiên tài trăm năm có một, kiêu ngạo và cô độc. Hắn luôn khao khát chứng tỏ mình, và chính khao khát ấy là kẽ hở khiến ma khí len vào thần hồn.`,
    hint: 'Hoàn thành chương “Đồng Môn”' },
  { id: 'char_a_tu', cat: 'Nhân vật', title: 'A Tử',
    text: `Đứa trẻ bị Huyết Ma Giáo bắt đi, ép tu ma công. Được {name} cứu, A Tử ghi nhớ ơn ấy suốt đời và thề sẽ dùng sức mình để giúp những đứa trẻ như nó.`,
    auto: { flag: 'spared_child' } },
  { id: 'char_than_hon', cat: 'Nhân vật', title: 'Đạo Tổ Thứ Chín',
    text: `Người cuối cùng trong chín vị Đạo Tổ phong ấn Ma Thần. Ông cắt thần hồn làm đôi: một nửa nằm lại làm trận nhãn, nửa kia gửi vào vòng luân hồi để chờ ngày trở lại. Nửa ấy chính là {name}.`,
    hint: 'Hoàn thành chương “Cửu U Hồi Âm”' },

  // ---------------- Khái niệm ----------------
  { id: 'concept_linh_can', cat: 'Khái niệm', title: 'Linh Căn',
    text: `Tư chất hấp thụ linh khí bẩm sinh. Càng ít loại linh căn càng thuần, tu luyện càng nhanh. Ngũ Linh Căn khó tu nhất, Thiên Linh Căn vạn người mới có một.`,
    auto: { stage: 0 } },
  { id: 'concept_ngu_hanh', cat: 'Khái niệm', title: 'Ngũ Hành Tương Khắc',
    text: `Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim. Đánh đúng hệ khắc, uy lực tăng thêm; đánh nhầm hệ bị khắc, uy lực giảm sút. Nắm được vòng này là nắm được nửa chiến trường.`,
    auto: { dungeon: 'hac_phong' } },
  { id: 'concept_ma_khi', cat: 'Khái niệm', title: 'Ma Khí',
    text: `Khí tức đen đặc, đói khát và cổ xưa, rò rỉ từ phong ấn Thái Cổ Ma Thần. Nó xâm thực yêu thú, rồi đến người, biến kẻ bị ảnh hưởng thành công cụ của nỗi đói không đáy.`,
    hint: 'Hoàn thành chương “Đồng Môn”' },
  { id: 'concept_phong_an', cat: 'Khái niệm', title: 'Phong Ấn',
    text: `Một trận pháp duy trì bằng linh khí và thần hồn của những người có ý chí kiên định. Theo thời gian, nó cần được gia cố, và cái giá cho mỗi lần gia cố ngày một nặng.`,
    hint: 'Hoàn thành chương “Mắt Đỏ Hắc Phong”' },
  { id: 'concept_huyet_ma_giao', cat: 'Khái niệm', title: 'Huyết Ma Giáo',
    text: `Giáo phái tà đạo sùng bái Thái Cổ Ma Thần, tin rằng nuốt máu sinh linh có thể đổi lấy sức mạnh vô biên. Chúng bắt trẻ mồ côi làm vật tế và ép tu ma công.`,
    hint: 'Hoàn thành chương “Nhân Tâm Huyết Sát”' },
  { id: 'concept_luan_hoi', cat: 'Khái niệm', title: 'Luân Hồi',
    text: `Vòng chuyển sinh bất tận. Thần hồn mạnh mẽ có thể mang theo ký ức, công pháp và bảo vật qua các kiếp, tựa như bản thân vòng luân hồi đang ghi nhớ giúp họ. Mỗi lần chuyển thế đều làm phong ấn vững hơn một chút.`,
    hint: 'Hoàn thành chương “Băng Phong Tàn Ký”' },
  { id: 'concept_thien_kiep', cat: 'Khái niệm', title: 'Thiên Kiếp',
    text: `Khi tu sĩ vượt qua một đại cảnh giới, trời đất giáng lôi để thử thách. Càng lên cao, số đạo thiên lôi càng nhiều và uy lực càng khủng khiếp. Hộ Kiếp Đan và thân thể cường tráng là hai chỗ dựa lớn nhất.`,
    auto: { stat: ['tribulations', 1] } },
  { id: 'concept_linh_thach', cat: 'Khái niệm', title: 'Linh Thạch',
    text: `Khoáng thạch kết tinh từ linh khí thiên địa, thông dụng như bạc trong phàm gian. Linh thạch được dùng để bày trận, luyện đan, rèn khí, và nuôi dưỡng đệ tử.`,
    auto: { stage: 0 } },
]

export const loreById = (id) => LORE.find((l) => l.id === id) ?? null
