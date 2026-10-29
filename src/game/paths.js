// =====================================================================
// paths.js - Đạo Lộ: hướng tu luyện chọn một lần khi đạt Trúc Cơ (đặt lại khi luân hồi để chọn lại).
// Mỗi đạo lộ có đặc quyền riêng và một võ kỹ độc quyền (chỉ trang bị được khi theo đạo lộ đó;
// tàn quyển của võ kỹ này chỉ rơi cho người theo đúng đạo lộ).
// perk:
//   atk / hp / def  nhân thêm chỉ số chiến đấu (phân số)
//   crit            cộng thêm vào tỉ lệ chí mạng (điểm phần trăm / 100)
//   critMult        cộng thêm vào hệ số chí mạng (mặc định 1.5)
//   skillDmg        +% sát thương võ kỹ tấn công
//   lifesteal       hút máu nền cho mọi đòn đánh
//   cd              giảm hồi chiêu võ kỹ
//   slots           thêm ô võ kỹ
//   pill            +% hiệu quả đan tăng chỉ số vĩnh viễn
//   double          +điểm phần trăm tỉ lệ luyện đan ra gấp đôi
//   array           +% hiệu quả Tụ Linh Trận
//   arts            +% hiệu quả mọi công pháp bị động
//   disciple        +% sản lượng đệ tử
// =====================================================================

export const PATH_MIN_REALM = 1 // Trúc Cơ

export const PATHS = {
  kiem: {
    name: 'Kiếm Tu', skill: 'van_kiem', css: '#f6c85f',
    desc: 'Lấy sát phạt làm đạo, một kiếm phá vạn pháp.',
    perk: { atk: 0.15, crit: 0.1, critMult: 0.25, skillDmg: 0.15 },
    perkText: '+15% công kích, +10% chí mạng, chí mạng mạnh hơn, +15% sát thương võ kỹ tấn công',
  },
  the: {
    name: 'Thể Tu', skill: 'kim_than', css: '#fb923c',
    desc: 'Luyện thân thành thánh, da thịt cứng hơn thần binh.',
    perk: { hp: 0.15, def: 0.15, lifesteal: 0.05 },
    perkText: '+15% khí huyết, +15% phòng ngự, mọi đòn đánh hút 5% sát thương thành khí huyết',
  },
  phap: {
    name: 'Pháp Tu', skill: 'ngu_loi', css: '#a78bfa',
    desc: 'Tinh thông thần thông, pháp quyết liên miên bất tuyệt.',
    perk: { cd: 0.15, slots: 1 },
    perkText: 'Võ kỹ hồi chiêu nhanh hơn 15%, thêm 1 ô võ kỹ',
  },
  dan: {
    name: 'Đan Sư', skill: 'dan_hoa', css: '#4fdca6',
    desc: 'Lấy đan nhập đạo, dược lực thấm vào cốt tủy.',
    perk: { pill: 0.25, double: 0.1 },
    perkText: '+25% hiệu quả đan tăng chỉ số, +10% tỉ lệ luyện đan ra gấp đôi',
  },
  tran: {
    name: 'Trận Pháp Sư', skill: 'tran_dia', css: '#60a5fa',
    desc: 'Bố trận dẫn linh khí, mượn thế trời đất làm sức mạnh.',
    perk: { array: 0.25, arts: 0.15, disciple: 0.2 },
    perkText: '+25% hiệu quả Tụ Linh Trận, +15% hiệu quả công pháp, +20% sản lượng đệ tử',
  },
}

export const PATH_IDS = Object.keys(PATHS)
export const pathById = (id) => PATHS[id] ?? null

const ZERO_PERK = { atk: 0, hp: 0, def: 0, crit: 0, critMult: 0, skillDmg: 0, lifesteal: 0, cd: 0, slots: 0, pill: 0, double: 0, array: 0, arts: 0, disciple: 0 }

/** Đặc quyền đầy đủ (mọi khoá, mặc định 0) của đạo lộ `id` (null = chưa chọn). */
export const pathPerk = (id) => ({ ...ZERO_PERK, ...(PATHS[id]?.perk ?? {}) })
