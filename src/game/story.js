// =====================================================================
// story.js - Cốt truyện chính: 10 chương + chương chuyển thế.
//
// Một chương = danh sách cảnh (scenes). Loại cảnh:
//   { text, speaker? }                         - lời dẫn / lời thoại
//   { input: 'name', text }                    - nhập tên nhân vật
//   { choice: { prompt, options: [...] } }     - lựa chọn
// Điều kiện hiển thị cảnh: if: 'cờ' | ['cờ', ...] (có một trong các cờ), unless: 'cờ'.
// Tuỳ chọn: { label, result, flag?, align?, effects?, ending?, requires? }
//   requires: { align?: số tối thiểu, flag?: 'cờ' } - không đủ thì khoá nút
// Trong văn bản: {name} = tên nhân vật.
// Cốt truyện gắn với luân hồi: người chơi là "kẻ mang thần hồn Đạo Tổ", mỗi kiếp là một
// lần gia cố phong ấn Thái Cổ Ma Thần.
// =====================================================================

/** Màu theo người nói (để hộp thoại dễ phân biệt). */
export const SPEAKERS = {
  'Thanh Hư': '#7fe3ff',
  'Mặc Vô Ngân': '#ff8a7a',
  'Bạch Linh': '#ffd9ec',
  'A Tử': '#c9a8ff',
  'Hồn Cũ': '#9aa8ff',
  'Thái Cổ Ma Thần': '#ff4a5a',
}

export const ENDINGS = {
  guardian: { title: 'Thủ Hộ Giả', name: 'Thủ Hộ' },
  demon: { title: 'Ma Tôn', name: 'Ma Đạo' },
  ascend: { title: 'Tân Đạo Tổ', name: 'Siêu Thoát' },
}

