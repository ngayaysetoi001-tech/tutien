// =====================================================================
// randomEvents.js - Kỳ ngộ ngẫu nhiên khi tu luyện: hiện hộp thoại, người chơi chọn.
// Mỗi lựa chọn có:
//   outcomes: [{ p, text, effects }]      - kết quả theo xác suất (p cộng lại = 1)
//   hoặc fight: { monster, floor } + win / lose: { text, effects }  - giao chiến mô phỏng
// safe: chỉ số phương án ít rủi ro nhất, dùng khi người chơi không trả lời kịp
// Chuỗi kỳ ngộ: một kết quả có thể có next: 'id' để nối sang kỳ ngộ kế tiếp (chainOnly: chỉ xuất hiện qua chuỗi,
// không bốc ngẫu nhiên). Phương án an toàn không được nối tiếp nên bỏ ngỏ thì chuỗi dừng.
// effects: exp{seconds} | expLoss{ratio} | stones{base} (nhân 1.45^bậc) | item{id,count}
//          stat{stat,amount} | expBonus{amount}
// =====================================================================

export const EVENT_INTERVAL = [150, 300] // giây giữa hai kỳ ngộ (tối thiểu, tối đa)
export const EVENT_AUTO_SECONDS = 90 // không trả lời sau 90 giây thì tự chọn phương án an toàn (`safe`)
export const EVENT_RESULT_SECONDS = 15 // hộp kết quả tự đóng sau 15 giây

const nothing = { p: 1, text: 'Không có gì xảy ra.', effects: [] }

