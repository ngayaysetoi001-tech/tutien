// =====================================================================
// randomEvents.js - Kỳ ngộ ngẫu nhiên khi tu luyện: hiện hộp thoại, người chơi chọn.
// Mỗi lựa chọn có:
//   outcomes: [{ p, text, effects }]      - kết quả theo xác suất (p cộng lại = 1)
//   hoặc fight: { monster, floor } + win / lose: { text, effects }  - giao chiến mô phỏng
// safe: chỉ số phương án ít rủi ro nhất, dùng khi người chơi không trả lời kịp
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
]

export const eventById = (id) => RANDOM_EVENTS.find((e) => e.id === id)