export const CHAPTERS = [
  // ------------------------------------------------------------------
  {
    id: 'ch0',
    title: 'Cô Nhi Thanh Hư',
    hint: 'Bắt đầu hành trình',
    minStage: 0,
    scenes: [
      { text: `Mưa lạnh rơi xuống Thanh Hư Cốc. Giữa đống tàn tích của một ngôi miếu cũ, một đứa trẻ co ro, bàn tay nhỏ nắm chặt viên đá phát ra thứ ánh sáng mờ nhạt, thứ duy nhất người ta để lại cho nó.` },
      { text: `Ngươi không nhớ cha mẹ, cũng không nhớ tên mình. Chỉ nhớ một giấc mộng cứ lặp đi lặp lại: chín lần ngã xuống giữa biển lửa, và một giọng nói thì thầm bên tai: “Lần này, đừng buông tay.”` },
      { input: 'name', text: `Một bóng người áo xanh dừng lại trước ngôi miếu, cúi xuống nhìn ngươi. “Nhóc con, người ta gọi ngươi là gì?”` },
      { speaker: 'Thanh Hư', text: `“{name} ư? Cái tên không tệ.” Ông vuốt chòm râu bạc. “Căn cốt tạp loạn, nhưng kinh mạch lại rộng như sông lớn. Lạ thật… Theo ta về động phủ, ta là Thanh Hư.”` },
      {
        choice: {
          prompt: `Trên đường lên núi, Thanh Hư hỏi: “Ngươi muốn tu tiên để làm gì?”`,
          options: [
            { label: `Để sống thật lâu`, flag: 'motive_life', effects: [{ type: 'stat', stat: 'hp', amount: 30 }], result: `“Ta muốn sống, sống đến khi nhìn thấy tận cùng của trời đất.” Thanh Hư cười khẽ: “Mong muốn bình thường nhất cũng là mong muốn khó nhất.”` },
            { label: `Để không ai bị bỏ rơi như ta`, flag: 'motive_protect', align: 1, effects: [{ type: 'stat', stat: 'def', amount: 5 }], result: `“Ta muốn đủ mạnh để không ai phải bị bỏ lại giữa mưa như ta.” Bàn tay Thanh Hư dừng một thoáng trên vai ngươi, ấm lạ lùng.` },
            { label: `Để biết giấc mộng kia là gì`, flag: 'motive_truth', effects: [{ type: 'expBonus', amount: 0.01 }], result: `“Ta muốn biết chín lần ngã xuống ấy nghĩa là gì.” Thanh Hư không đáp, chỉ nhìn về phía xa rất lâu.` },
          ],
        },
      },
      { text: `Từ ngày ấy, con đường tu tiên của {name} bắt đầu.` },
    ],
    reward: [{ type: 'stones', base: 60 }, { type: 'item', id: 'tu_khi_dan', count: 2 }],
    unlock: ['world_thuong_khung', 'char_thanh_hu'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch1',
    title: 'Đồng Môn',
    hint: 'Đạt Luyện Khí Tầng 4',
    minStage: 3,
    scenes: [
      { text: `Ba năm trôi qua trong tiếng gió núi và mùi thảo dược. {name} đã quen với việc ngồi thiền trước bình minh, đón linh khí đầu tiên của ngày.` },
      { text: `Hôm ấy, bên khe suối, ngươi nghe thấy tiếng rên khẽ. Một chú hồ ly con lông trắng như tuyết nằm giữa đám rêu, chân sau bị một đạo ma khí mảnh như sợi tóc quấn chặt.` },
      { speaker: 'Bạch Linh', text: `“Ngươi… nghe được ta nói?” Đôi mắt hồ ly mở to. “Đã lâu lắm rồi… mới có người nghe được ta.”` },
      { text: `Ngươi hái nhành linh thảo bên cạnh, nghiền nát, đắp vào vết thương. Làn khí đen tan đi như sương gặp nắng.` },
      { speaker: 'Mặc Vô Ngân', text: `“Linh thảo ba trăm năm… ngươi dùng nó cho một con súc sinh?” Một thiếu niên áo trắng đứng trên tảng đá, ánh mắt kiêu ngạo. “Ta là Mặc Vô Ngân, thiên linh căn, đệ tử thân truyền của Chấp Sự Phong. Đưa phần còn lại đây.”` },
      {
        choice: {
          prompt: `Trong tay ngươi vẫn còn nửa gốc linh thảo. Mặc Vô Ngân đang chìa tay ra.`,
          options: [
            { label: `Chia đôi, mỗi người một nửa`, flag: 'rival_friend', align: 1, effects: [{ type: 'item', id: 'linh_thao', count: 3 }], result: `Mặc Vô Ngân sững lại, rồi hừ một tiếng nhưng vẫn nhận lấy. “…Không ai nợ ai.” Lúc quay đi, khoé môi hắn khẽ cong.` },
            { label: `Nhường hết cho hắn`, flag: 'rival_respect', effects: [{ type: 'stat', stat: 'def', amount: 3 }], result: `Hắn nhận lấy với vẻ đương nhiên, nhưng bước đi chậm hơn một nhịp. “Ngươi tên gì?” “{name}.” “Ta nhớ rồi.”` },
            { label: `Giữ lại, đó là công của ta`, flag: 'rival_cold', effects: [{ type: 'stat', stat: 'atk', amount: 4 }], result: `“Hay lắm.” Mắt Mặc Vô Ngân lạnh đi. “Rồi sẽ có ngày ta đòi lại, gấp mười.” Hắn bỏ đi, áo trắng không dính hạt bụi.` },
          ],
        },
      },
      { speaker: 'Bạch Linh', text: `“Ta đi theo ngươi được không?” Hồ ly con rụt rè cọ vào cổ chân ngươi. “Ta thấy ngươi… rất quen.”` },
      { text: `Bạch Linh trở thành người bạn đầu tiên của {name}.` },
    ],
    reward: [{ type: 'stones', base: 120 }, { type: 'item', id: 'huyet_sam', count: 2 }],
    unlock: ['char_bach_linh', 'char_mac_vo_ngan', 'concept_ma_khi'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch2',
    title: 'Mắt Đỏ Hắc Phong',
    hint: 'Thông quan Hắc Phong Cốc',
    minStage: 5,
    needClear: 'hac_phong',
    scenes: [
      { text: `Con Lang Vương cuối cùng đổ xuống giữa Hắc Phong Cốc, tiếng gió gào lắng dần. Nhưng khi ngươi đến gần, bước chân khựng lại.` },
      { text: `Trong hốc mắt đỏ ngầu của nó, một làn khói đen đang tan ra. Không phải khí tức của yêu thú, mà là thứ gì đó cổ xưa và đói khát hơn nhiều.` },
      { speaker: 'Bạch Linh', text: `Bạch Linh dựng cả lông lên, run rẩy. “Cái này… ta biết. Nó là thứ bị nhốt rất lâu, rất lâu rồi.”` },
      { speaker: 'Thanh Hư', text: `Thanh Hư xuất hiện lúc nào không hay, sắc mặt trầm xuống. “Ma khí. Phong ấn… đã lung lay sớm hơn ta dự tính.”` },
      {
        choice: {
          prompt: `Sư phụ vừa nói “phong ấn”. Ngươi định hỏi gì?`,
          options: [
            { label: `“Phong ấn nào, thưa sư phụ?”`, flag: 'asked_seal', effects: [{ type: 'expBonus', amount: 0.01 }], result: `Thanh Hư im lặng hồi lâu. “Chưa đến lúc. Nhưng ta hứa, khi ngươi bước vào Trúc Cơ, ngươi sẽ được biết.” Ánh mắt ông có chút gì như áy náy.` },
            { label: `Im lặng, chỉ khẽ gật đầu`, flag: 'trusted_master', effects: [{ type: 'stat', stat: 'hp', amount: 25 }], result: `Ông nhìn ngươi, thở ra rất khẽ. “Đứa trẻ ngoan. Có những chuyện, biết sớm chỉ thêm nặng lòng.”` },
          ],
        },
      },
      { text: `Đêm đó, {name} nằm nhìn lên trần động phủ mãi không ngủ được. Hai chữ “phong ấn” vang đi vang lại, hòa vào tiếng lửa cháy trong giấc mộng chín lần.` },
    ],
    reward: [{ type: 'stones', base: 200 }, { type: 'item', id: 'kiem_quyet', count: 1 }],
    unlock: ['dungeon_hac_phong', 'concept_phong_an'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch3',
    title: 'Đạo Cơ Đã Thành',
    hint: 'Đạt Trúc Cơ Sơ Kỳ',
    minStage: 9,
    scenes: [
      { text: `Đan điền chấn động, linh khí rót xuống như thác. Khi mọi thứ lắng lại, nền móng đã thành, vững chãi như một ngọn núi nhỏ. {name} đã bước vào Trúc Cơ.` },
      { speaker: 'Thanh Hư', text: `“Ta đã hứa. Ngồi xuống đi, {name}.” Thanh Hư bày một bàn cờ ngũ sắc lên đá. “Thuở Thái Cổ, một vị tà thần đã suýt nuốt chửng cả đại lục Thương Khung. Chín vị Đạo Tổ liên thủ phong ấn nó dưới Thái Cổ Ma Uyên.”` },
      { speaker: 'Thanh Hư', text: `“Ngũ Hành Phong Ấn Trận có năm cột trụ, do năm tông môn gìn giữ: Kim, Mộc, Thủy, Hỏa, Thổ. Nhưng linh khí thiên địa ngày một cạn, các cột trụ đã mòn mỏi.”` },
      { speaker: 'Bạch Linh', text: `“Vậy nên ma khí mới lọt ra ngoài.” Bạch Linh thì thầm, đuôi cuộn lại thật chặt.` },
      {
        choice: {
          prompt: `Thanh Hư chỉ vào năm quân cờ trên bàn. “Ngươi thấy mình hợp với cột trụ nào?”`,
          options: [
            { label: `Kim, sắc bén, quyết đoán`, flag: 'pillar_kim', effects: [{ type: 'stat', stat: 'atk', amount: 6 }], result: `Quân cờ Kim sáng lên. “Kiếm tâm của ngươi chưa thành hình, nhưng có mầm.”` },
            { label: `Mộc, sinh sôi, bền bỉ`, flag: 'pillar_moc', effects: [{ type: 'stat', stat: 'hp', amount: 40 }], result: `Quân cờ Mộc nảy một chồi xanh. “Sức sống của ngươi dai hơn ngươi nghĩ.”` },
            { label: `Thủy, thuận dòng, thấu suốt`, flag: 'pillar_thuy', effects: [{ type: 'expBonus', amount: 0.01 }], result: `Quân cờ Thủy gợn sóng. “Tâm tĩnh như nước, hiếm có.”` },
            { label: `Hỏa, rực cháy, bất khuất`, flag: 'pillar_hoa', effects: [{ type: 'stat', stat: 'speed', amount: 2 }], result: `Quân cờ Hỏa bùng một ngọn lửa nhỏ. “Cẩn thận, lửa thiêu được kẻ thù cũng thiêu được chính mình.”` },
            { label: `Thổ, vững vàng, che chở`, flag: 'pillar_tho', effects: [{ type: 'stat', stat: 'def', amount: 6 }], result: `Quân cờ Thổ nằm im như một hòn đá. “Chính những kẻ im lặng mới gánh được trời.”` },
          ],
        },
      },
      { text: `Thanh Hư dọn bàn cờ, nhìn ngươi lâu hơn thường lệ. “Khi nào đủ vững, hãy tìm một tông môn mà gia nhập. Một mình, không ai giữ nổi trận pháp ấy.”` },
    ],
    reward: [{ type: 'stones', base: 400 }, { type: 'item', id: 'cuong_can_dan', count: 1 }],
    unlock: ['realm_truc_co', 'world_ngu_hanh_an', 'sect_all'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch4',
    title: 'Nhân Tâm Huyết Sát',
    hint: 'Thông quan Huyết Sát Động',
    minStage: 10,
    needClear: 'huyet_sat',
    scenes: [
      { text: `Huyết Ma Vương gục xuống giữa Huyết Sát Động, thân thể tan thành làn sương đỏ. Hang động im phăng phắc, chỉ còn tiếng nước nhỏ giọt.` },
      { text: `Rồi ngươi nghe thấy tiếng thở yếu ớt sau tảng đá. Một đứa trẻ chừng mười tuổi, áo đen rách rưới, hai tay bấu chặt vạt áo. Quanh cổ nó là vết khắc huyết ấn của Huyết Ma Giáo.` },
      { speaker: 'A Tử', text: `“Đừng… đừng giết ta.” Nó run lẩy bẩy. “Họ bắt ta tu ma công. Ta chỉ muốn về nhà…”` },
      { speaker: 'Bạch Linh', text: `“Huyết ấn đó là thật.” Bạch Linh khẽ nói. “Nhưng nó cũng có thể là mồi nhử, {name}.”` },
      {
        choice: {
          prompt: `Đứa trẻ ngước nhìn ngươi bằng đôi mắt đỏ hoe. Ngươi quyết định…`,
          options: [
            { label: `Tha cho nó và hộ tống ra khỏi núi`, flag: 'spared_child', align: 2, effects: [{ type: 'stat', stat: 'hp', amount: 40 }, { type: 'item', id: 'huyet_sam', count: 3 }], result: `Ngươi cắt đứt huyết ấn bằng linh lực. Đứa trẻ khóc nấc rồi cúi đầu thật sâu. “Ơn này, A Tử xin nhớ mãi.” Bạch Linh quay đầu đi, giấu vội đôi mắt cay.` },
            { label: `Giao nó cho Thanh Hư xử trí`, flag: 'child_to_master', align: 0, effects: [{ type: 'stones', base: 150 }], result: `Thanh Hư nhìn đứa trẻ rất lâu rồi gật đầu. “Để ta lo.” Ngươi không biết số phận nó về sau, chỉ biết sư phụ chưa bao giờ nói dối.` },
            { label: `Diệt cỏ tận gốc, không để hậu hoạn`, flag: 'purged_child', align: -2, effects: [{ type: 'stat', stat: 'atk', amount: 8 }, { type: 'stones', base: 250 }], result: `Kiếm quang loé lên. Hang động lại trở về im lặng. Ngươi tự nhủ mình đã làm điều cần làm, nhưng tay vẫn lạnh suốt đêm đó.` },
          ],
        },
      },
    ],
    reward: [{ type: 'stones', base: 600 }, { type: 'item', id: 'tu_van_thao', count: 3 }],
    unlock: ['dungeon_huyet_sat', 'concept_huyet_ma_giao'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch5',
    title: 'Kim Đan Chi Tranh',
    hint: 'Đạt Kim Đan Sơ Kỳ',
    minStage: 12,
    scenes: [
      { text: `Viên kim đan xoay tròn giữa đan điền, rực như một mặt trời nhỏ. Đạo lực dâng trào, sức nặng của thiên địa như vừa nhấc khỏi hai vai.` },
      { speaker: 'Mặc Vô Ngân', if: 'rival_friend', text: `Mặc Vô Ngân chặn ngươi ở bậc đá, nụ cười nửa miệng quen thuộc. “Kim Đan rồi à? Ta cũng vừa xong. Có dám chiến một trận không? Lần này không phải vì linh thảo.”` },
      { speaker: 'Mặc Vô Ngân', if: 'rival_respect', text: `Mặc Vô Ngân đứng chờ sẵn, ánh mắt không còn kiêu ngạo như xưa. “Ta nhớ ngươi, kẻ đã nhường ta ngày ấy. Hôm nay ta muốn biết ngươi đã đi xa đến đâu.”` },
      { speaker: 'Mặc Vô Ngân', if: 'rival_cold', text: `Mặc Vô Ngân đứng chắn đường, ánh mắt lạnh như băng. “Ta đã nói sẽ có ngày đòi lại. Hôm nay là ngày đó.”` },
      { text: `Trên diễn võ đài, hai đạo kim quang va vào nhau. Mặc Vô Ngân mạnh hơn ngươi tưởng, từng chiêu như cả một biển kiếm. Trong lúc giằng co, Bạch Linh khẽ truyền âm: “Ta có thể tạo ảo ảnh khiến hắn lộ sơ hở.”` },
      {
        choice: {
          prompt: `Thế trận đang cân bằng. Ngươi chọn cách nào?`,
          options: [
            { label: `Đường đường chính chính, phân thắng bại bằng thực lực`, flag: 'duel_honor', align: 1, effects: [{ type: 'stat', stat: 'atk', amount: 8 }], result: `Ngươi đỡ chiêu cuối của hắn bằng thân thể, rồi một kiếm dừng lại sát cổ hắn. Mặc Vô Ngân thở dốc, nhìn ngươi thật lâu rồi cười: “Được. Ta phục.”` },
            { label: `Nhờ Bạch Linh dựng ảo ảnh`, flag: 'duel_trick', align: -1, effects: [{ type: 'stat', stat: 'speed', amount: 3 }, { type: 'stones', base: 300 }], result: `Ảo ảnh khiến hắn chém vào khoảng không. Kiếm ngươi chạm vào vai áo hắn. Mặc Vô Ngân nghiến răng: “Hèn hạ… nhưng ta thua.” Hắn quay đi, lưng thẳng cứng.` },
          ],
        },
      },
      { speaker: 'Thanh Hư', text: `Từ xa, Thanh Hư nhìn trận đấu, lặng lẽ thở dài. “Kim Đan chỉ là nửa con đường. Kẻ nào mãn nguyện ở đây, sẽ chẳng thấy được bầu trời thật.”` },
    ],
    reward: [{ type: 'stones', base: 900 }, { type: 'item', id: 'than_phap_dan', count: 1 }],
    unlock: ['realm_kim_dan'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch6',
    title: 'Băng Phong Tàn Ký',
    hint: 'Thông quan Băng Phong Cực Địa',
    minStage: 13,
    needClear: 'bang_phong',
    scenes: [
      { text: `Sâu trong Băng Phong Cực Địa, sau vách băng xanh thẳm, một cỗ quan tài trong suốt nằm lặng giữa ánh cực quang. Bên trong, không có thi thể, chỉ có một dấu ấn bàn tay phát sáng.` },
      { speaker: 'Bạch Linh', text: `Bạch Linh ngẩn người nhìn dấu ấn, giọng lạc đi. “Ta nhớ… ta thật sự nhớ rồi. Ta từng ngồi bên người này, rất nhiều kiếp trước.”` },
      { text: `Dấu ấn khớp với bàn tay ngươi, không hơn không kém một ly. Hơi lạnh thấm vào tận xương.` },
      {
        choice: {
          prompt: `Dấu ấn đang chờ. Chạm vào, có thể ký ức sẽ trào về. Hoặc có thể không phải điều ngươi muốn biết.`,
          options: [
            { label: `Chạm tay vào, chấp nhận ký ức`, flag: 'memory_accepted', align: 1, effects: [{ type: 'expBonus', amount: 0.02 }, { type: 'exp', seconds: 1800 }], result: `Chín khuôn mặt hiện lên trong ánh băng, đều là ngươi, ở chín thời đại khác nhau. Mỗi người đều ngã xuống trước một bóng đen khổng lồ, và mỗi người đều thì thầm cùng một câu: “Ta sẽ trở lại.”` },
            { label: `Rụt tay, phong ấn lại dấu ấn`, flag: 'memory_sealed', effects: [{ type: 'stat', stat: 'def', amount: 10 }], result: `Ngươi niệm phù, băng dày thêm một lớp, che kín dấu ấn. Bạch Linh nhìn ngươi, buồn buồn. “Không sao. Khi nào sẵn sàng, nó vẫn ở đây.”` },
          ],
        },
      },
    ],
    reward: [{ type: 'stones', base: 1200 }, { type: 'item', id: 'bang_lien', count: 2 }],
    unlock: ['dungeon_bang_phong', 'concept_luan_hoi'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch7',
    title: 'Cửu U Hồi Âm',
    hint: 'Thông quan Cửu U Hoàng Tuyền',
    minStage: 15,
    needClear: 'cuu_u',
    scenes: [
      { text: `Giữa Cửu U Hoàng Tuyền, những linh hồn lạc lối trôi dạt như đom đóm. Khi ngươi đi qua, chúng dừng lại, xếp thành hai hàng, cúi đầu.` },
      { speaker: 'Hồn Cũ', text: `“Đệ tử đời cuối của Cửu Tổ.” Một bóng hồn mỏng như khói cất tiếng. “Chúng ta đã chờ ngươi từ khi Đại Kiếp kết thúc.”` },
      { speaker: 'Hồn Cũ', text: `“Vị Đạo Tổ thứ chín, người đã cắt đôi thần hồn của mình, một nửa làm trận nhãn phong ấn, một nửa gửi vào vòng luân hồi để chờ ngày trở lại. Nửa ấy… chính là ngươi.”` },
      { speaker: 'Bạch Linh', text: `Bạch Linh sững sờ nhìn ngươi, rồi nhìn xuống đất. “Vậy nên sư phụ… ông ấy…”` },
      {
        choice: {
          prompt: `Một cái tên đã nằm sẵn trong đầu ngươi: Thanh Hư. Ngươi sẽ làm gì?`,
          options: [
            { label: `Quay về chất vấn sư phụ ngay`, flag: 'confronted_master', effects: [{ type: 'stat', stat: 'atk', amount: 10 }], result: `Ngươi siết chặt nắm tay, sát khí chưa tan. Có những câu hỏi nếu để qua đêm sẽ thành vết thương. Ngươi quyết định hỏi cho rõ.` },
            { label: `Bình tĩnh, chờ đến khi sư phụ tự nói`, flag: 'waited_master', align: 1, effects: [{ type: 'stat', stat: 'hp', amount: 80 }], result: `Ngươi hít sâu, nhìn đàn hồn trôi vào bóng tối. Thanh Hư chưa bao giờ nói dối. Ông chỉ chưa nói hết.` },
          ],
        },
      },
    ],
    reward: [{ type: 'stones', base: 1800 }, { type: 'item', id: 'tinh_kim', count: 2 }],
    unlock: ['dungeon_cuu_u', 'char_than_hon'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch8',
    title: 'Thái Cổ Ma Uyên',
    hint: 'Thông quan Thái Cổ Ma Uyên',
    minStage: 18,
    needClear: 'ma_uyen',
    scenes: [
      { text: `Thái Cổ Ma Uyên mở ra trước mắt như một vết thương khổng lồ của đại lục. Dưới đáy vực, năm cột sáng của Ngũ Hành Phong Ấn Trận chớp tắt yếu ớt như ngọn nến trước gió.` },
      { speaker: 'Thanh Hư', text: `Thanh Hư đứng chờ ở mép vực, tóc đã bạc gần hết. “Ngươi đã biết rồi, phải không?” Ông không tránh ánh mắt ngươi. “Ta không phải sư phụ ngươi. Ta là nửa kia của ngươi.”` },
      { speaker: 'Thanh Hư', if: 'confronted_master', text: `“Ngươi giận ta, ta hiểu. Ta đã nhìn ngươi lớn lên mà không nói, vì sợ nói rồi ngươi sẽ gánh nặng ngay từ bé.”` },
      { speaker: 'Thanh Hư', if: 'waited_master', text: `“Cảm ơn ngươi đã chờ ta. Ta chưa bao giờ biết ơn điều gì hơn thế.”` },
      { speaker: 'Thanh Hư', text: `“Phong ấn chỉ giữ được bằng một thần hồn đã trải chín lần kiếp nạn. Ngươi đã ngã xuống chín lần, nên đủ sức tiếp nhận ấn nhãn. Còn ta… đã đến hạn.”` },
      {
        choice: {
          prompt: `Thanh Hư bước về phía vực sâu, thân hình dần trong suốt. Ông sẽ hoá thành ánh sáng trấn phong ấn thêm một thời gian.`,
          options: [
            { label: `Nắm lấy tay ông: “Lần này, con không buông.”`, flag: 'held_master', align: 1, effects: [{ type: 'expBonus', amount: 0.03 }, { type: 'stat', stat: 'hp', amount: 150 }], result: `Câu nói trong giấc mộng chín lần cuối cùng đã thành lời. Thanh Hư mỉm cười, nước mắt chảy ra. “Ừ… lần này, ta cũng không buông.” Hai thần hồn giao hoà, ấm như ánh mặt trời đầu tiên.` },
            { label: `Cúi đầu thật sâu, nhận lấy trách nhiệm`, flag: 'bowed_master', effects: [{ type: 'stat', stat: 'def', amount: 20 }, { type: 'stat', stat: 'atk', amount: 15 }], result: `“Đệ tử xin nhận.” Thanh Hư gật đầu, hoá thành một dải ánh sáng bay vào vực. Năm cột trụ sáng bừng lên, như thở ra một hơi rất dài.` },
          ],
        },
      },
      { speaker: 'Bạch Linh', text: `Bạch Linh rúc vào lòng ngươi, rất nhỏ giọng. “Ông ấy đã chờ ngày này, rất rất lâu rồi.”` },
    ],
    reward: [{ type: 'stones', base: 3000 }, { type: 'item', id: 'hoa_than_qua', count: 3 }],
    unlock: ['realm_hoa_than', 'dungeon_ma_uyen', 'world_dai_kiep'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch9',
    title: 'Hư Không Chi Biệt',
    hint: 'Thông quan Hư Không Giới',
    minStage: 21,
    needClear: 'hu_khong',
    scenes: [
      { text: `Trong Hư Không Giới, không gian vặn vẹo như lụa bị xé. Giữa những mảnh đá trôi dạt, một bóng áo trắng đứng quay lưng, quanh người cuộn xoáy khí đen.` },
      { speaker: 'Mặc Vô Ngân', text: `“Ngươi đến muộn rồi, {name}.” Giọng Mặc Vô Ngân khàn đặc. “Ta tưởng chỉ cần đủ mạnh, ta sẽ không bao giờ thua nữa. Nhưng hắn… hắn hứa cho ta sức mạnh để thắng ngươi.”` },
      { speaker: 'Mặc Vô Ngân', if: 'rival_friend', text: `Mắt hắn đỏ hoe. “Ta nhớ ngày chia linh thảo bên khe suối. Đó là lúc cuối cùng ta thấy mình chưa phải kẻ cô độc.”` },
      { speaker: 'Mặc Vô Ngân', if: 'rival_cold', text: `Hắn cười, chua chát. “Ngươi đã nói đúng. Từ ngày ấy, ta chỉ còn biết mạnh lên để đòi lại những thứ không ai nợ ta.”` },
      { speaker: 'Bạch Linh', text: `“Ma khí đã ăn vào thần hồn hắn rồi.” Bạch Linh nói. “Còn cứu được, nếu ngươi chịu trả giá.”` },
      {
        choice: {
          prompt: `Mặc Vô Ngân đang đứng giữa lằn ranh. Một đạo kiếm của ngươi có thể hoặc cắt đứt ma khí, hoặc cắt đứt cả hắn.`,
          options: [
            { label: `Dùng thần hồn mình dẫn ma khí ra khỏi hắn`, flag: 'rival_saved', align: 2, requires: { align: 0 }, effects: [{ type: 'stat', stat: 'hp', amount: 120 }, { type: 'expBonus', amount: 0.02 }], result: `Thần hồn ngươi nhói như bị xé. Ma khí đổ dồn sang, rồi tan trong ánh sáng ấn nhãn. Mặc Vô Ngân ngã quỵ, bình thường trở lại. “…Tại sao?” “Vì ngươi là đồng môn của ta.”` },
            { label: `Hạ thủ, chấm dứt đau khổ cho hắn`, flag: 'rival_lost', align: -1, effects: [{ type: 'stat', stat: 'atk', amount: 20 }, { type: 'stones', base: 1500 }], result: `Kiếm quang vụt qua. Mặc Vô Ngân mỉm cười lần cuối, rất nhẹ: “Cảm ơn…” Bạch Linh quay đi, không nói một lời.` },
          ],
        },
      },
    ],
    reward: [{ type: 'stones', base: 5000 }, { type: 'item', id: 'hu_khong_thach', count: 3 }],
    unlock: ['dungeon_hu_khong', 'realm_luyen_hu'],
  },

  // ------------------------------------------------------------------
  {
    id: 'ch10',
    title: 'Hỗn Độn Chung Cuộc',
    hint: 'Thông quan Hỗn Độn Sơ Khai',
    minStage: 24,
    needClear: 'hon_don',
    scenes: [
      { text: `Giữa Hỗn Độn Sơ Khai, nơi trời đất chưa phân, ngươi nghe một giọng nói vang lên từ mọi hướng, tựa tiếng sấm chậm rãi của thời gian.` },
      { speaker: 'Thái Cổ Ma Thần', text: `“Chín lần ngươi ngã xuống, chín lần ta đứng dậy. Lần này ngươi đến tận đây, thật đáng nể.” Ý chí của Ma Thần trườn ra, đen như đêm không đáy. “Hãy nghe ta, {name}. Ta không cầu ngươi tha thứ. Ta chỉ cần ngươi chọn.”` },
      { speaker: 'Bạch Linh', text: `Bạch Linh nép sau lưng ngươi, giọng nhỏ nhưng vững. “Dù ngươi chọn gì, ta ở đây.”` },
      { speaker: 'Mặc Vô Ngân', if: 'rival_saved', text: `Sau lưng, một đạo kiếm ý quen thuộc vang lên. Mặc Vô Ngân đã đến, kiếm trong tay. “Không để ngươi một mình đâu, {name}.”` },
      { speaker: 'Thanh Hư', if: ['held_master', 'bowed_master'], text: `Trong sâu thẳm thần hồn, hơi ấm của Thanh Hư khẽ động. Ông không nói, chỉ dựa lưng vào ngươi như thuở còn là cô nhi dưới mưa.` },
      {
        choice: {
          prompt: `Ba con đường mở ra trước mặt ngươi. Con đường nào, {name}?`,
          options: [
            {
              label: `Phong ấn: gia cố trận nhãn, trấn giữ thế gian`,
              flag: 'ending_guardian',
              ending: 'guardian',
              effects: [{ type: 'expBonus', amount: 0.1 }, { type: 'stat', stat: 'hp', amount: 500 }],
              result: `Ngươi đặt bàn tay lên ấn nhãn. Ánh sáng ngũ sắc dâng lên, bao lấy cả Hỗn Độn. Ma Thần gầm lên lần cuối rồi lịm xuống giấc ngủ nghìn năm. Ngươi biết đây không phải kết thúc, chỉ là một lần gia cố nữa. Nhưng lần này, ngươi không đơn độc.`,
            },
            {
              label: `Hấp thụ: nuốt lấy sức mạnh của Ma Thần`,
              flag: 'ending_demon',
              ending: 'demon',
              align: -2,
              effects: [{ type: 'stat', stat: 'atk', amount: 150 }, { type: 'expBonus', amount: 0.05 }],
              result: `Ma khí tràn vào kinh mạch như triều đen. Ngươi cười, hoặc có ai đó trong ngươi cười. Thế gian run rẩy khi một vị Ma Tôn mới ra đời. Bạch Linh khóc lặng lẽ, nhưng vẫn không rời đi.`,
            },
            {
              label: `Hoá giải: hiểu cho nỗi cô đơn của Ma Thần`,
              flag: 'ending_ascend',
              ending: 'ascend',
              requires: { align: 4, flag: 'memory_accepted' },
              effects: [{ type: 'expBonus', amount: 0.15 }, { type: 'stat', stat: 'hp', amount: 800 }, { type: 'stat', stat: 'def', amount: 80 }],
              result: `Ngươi không ra tay, chỉ đưa bàn tay ra. “Ngươi cũng từng là một đứa trẻ bị bỏ lại, phải không?” Ma Thần im lặng. Rồi bóng tối rạn nứt, tan ra thành vô số đốm sáng bay lên bầu trời. Chín kiếp nạn khép lại trong một cái nắm tay.`,
            },
          ],
        },
      },
      { speaker: 'Bạch Linh', if: 'ending_guardian', text: `“Về nhà thôi, {name}.” Bạch Linh dụi đầu vào tay ngươi. “Lần này, ta sẽ cùng ngươi nhìn thấy mùa xuân.”` },
      { speaker: 'Bạch Linh', if: 'ending_demon', text: `“Ta vẫn ở đây, dù ngươi là gì đi nữa.” Giọng Bạch Linh run run. “Nhưng đừng để bóng tối nuốt ngươi hoàn toàn.”` },
      { speaker: 'Bạch Linh', if: 'ending_ascend', text: `“Ta biết mà.” Bạch Linh mỉm cười trong ánh sáng. “Ngươi vẫn luôn là người ấy, từ chín kiếp trước.”` },
      { text: `Câu chuyện của {name} dừng ở đây, nhưng con đường tu tiên vẫn còn dài. Trời cao còn bầu trời cao hơn, và vòng luân hồi vẫn quay.` },
    ],
    reward: [{ type: 'stones', base: 10000 }, { type: 'item', id: 'hon_don_tinh', count: 3 }],
    unlock: ['realm_hop_the', 'dungeon_hon_don', 'world_ket_cuc'],
  },
]

/** Chương phụ, không nằm trong chuỗi chính. trigger(game) quyết định khi nào hiện. */
export const EXTRAS = [
  {
    id: 'rebirth',
    title: 'Chuyển Thế',
    hint: 'Luân hồi lần đầu',
    trigger: (g) => g.stats.reincarnations >= 1,
    scenes: [
      { text: `Ánh sáng nuốt lấy mọi thứ. Khi mở mắt, ngươi lại nằm trên nền đá lạnh của Thanh Hư Cốc, nhỏ bé như thuở nào, nhưng đôi tay vẫn nhớ từng đường kiếm.` },
      { speaker: 'Bạch Linh', text: `“Lại bắt đầu rồi.” Một giọng quen thuộc vang bên tai. “Nhưng lần này ngươi nhớ nhiều hơn lần trước, đúng không?”` },
      { text: `Ngươi mỉm cười. Tông môn, công pháp, những người đã đồng hành, tất cả vẫn đứng sau lưng ngươi. Mỗi lần luân hồi là một lần phong ấn thêm vững. Vòng quay này, {name} không còn sợ nữa.` },
    ],
    reward: [{ type: 'stones', base: 200 }, { type: 'expBonus', amount: 0.01 }],
    unlock: [],
  },
]

export const chapterById = (id) => CHAPTERS.find((c) => c.id === id) ?? EXTRAS.find((c) => c.id === id) ?? null

/** Lời dẫn khi đột phá lên đại cảnh giới (hiện trong nhật ký). */
export const REALM_FLAVOR = [
  null, // Luyện Khí
  'Trúc Cơ: đan điền kết thành nền móng, linh khí không còn tản mạn mà ngưng đọng như nước trong chum.',
  'Kim Đan: một viên đạo quả tròn đầy xoay chuyển giữa đan điền, thọ nguyên kéo dài, thần thông bắt đầu nảy nở.',
  'Nguyên Anh: đan vỡ sinh anh, thần hồn có hình hài thứ hai, một niệm có thể rời xác đi xa vạn dặm.',
  'Hóa Thần: thần hồn thấu hiểu một mảnh pháp tắc, nhấc tay nhấc chân đã có uy áp trời đất.',
  'Luyện Hư: hư thực giao hoà, thân thể và hư không không còn ranh giới rõ ràng.',
  'Hợp Thể: thân, hồn, đạo hợp làm một. Từ đây, trước mắt chỉ còn con đường chạm tới cõi vô thượng.',
  'Đại Thừa: đạo tâm viên mãn, một lời nói ra đã thành pháp tắc, tiếng vọng của đại đạo thôi thúc người bước tiếp.',
  'Độ Kiếp: bước cuối cùng trước khi phi thăng. Thiên kiếp không còn là thử thách mà là lời mời gọi của thiên đạo.',
]

/** Một câu mô tả khi vào từng bí cảnh (nhật ký). */
export const DUNGEON_FLAVOR = {
  hac_phong: 'Gió đen gào qua khe núi, mùi tanh của sói đói theo gió phả vào mặt.',
  linh_duoc: 'Hương thảo mộc nồng đậm, nhưng mỗi bụi cây đều có thể là một yêu tinh đang rình.',
  huyet_sat: 'Vách đá nhỏ máu, tiếng chú ngữ ma giáo thấp thoáng vọng ra từ sâu trong hang.',
  bang_phong: 'Cực quang cuộn trên đầu, hơi thở hoá thành sương băng ngay trước môi.',
  cuu_u: 'Âm phong lướt qua, hàng ngàn đôi mắt hư vô mở ra giữa bóng tối.',
  ma_uyen: 'Ma khí đặc quánh như mực, dưới đáy vực có thứ gì đó đang thở.',
  hu_khong: 'Không gian vặn xoắn, trên dưới trái phải đổi chỗ chỉ trong một nhịp tim.',
  hon_don: 'Nơi trời đất chưa phân, ngay cả thời gian cũng trôi ngược.',
}