export const RANDOM_EVENTS = [
  {
    id: 'hang_dong', title: 'Hang Động Bí Ẩn', minStage: 0, weight: 3, safe: 1,
    text: 'Trên đường tu hành, ngươi phát hiện một hang động toả linh khí mờ nhạt.',
    choices: [
      {
        label: 'Tiến vào thám hiểm',
        outcomes: [
          { p: 0.55, text: 'Ngươi tìm thấy một mạch linh tuyền, hấp thụ được rất nhiều linh khí.', effects: [{ type: 'exp', seconds: 900 }] },
          { p: 0.25, text: 'Có bảo vật nằm sâu trong động!', effects: [{ type: 'item', id: 'huyet_sam', count: 2 }, { type: 'item', id: 'thiet_tinh', count: 3 }] },
          { p: 0.2, text: 'Yêu thú đột kích, ngươi hoảng loạn bỏ chạy và đánh rơi linh thạch.', effects: [{ type: 'stones', base: -15 }] },
        ],
      },
      { label: 'Bỏ qua', outcomes: [{ ...nothing, text: 'Ngươi tiếp tục bế quan, không để tâm.' }] },
    ],
  },
  {
    id: 'tu_si', title: 'Tu Sĩ Lang Thang', minStage: 0, weight: 3, safe: 0,
    text: 'Một tu sĩ áo rách chặn đường, tay cầm túi trữ vật nặng trĩu.',
    choices: [
      {
        label: 'Kết giao đạo hữu',
        outcomes: [
          { p: 0.7, text: 'Đối phương vui vẻ tặng ngươi ít thảo dược và chỉ điểm vài điều.', effects: [{ type: 'item', id: 'linh_thao', count: 3 }, { type: 'exp', seconds: 300 }] },
          { p: 0.3, text: 'Hắn chỉ cười nhạt rồi bỏ đi.', effects: [] },
        ],
      },
      {
        label: 'Giao dịch (30 linh thạch)',
        outcomes: [{ p: 1, text: 'Ngươi mua được một mớ khoáng thạch.', effects: [{ type: 'stones', base: -30 }, { type: 'item', id: 'thiet_tinh', count: 6 }] }],
      },
      {
        label: 'Cướp đoạt!',
        fight: { monster: 'soi_yeu', floor: 4 },
        win: { text: 'Ngươi đánh bại hắn và thu được chiến lợi phẩm.', effects: [{ type: 'stones', base: 40 }, { type: 'item', id: 'huyet_sam', count: 1 }] },
        lose: { text: 'Hắn mạnh hơn dự đoán, ngươi bị đánh bại và mất linh thạch.', effects: [{ type: 'stones', base: -25 }, { type: 'expLoss', ratio: 0.05 }] },
      },
    ],
  },
  {
    id: 'tau_hoa', title: 'Tẩu Hỏa Nhập Ma', minStage: 1, weight: 2, safe: 1,
    text: 'Linh khí trong đan điền đột nhiên hỗn loạn, tâm ma trỗi dậy!',
    choices: [
      {
        label: 'Cưỡng ép vận công',
        outcomes: [
          { p: 0.5, text: 'Ngươi vượt qua tâm ma, linh khí tinh luyện hơn hẳn.', effects: [{ type: 'exp', seconds: 1200 }] },
          { p: 0.5, text: 'Công pháp phản phệ, linh khí tán loạn.', effects: [{ type: 'expLoss', ratio: 0.2 }] },
        ],
      },
      { label: 'Tĩnh tâm điều tức', outcomes: [{ p: 1, text: 'Ngươi bình ổn khí tức, chỉ hao tổn đôi chút.', effects: [{ type: 'expLoss', ratio: 0.03 }] }] },
    ],
  },
  {
    id: 'linh_duoc', title: 'Linh Dược Mọc Hoang', minStage: 0, weight: 3, safe: 0,
    text: 'Bên vách đá, một cụm linh dược đang toả hương thơm.',
    choices: [
      {
        label: 'Hái thuốc',
        outcomes: [
          { p: 0.8, text: 'Ngươi hái được nhiều dược liệu quý.', effects: [{ type: 'item', id: 'linh_thao', count: 4 }, { type: 'item', id: 'huyet_sam', count: 1 }] },
          { p: 0.2, text: 'Rắn độc giấu trong bụi cỏ cắn ngươi một nhát.', effects: [{ type: 'stones', base: -10 }] },
        ],
      },
    ],
  },
  {
    id: 'linh_trieu', title: 'Linh Khí Triều', minStage: 0, weight: 2, safe: 0,
    text: 'Thiên địa dị tượng: linh khí cuồn cuộn đổ về như thuỷ triều.',
    choices: [
      {
        label: 'Hấp thụ linh khí',
        outcomes: [
          { p: 0.85, text: 'Ngươi thuận thế tu luyện, linh khí tăng vọt.', effects: [{ type: 'exp', seconds: 1800 }] },
          { p: 0.15, text: 'Linh khí quá nồng đậm khiến kinh mạch đau nhói.', effects: [{ type: 'exp', seconds: 300 }] },
        ],
      },
    ],
  },
  {
    id: 'di_tich', title: 'Di Tích Cổ Tu Sĩ', minStage: 4, weight: 2, safe: 0,
    text: 'Dưới lớp bùn đất lộ ra tàn tích của một vị tiền bối từng tu hành tại đây.',
    choices: [
      {
        label: 'Cẩn thận tìm kiếm',
        outcomes: [
          { p: 0.5, text: 'Ngươi nhặt được một mảnh tàn quyển còn nguyên vẹn.', effects: [{ type: 'item', id: 'kiem_quyet', count: 1 }] },
          { p: 0.3, text: 'Ngươi ngộ ra điều gì đó từ bia đá, thân thể cường tráng hơn.', effects: [{ type: 'stat', stat: 'hp', amount: 15 }] },
          { p: 0.2, text: 'Chỉ toàn đá vụn.', effects: [] },
        ],
      },
      {
        label: 'Phá cấm chế lấy bảo vật',
        fight: { monster: 'hac_thi', floor: 4 },
        win: { text: 'Ngươi hạ gục hộ vệ cổ mộ, lấy được khoáng thạch quý.', effects: [{ type: 'item', id: 'huyen_thiet', count: 2 }, { type: 'stones', base: 60 }] },
        lose: { text: 'Cấm chế phản kích khiến ngươi trọng thương.', effects: [{ type: 'expLoss', ratio: 0.1 }] },
      },
    ],
  },
  {
    id: 'yeu_thu', title: 'Yêu Thú Tập Kích', minStage: 0, weight: 3, safe: 1,
    text: 'Một con yêu thú lao ra từ bụi rậm, nhắm thẳng vào ngươi!',
    choices: [
      {
        label: 'Nghênh chiến',
        fight: { monster: 'hau_yeu', floor: 3 },
        win: { text: 'Ngươi hạ yêu thú, thu lấy vật liệu.', effects: [{ type: 'stones', base: 30 }, { type: 'item', id: 'linh_thao', count: 2 }, { type: 'exp', seconds: 600 }] },
        lose: { text: 'Ngươi bị thương nặng và bỏ chạy, mất ít linh thạch.', effects: [{ type: 'stones', base: -20 }] },
      },
      { label: 'Lẩn tránh', outcomes: [{ p: 1, text: 'Ngươi kịp thời lẩn đi, nhưng tâm thần hơi bất ổn.', effects: [{ type: 'expLoss', ratio: 0.02 }] }] },
    ],
  },
  {
    id: 'dao_tam', title: 'Đạo Tâm Khảo Nghiệm', minStage: 4, weight: 1, safe: 1,
    text: 'Trong lúc bế quan, một ảo cảnh hiện ra thử thách đạo tâm của ngươi.',
    choices: [
      {
        label: 'Kiên định đạo tâm',
        outcomes: [
          { p: 0.6, text: 'Đạo tâm vững chãi, ngươi lĩnh ngộ thêm một tầng.', effects: [{ type: 'expBonus', amount: 0.01 }] },
          { p: 0.4, text: 'Ảo cảnh quá mạnh, ngươi thất thủ.', effects: [{ type: 'expLoss', ratio: 0.1 }] },
        ],
      },
      { label: 'Buông bỏ chấp niệm', outcomes: [{ ...nothing, text: 'Ảo cảnh tan biến, lòng ngươi thanh tịnh.' }] },
    ],
  },
  {
    id: 'thuong_nhan', title: 'Thương Nhân Bí Ẩn', minStage: 3, weight: 2, safe: 0,
    text: 'Một thương nhân che mặt dựng quầy bên đường, bày ra vài món đồ toả linh quang.',
    choices: [
      {
        label: 'Mua thảo dược (60 linh thạch)',
        outcomes: [
          { p: 0.75, text: 'Hàng thật giá thật, ngươi mua được nhiều thảo dược quý.', effects: [{ type: 'stones', base: -60 }, { type: 'item', id: 'tu_van_thao', count: 3 }, { type: 'item', id: 'huyet_sam', count: 3 }] },
          { p: 0.25, text: 'Hắn lừa ngươi bằng cỏ dại nhuộm màu.', effects: [{ type: 'stones', base: -60 }, { type: 'item', id: 'linh_thao', count: 2 }] },
        ],
      },
      { label: 'Xem hàng rồi đi', outcomes: [{ ...nothing, text: 'Ngươi ngắm nghía một lúc rồi rời đi.' }] },
    ],
  },
  {
    id: 'thac_nuoc', title: 'Thác Nước Linh Tuyền', minStage: 2, weight: 2, safe: 1,
    text: 'Sau trận mưa, một thác nước đổ xuống từ vách núi, hơi nước phảng phất linh khí.',
    choices: [
      {
        label: 'Ngồi thiền dưới thác',
        outcomes: [
          { p: 0.6, text: 'Dòng nước gột rửa tạp niệm, linh khí vận chuyển thông suốt.', effects: [{ type: 'exp', seconds: 1500 }] },
          { p: 0.25, text: 'Nước lạnh thấu xương, ngươi vẫn cắn răng chịu đựng, thân thể rắn rỏi hơn.', effects: [{ type: 'stat', stat: 'hp', amount: 20 }] },
          { p: 0.15, text: 'Ngươi nhiễm lạnh, phải vận công xua hàn.', effects: [{ type: 'expLoss', ratio: 0.04 }] },
        ],
      },
      { label: 'Uống nước rồi đi tiếp', outcomes: [{ p: 1, text: 'Ngươi uống vài ngụm, thấy tinh thần sảng khoái.', effects: [{ type: 'exp', seconds: 200 }] }] },
    ],
  },
  {
    id: 'co_kiem', title: 'Cổ Kiếm Cắm Đá', minStage: 6, weight: 1, safe: 1,
    text: 'Một thanh cổ kiếm gỉ sét cắm giữa tảng đá, kiếm khí vẫn còn lạnh buốt.',
    choices: [
      {
        label: 'Rút kiếm',
        outcomes: [
          { p: 0.35, text: 'Kiếm ý tràn vào thức hải, ngươi ngộ ra một đường kiếm.', effects: [{ type: 'stat', stat: 'atk', amount: 10 }, { type: 'item', id: 'kiem_quyet', count: 1 }] },
          { p: 0.4, text: 'Thanh kiếm vỡ vụn, chỉ để lại một ít tinh thiết.', effects: [{ type: 'item', id: 'huyen_thiet', count: 2 }] },
          { p: 0.25, text: 'Kiếm khí phản phệ, ngươi bị chấn thương.', effects: [{ type: 'expLoss', ratio: 0.1 }] },
        ],
      },
      { label: 'Cúi bái rồi rời đi', outcomes: [{ p: 1, text: 'Ngươi cúi chào vị tiền nhân vô danh, lòng cảm thấy thanh thản.', effects: [{ type: 'exp', seconds: 300 }] }] },
    ],
  },
  {
    id: 'ta_tu', title: 'Tà Tu Chặn Đường', minStage: 5, weight: 2, safe: 1,
    text: 'Một tà tu cười gằn chặn lối: "Giao túi trữ vật ra, ta tha cho ngươi toàn thây!"',
    choices: [
      {
        label: 'Nghênh chiến',
        fight: { monster: 'huyet_lang', floor: 5 },
        win: { text: 'Ngươi đánh bại tà tu, lục soát được không ít của cải.', effects: [{ type: 'stones', base: 80 }, { type: 'item', id: 'tu_van_thao', count: 2 }, { type: 'exp', seconds: 500 }] },
        lose: { text: 'Tà tu quá mạnh, ngươi phải bỏ lại linh thạch để thoát thân.', effects: [{ type: 'stones', base: -40 }, { type: 'expLoss', ratio: 0.05 }] },
      },
      { label: 'Nộp tiền mua mạng (35 linh thạch)', outcomes: [{ p: 1, text: 'Ngươi nộp tiền và nhanh chóng rút lui.', effects: [{ type: 'stones', base: -35 }] }] },
    ],
  },
  {
    id: 'bi_canh_nho', title: 'Bí Cảnh Nhỏ Mở Ra', minStage: 9, weight: 2, safe: 1,
    text: 'Không gian nứt ra một khe hẹp, lộ ra một tiểu bí cảnh chỉ tồn tại trong chốc lát.',
    choices: [
      {
        label: 'Xông vào đoạt bảo',
        outcomes: [
          { p: 0.45, text: 'Ngươi thu được linh dược trăm năm.', effects: [{ type: 'item', id: 'bang_lien', count: 2 }, { type: 'item', id: 'tu_van_thao', count: 3 }] },
          { p: 0.25, text: 'Ngươi tìm được một đám tinh kim hiếm có.', effects: [{ type: 'item', id: 'tinh_kim', count: 1 }, { type: 'stones', base: 120 }] },
          { p: 0.3, text: 'Khe nứt khép lại quá nhanh, ngươi suýt bị nghiền nát.', effects: [{ type: 'expLoss', ratio: 0.12 }] },
        ],
      },
      { label: 'Quan sát từ xa', outcomes: [{ p: 1, text: 'Ngươi nhặt được ít linh khí rò rỉ ra ngoài.', effects: [{ type: 'exp', seconds: 600 }] }] },
    ],
  },
  {
    id: 'lao_dao', title: 'Lão Đạo Chỉ Điểm', minStage: 9, weight: 1, safe: 1,
    text: 'Một lão đạo râu tóc bạc phơ ngồi câu cá bên suối, mỉm cười nhìn ngươi như đã quen từ lâu.',
    choices: [
      {
        label: 'Thỉnh giáo đạo lý',
        outcomes: [
          { p: 0.5, text: 'Lão đạo chỉ vài câu, ngươi ngộ ra điều cốt lõi của tu hành.', effects: [{ type: 'expBonus', amount: 0.01 }, { type: 'exp', seconds: 600 }] },
          { p: 0.3, text: 'Lão đạo tặng ngươi hai quyển bí kíp cũ.', effects: [{ type: 'item', id: 'ho_the_quyet', count: 1 }, { type: 'item', id: 'than_hanh_quyet', count: 1 }] },
          { p: 0.2, text: 'Lão đạo chỉ cười: "Duyên chưa đến."', effects: [] },
        ],
      },
      { label: 'Ngồi câu cá cùng lão', outcomes: [{ p: 1, text: 'Ngươi ngồi đến hoàng hôn, lòng thư thái lạ thường.', effects: [{ type: 'exp', seconds: 400 }] }] },
    ],
  },
  {
    id: 'hoa_son', title: 'Hỏa Sơn Phun Trào', minStage: 12, weight: 1, safe: 1,
    text: 'Địa hỏa dưới lòng đất bùng lên, dung nham cuộn trào xung quanh, linh khí hỏa hệ nồng đậm lạ thường.',
    choices: [
      {
        label: 'Lợi dụng địa hỏa luyện thể',
        outcomes: [
          { p: 0.5, text: 'Ngươi tôi luyện thân thể trong lửa, nhục thân cứng cáp hơn.', effects: [{ type: 'stat', stat: 'def', amount: 8 }, { type: 'stat', stat: 'hp', amount: 40 }] },
          { p: 0.2, text: 'Ngươi nhặt được tinh kim còn nóng hổi trong dung nham.', effects: [{ type: 'item', id: 'tinh_kim', count: 2 }] },
          { p: 0.3, text: 'Nhiệt độ quá cao khiến ngươi bị bỏng nặng.', effects: [{ type: 'expLoss', ratio: 0.12 }] },
        ],
      },
      { label: 'Lùi ra xa', outcomes: [{ p: 1, text: 'Ngươi an toàn rời đi.', effects: [] }] },
    ],
  },
  {
    id: 'am_ma', title: 'Ma Âm Quấy Nhiễu', minStage: 12, weight: 1, safe: 1,
    text: 'Tiếng sáo ma quái vang lên từ nơi hoang vắng, khiến tâm thần ngươi rung động.',
    choices: [
      {
        label: 'Lần theo tiếng sáo',
        fight: { monster: 'u_hon', floor: 5 },
        win: { text: 'Ngươi phá tan oán hồn, thu được ít linh vật nó giấu.', effects: [{ type: 'item', id: 'thien_nien_chi', count: 1 }, { type: 'stones', base: 120 }] },
        lose: { text: 'Ma âm xuyên thấu thức hải, ngươi phải bỏ chạy.', effects: [{ type: 'expLoss', ratio: 0.12 }] },
      },
      { label: 'Bịt tai tĩnh tâm', outcomes: [{ p: 1, text: 'Ngươi giữ vững tâm thần, tiếng sáo từ từ lắng xuống.', effects: [{ type: 'exp', seconds: 200 }] }] },
    ],
  },
  {
    id: 'thien_loi', title: 'Thiên Lôi Giáng Xuống', minStage: 15, weight: 1, safe: 1,
    text: 'Mây đen đột ngột kéo đến, sấm chớp rền vang. Một đạo thiên lôi nhỏ nhắm vào ngươi.',
    choices: [
      {
        label: 'Lấy thân đón lôi',
        outcomes: [
          { p: 0.55, text: 'Ngươi đón trọn lôi điện, kinh mạch được tẩy luyện.', effects: [{ type: 'stat', stat: 'hp', amount: 80 }, { type: 'exp', seconds: 900 }] },
          { p: 0.45, text: 'Lôi điện quá mạnh, ngươi bị thương nặng.', effects: [{ type: 'expLoss', ratio: 0.15 }] },
        ],
      },
      { label: 'Tìm chỗ tránh', outcomes: [{ p: 1, text: 'Ngươi tránh được, nhưng bỏ lỡ cơ duyên.', effects: [] }] },
    ],
  },
  {
    id: 'kho_bau', title: 'Kho Báu Thượng Cổ', minStage: 18, weight: 1, safe: 1,
    text: 'Một cổng đá thượng cổ hiện ra giữa hư không, bên trong ánh lên bảo quang.',
    choices: [
      {
        label: 'Phá cấm chế vào trong',
        fight: { monster: 'xuong_giap', floor: 5 },
        win: { text: 'Ngươi hạ gục hộ vệ và mang về nhiều bảo vật hiếm.', effects: [{ type: 'item', id: 'hoa_than_qua', count: 2 }, { type: 'item', id: 'hu_khong_thach', count: 2 }, { type: 'stones', base: 200 }] },
        lose: { text: 'Cấm chế quá mạnh, ngươi trọng thương và mất ít linh thạch.', effects: [{ type: 'stones', base: -50 }, { type: 'expLoss', ratio: 0.1 }] },
      },
      { label: 'Ghi nhớ vị trí, quay lại sau', outcomes: [{ p: 1, text: 'Ngươi nhặt vài mảnh vụn bên ngoài cổng.', effects: [{ type: 'item', id: 'hu_khong_thach', count: 1 }] }] },
    ],
  },
  // ---- Chuỗi 1: Cổ Mộ (3 bước) ----
  {
    id: 'co_mo_1', title: 'Cổ Mộ Dưới Gốc Cây', minStage: 4, weight: 2, safe: 1,
    text: 'Rễ một cây cổ thụ trồi lên làm lộ ra phiến đá khắc chữ cổ: dấu tích một ngôi mộ tu sĩ.',
    choices: [
      {
        label: 'Đào mộ',
        outcomes: [
          { p: 0.65, text: 'Nắp quan tài lộ ra, hàn khí toả ra từ khe hở.', effects: [], next: 'co_mo_2' },
          { p: 0.35, text: 'Âm khí xộc lên làm ngươi choáng váng.', effects: [{ type: 'expLoss', ratio: 0.04 }] },
        ],
      },
      { label: 'Bỏ đi', outcomes: [{ ...nothing, text: 'Ngươi để yên giấc ngủ của người đã khuất.' }] },
    ],
  },
  {
    id: 'co_mo_2', title: 'Quan Tài Cổ', minStage: 0, weight: 0, chainOnly: true, safe: 1,
    text: 'Bên trong là một bộ hài cốt mặc đạo bào, tay nắm chặt một ngọc giản.',
    choices: [
      {
        label: 'Lấy ngọc giản',
        fight: { monster: 'hac_thi', floor: 5 },
        win: { text: 'Hài cốt đứng dậy rồi bị ngươi đánh tan. Ngọc giản chỉ tới một mật thất.', effects: [{ type: 'exp', seconds: 600 }], next: 'co_mo_3' },
        lose: { text: 'Hài cốt đánh ngươi trọng thương, ngươi phải rút lui.', effects: [{ type: 'expLoss', ratio: 0.08 }] },
      },
      { label: 'Cúi bái rồi đóng nắp', outcomes: [{ p: 1, text: 'Ngươi cúi bái, một luồng linh khí ấm áp rót vào người.', effects: [{ type: 'exp', seconds: 900 }] }] },
    ],
  },
  {
    id: 'co_mo_3', title: 'Mật Thất Tiền Bối', minStage: 0, weight: 0, chainOnly: true, safe: 0,
    text: 'Trong mật thất, tàn hồn vị tiền bối mỉm cười: "Kẻ hậu bối có duyên, ta truyền lại chút tâm đắc."',
    choices: [
      {
        label: 'Nhận truyền thừa',
        outcomes: [
          { p: 1, text: 'Tàn hồn truyền lại một đoạn tâm pháp rồi tan biến.', effects: [{ type: 'stat', stat: 'atk', amount: 12 }, { type: 'stat', stat: 'hp', amount: 40 }, { type: 'item', id: 'cp_thanh_tam', count: 2 }] },
        ],
      },
    ],
  },
  // ---- Chuỗi 2: Hồ Ly (3 bước) ----
  {
    id: 'ho_ly_1', title: 'Hồ Ly Nhỏ Bị Thương', minStage: 2, weight: 2, safe: 1,
    text: 'Một con hồ ly lông trắng nằm bên đường, chân bị bẫy thú kẹp chặt, mắt long lanh nhìn ngươi.',
    choices: [
      {
        label: 'Cứu giúp',
        outcomes: [
          { p: 0.9, text: 'Ngươi gỡ bẫy và băng bó cho nó. Nó liếm tay ngươi rồi chạy vào rừng.', effects: [], next: 'ho_ly_2' },
          { p: 0.1, text: 'Nó cắn ngươi một cái rồi bỏ chạy.', effects: [{ type: 'stones', base: -10 }] },
        ],
      },
      { label: 'Đi qua', outcomes: [{ ...nothing, text: 'Ngươi bước đi, không ngoái nhìn lại.' }] },
    ],
  },
  {
    id: 'ho_ly_2', title: 'Hồ Ly Quay Lại', minStage: 0, weight: 0, chainOnly: true, safe: 1,
    text: 'Vài ngày sau, con hồ ly xuất hiện trước cửa, ngậm vạt áo ngươi như muốn dẫn đường.',
    choices: [
      {
        label: 'Theo nó vào thung lũng',
        outcomes: [
          { p: 0.7, text: 'Thung lũng giấu kín có suối linh khí và nhiều linh thảo.', effects: [{ type: 'exp', seconds: 900 }, { type: 'item', id: 'linh_thao', count: 5 }], next: 'ho_ly_3' },
          { p: 0.3, text: 'Yêu thú canh giữ thung lũng buộc ngươi phải rút lui.', effects: [{ type: 'expLoss', ratio: 0.05 }] },
        ],
      },
      { label: 'Từ chối', outcomes: [{ ...nothing, text: 'Con hồ ly buồn bã bỏ đi.' }] },
    ],
  },
  {
    id: 'ho_ly_3', title: 'Hồ Tiên Tặng Quà', minStage: 0, weight: 0, chainOnly: true, safe: 0,
    text: 'Một nữ tử áo trắng hiện ra bên suối: "Đa tạ ngươi đã cứu tiểu muội ta."',
    choices: [
      {
        label: 'Nhận quà',
        outcomes: [
          { p: 1, text: 'Nàng tặng ngươi hai viên tiên đan và một đoạn công pháp.', effects: [{ type: 'item', id: 'duong_the_dan', count: 2 }, { type: 'item', id: 'cp_cuong_the', count: 2 }, { type: 'expBonus', amount: 0.01 }] },
        ],
      },
    ],
  },
]

export const eventById = (id) => RANDOM_EVENTS.find((e) => e.id === id)
