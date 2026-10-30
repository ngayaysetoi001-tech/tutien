// =====================================================================
// paths.js - Đạo Lộ: hướng tu luyện chọn một lần khi đạt Trúc Cơ (đặt lại khi luân hồi để chọn lại).
// Bốn đạo lộ: Kiếm, Đao, Thể, Phù. Mỗi đạo lộ có đặc quyền riêng và một cây 8 kỹ năng (xem skilltree.js):
// đủ cảnh giới thì kỹ năng tự mở, nâng cấp bằng điểm kỹ năng nhận theo thời gian.
// perk:
//   atk / hp / def  nhân thêm chỉ số chiến đấu (phân số)
//   crit            cộng thêm vào tỉ lệ chí mạng (điểm phần trăm / 100)
//   critMult        cộng thêm vào hệ số chí mạng (mặc định 1.5)
//   skillDmg        +% sát thương võ kỹ tấn công
//   lifesteal       hút máu nền cho mọi đòn đánh
//   cd              giảm hồi chiêu võ kỹ
//   slots           thêm ô võ kỹ chung
//   pill            +% hiệu quả đan tăng chỉ số vĩnh viễn
//   double          +điểm phần trăm tỉ lệ luyện đan ra gấp đôi
//   array           +% hiệu quả Tụ Linh Trận
//   arts            +% hiệu quả mọi công pháp bị động
//   disciple        +% sản lượng đệ tử
// =====================================================================

export const PATH_MIN_REALM = 1 // Trúc Cơ

export const PATHS = {
  kiem: {
    name: 'Kiếm Tu', css: '#f6c85f',
    desc: 'Lấy sát phạt làm đạo, một kiếm phá vạn pháp.',
    perk: { atk: 0.15, crit: 0.1, critMult: 0.25, skillDmg: 0.15 },
    perkText: '+15% công kích, +10% chí mạng, chí mạng mạnh hơn, +15% sát thương võ kỹ tấn công',
  },
  dao: {
    name: 'Đao Tu', css: '#f87171',
    desc: 'Đao pháp cương mãnh, lửa chiến cháy mãi không tắt.',
    perk: { atk: 0.2, crit: 0.05, critMult: 0.15 },
    perkText: '+20% công kích, +5% chí mạng, chí mạng mạnh hơn một chút',
  },
  the: {
    name: 'Thể Tu', css: '#fb923c',
    desc: 'Luyện thân thành thánh, da thịt cứng hơn thần binh.',
    perk: { hp: 0.15, def: 0.15, lifesteal: 0.05 },
    perkText: '+15% khí huyết, +15% phòng ngự, mọi đòn đánh hút 5% sát thương thành khí huyết',
  },
  phu: {
    name: 'Phù Tu', css: '#a78bfa',
    desc: 'Phù chú liên miên, thần thông biến hoá khôn lường.',
    perk: { cd: 0.15, slots: 1, arts: 0.1 },
    perkText: 'Võ kỹ hồi chiêu nhanh hơn 15%, thêm 1 ô võ kỹ chung, +10% hiệu quả công pháp',
  },
}

export const PATH_IDS = Object.keys(PATHS)
export const pathById = (id) => PATHS[id] ?? null

/** Đạo lộ cũ (5 đạo lộ trước khi có cây kỹ năng) -> đạo lộ mới tương ứng, dùng khi tải save cũ. */
export const LEGACY_PATH = { phap: 'phu', dan: 'phu', tran: 'phu' }

const ZERO_PERK = { atk: 0, hp: 0, def: 0, crit: 0, critMult: 0, skillDmg: 0, lifesteal: 0, cd: 0, slots: 0, pill: 0, double: 0, array: 0, arts: 0, disciple: 0 }

/** Đặc quyền đầy đủ (mọi khoá, mặc định 0) của đạo lộ `id` (null = chưa chọn). */
export const pathPerk = (id) => ({ ...ZERO_PERK, ...(PATHS[id]?.perk ?? {}) })
