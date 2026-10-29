// =====================================================================
// data.js - Dữ liệu nội dung Giai đoạn 1: vật phẩm, yêu thú, bí cảnh, công thức đan.
// Thuần dữ liệu; logic ở battle.js / formulas.js / gameStore.js
// =====================================================================

import { LEARN_COST, SKILLS, fragmentId } from './skills.js'
import { ARTS, ART_LEARN_COST, artFragmentId } from './arts.js'

/**
 * Hiệu ứng khi dùng vật phẩm:
 *  exp      - cộng linh khí bằng `seconds` giây sản lượng hiện tại
 *  stat     - tăng vĩnh viễn một chỉ số (hp|atk|def|speed), giảm dần khi dùng nhiều
 *  expBonus - tăng vĩnh viễn % tốc độ linh khí (0.02 = +2%)
 *  buff     - hiệu ứng một lần: success (+tỉ lệ đột phá) | guard (giảm sát thương lôi)
 *  heal     - hồi khí huyết trong Bí Cảnh (dùng ở tab Bí Cảnh)
 */
export const ITEMS = {
  // ---- Thảo dược ----
  linh_thao: { name: 'Linh Thảo', group: 'herbs', sell: 2, desc: 'Thảo dược phổ biến, nền tảng của mọi loại đan.' },
  huyet_sam: { name: 'Huyết Sâm', group: 'herbs', sell: 6, desc: 'Sâm đỏ như máu, bổ khí huyết.' },
  tu_van_thao: { name: 'Tử Vân Thảo', group: 'herbs', sell: 20, desc: 'Mọc nơi âm khí nặng, dùng cho đan cao cấp.' },
  bang_lien: { name: 'Băng Liên', group: 'herbs', sell: 55, desc: 'Sen băng ngàn năm.' },
  thien_nien_chi: { name: 'Thiên Niên Chi', group: 'herbs', sell: 160, desc: 'Linh chi ngàn năm, cực hiếm.' },

  hoa_than_qua: { name: 'Hóa Thần Quả', group: 'herbs', sell: 500, desc: 'Linh quả kết tinh thần khí, mọc nơi ma khí cuồn cuộn.' },

  // ---- Khoáng thạch ----
  thiet_tinh: { name: 'Thiết Tinh', group: 'ores', sell: 3, desc: 'Quặng sắt chứa chút linh khí.' },
  huyen_thiet: { name: 'Huyền Thiết', group: 'ores', sell: 24, desc: 'Thiết đen nặng trĩu, cứng rắn.' },
  tinh_kim: { name: 'Tinh Kim', group: 'ores', sell: 120, desc: 'Kim loại sao rơi, cực quý.' },
  hu_khong_thach: { name: 'Hư Không Thạch', group: 'ores', sell: 400, desc: 'Đá từ khe nứt hư không, nhẹ như không khí.' },
  hon_don_tinh: { name: 'Hỗn Độn Tinh', group: 'ores', sell: 1500, desc: 'Tinh thể của buổi sơ khai, hiếm có khó tìm.' },

  // ---- Tàn quyển bí kíp: gom đủ `useCost` bản để Lĩnh Ngộ ----
  kiem_quyet: {
    name: 'Kiếm Quyết Tàn Quyển', group: 'scrolls', sell: 12, useCost: 3,
    effect: { type: 'stat', stat: 'atk', amount: 6 }, desc: 'Lĩnh ngộ: +6 Công kích vĩnh viễn.',
  },
  ho_the_quyet: {
    name: 'Hộ Thể Tàn Quyển', group: 'scrolls', sell: 12, useCost: 3,
    effect: { type: 'stat', stat: 'def', amount: 5 }, desc: 'Lĩnh ngộ: +5 Phòng ngự vĩnh viễn.',
  },
  than_hanh_quyet: {
    name: 'Thân Pháp Tàn Quyển', group: 'scrolls', sell: 15, useCost: 3,
    effect: { type: 'stat', stat: 'speed', amount: 2 }, desc: 'Lĩnh ngộ: +2 Thân pháp vĩnh viễn.',
  },
  duong_khi_quyet: {
    name: 'Dưỡng Khí Tàn Quyển', group: 'scrolls', sell: 20, useCost: 3,
    effect: { type: 'expBonus', amount: 0.03 }, desc: 'Lĩnh ngộ: +3% tốc độ linh khí vĩnh viễn.',
  },

  // ---- Đan dược ----
  tu_khi_dan: { name: 'Tụ Khí Đan', group: 'pills', sell: 8, effect: { type: 'exp', seconds: 600 }, desc: 'Nhận linh khí bằng 10 phút tu luyện (tối đa 10% yêu cầu đột phá; dùng liên tiếp trong một bậc thì giảm hiệu quả).' },
  hoi_huyet_dan: { name: 'Hồi Huyết Đan', group: 'pills', sell: 10, effect: { type: 'heal', ratio: 0.5 }, desc: 'Hồi 50% khí huyết trong Bí Cảnh.' },
  duong_the_dan: { name: 'Dưỡng Thể Đan', group: 'pills', sell: 25, effect: { type: 'stat', stat: 'hp', amount: 25 }, desc: '+25 Khí huyết vĩnh viễn.' },
  kim_cang_dan: { name: 'Kim Cang Đan', group: 'pills', sell: 25, effect: { type: 'stat', stat: 'def', amount: 3 }, desc: '+3 Phòng ngự vĩnh viễn.' },
  cuong_can_dan: { name: 'Cường Cân Đan', group: 'pills', sell: 40, effect: { type: 'stat', stat: 'atk', amount: 4 }, desc: '+4 Công kích vĩnh viễn.' },
  than_phap_dan: { name: 'Thân Pháp Đan', group: 'pills', sell: 150, effect: { type: 'stat', stat: 'speed', amount: 1 }, desc: '+1 Thân pháp vĩnh viễn.' },
  pha_canh_dan: { name: 'Phá Cảnh Đan', group: 'pills', sell: 500, effect: { type: 'buff', buff: 'success', amount: 0.1 }, desc: '+10% tỉ lệ cho lần đột phá kế tiếp.' },
  ho_kiep_dan: { name: 'Hộ Kiếp Đan', group: 'pills', sell: 400, effect: { type: 'buff', buff: 'guard', amount: 0.35 }, desc: 'Giảm 35% sát thương lôi ở lần độ kiếp kế tiếp.' },
  bao_the_dan: { name: 'Bảo Thể Đan', group: 'pills', sell: 3000, effect: { type: 'stat', stat: 'hp', amount: 120 }, desc: '+120 Khí huyết vĩnh viễn.' },
  kim_than_dan: { name: 'Kim Thân Đan', group: 'pills', sell: 4000, effect: { type: 'stat', stat: 'atk', amount: 15 }, desc: '+15 Công kích vĩnh viễn.' },
  thien_pha_dan: { name: 'Thiên Phá Đan', group: 'pills', sell: 20000, effect: { type: 'buff', buff: 'success', amount: 0.2 }, desc: '+20% tỉ lệ cho lần đột phá kế tiếp.' },
  ngo_dao_dan: { name: 'Ngộ Đạo Đan', group: 'pills', sell: 2000, effect: { type: 'expBonus', amount: 0.02 }, desc: '+2% tốc độ linh khí vĩnh viễn.' },
}

// Công Pháp Tàn Quyển: sinh tự động từ danh sách ARTS
for (const [id, art] of Object.entries(ARTS)) {
  ITEMS[artFragmentId(id)] = {
    name: `${art.name} Tàn Quyển`, group: 'scrolls', sell: 40,
    desc: `Gom ${ART_LEARN_COST} bản để học hoặc thăng cấp công pháp ${art.name} (tab Công Pháp > Công Pháp).`,
  }
}

// Tàn quyển võ kỹ: sinh tự động từ danh sách SKILLS
for (const [id, skill] of Object.entries(SKILLS)) {
  ITEMS[fragmentId(id)] = {
    name: `${skill.name} Tàn Quyển`, group: 'scrolls', sell: 30,
    desc: `Gom ${LEARN_COST} bản để học hoặc thăng cấp võ kỹ ${skill.name} (tab Công Pháp > Võ Kỹ).`,
  }
}

export const itemName = (id) => ITEMS[id]?.name ?? id

/** Công thức luyện đan. Điều kiện mở: bậc tu vi + cấp luyện đan. */
export const RECIPES = [
  { id: 'tu_khi_dan', ingredients: { linh_thao: 3 }, stones: 5, minStage: 0, minAlchemy: 1 },
  { id: 'hoi_huyet_dan', ingredients: { linh_thao: 2, huyet_sam: 1 }, stones: 8, minStage: 0, minAlchemy: 1 },
  { id: 'duong_the_dan', ingredients: { linh_thao: 3, huyet_sam: 2 }, stones: 20, minStage: 2, minAlchemy: 2 },
  { id: 'kim_cang_dan', ingredients: { linh_thao: 3, thiet_tinh: 3 }, stones: 20, minStage: 2, minAlchemy: 2 },
  { id: 'cuong_can_dan', ingredients: { huyet_sam: 3, thiet_tinh: 2 }, stones: 30, minStage: 4, minAlchemy: 3 },
  { id: 'than_phap_dan', ingredients: { tu_van_thao: 3, huyen_thiet: 1 }, stones: 120, minStage: 9, minAlchemy: 4 },
  { id: 'pha_canh_dan', ingredients: { bang_lien: 2, tinh_kim: 1, huyen_thiet: 2 }, stones: 400, minStage: 9, minAlchemy: 5 },
  { id: 'ho_kiep_dan', ingredients: { tu_van_thao: 3, huyen_thiet: 3 }, stones: 300, minStage: 9, minAlchemy: 5 },
  { id: 'bao_the_dan', ingredients: { hoa_than_qua: 3, hu_khong_thach: 2 }, stones: 40000, minStage: 18, minAlchemy: 9 },
  { id: 'kim_than_dan', ingredients: { hoa_than_qua: 3, tinh_kim: 3 }, stones: 60000, minStage: 18, minAlchemy: 10 },
  { id: 'thien_pha_dan', ingredients: { hoa_than_qua: 4, hon_don_tinh: 2, hu_khong_thach: 3 }, stones: 300000, minStage: 21, minAlchemy: 12 },
  { id: 'ngo_dao_dan', ingredients: { thien_nien_chi: 2, tinh_kim: 2 }, stones: 1500, minStage: 12, minAlchemy: 7 },
]

/**
 * Yêu thú. kind quyết định hình vẽ trên canvas (beast|serpent|spirit|golem).
 * Hệ số hp/atk/def/speed nhân với chỉ số chuẩn của cảnh giới bí cảnh.
 */
export const MONSTERS = {
  soi_yeu: { element: 'kim', name: 'Sói Yêu', kind: 'beast', color: 0x7a8399, hp: 0.55, atk: 0.62, def: 0.5, speed: 0.95, reward: 1 },
  xa_yeu: { element: 'moc', name: 'Xà Yêu', kind: 'serpent', color: 0x4fa36a, hp: 0.5, atk: 0.7, def: 0.45, speed: 0.9, reward: 1 },
  lang_vuong: { element: 'kim', name: 'Hắc Phong Lang Vương', kind: 'beast', color: 0x2b2f3d, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.0, reward: 1, boss: true },

  hau_yeu: { element: 'moc', name: 'Hầu Yêu', kind: 'ape', color: 0xa57448, hp: 0.6, atk: 0.62, def: 0.5, speed: 0.95, reward: 1 },
  moc_yeu: { element: 'moc', name: 'Mộc Yêu', kind: 'treant', color: 0x5fd36a, hp: 0.55, atk: 0.66, def: 0.5, speed: 0.9, reward: 1 },
  moc_linh: { element: 'moc', name: 'Vạn Niên Mộc Linh', kind: 'treant', color: 0x3f8f4a, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.0, reward: 1, boss: true },

  huyet_lang: { element: 'hoa', name: 'Huyết Lang', kind: 'beast', color: 0xc0392b, hp: 0.6, atk: 0.66, def: 0.5, speed: 1.0, reward: 1 },
  hac_thi: { element: 'tho', name: 'Hắc Thi', kind: 'zombie', color: 0x5b4a6b, hp: 0.65, atk: 0.62, def: 0.55, speed: 0.85, reward: 1 },
  huyet_ma: { element: 'hoa', name: 'Huyết Ma Vương', kind: 'demon', color: 0x8e1b1b, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.05, reward: 1, boss: true },

  bang_yeu: { element: 'thuy', name: 'Băng Linh', kind: 'spirit', color: 0x8fd8ff, hp: 0.58, atk: 0.66, def: 0.5, speed: 0.95, reward: 1 },
  bang_xa: { element: 'thuy', name: 'Băng Xà', kind: 'serpent', color: 0xaee6ff, hp: 0.55, atk: 0.7, def: 0.5, speed: 0.95, reward: 1 },
  bang_hoang: { element: 'thuy', name: 'Cực Địa Băng Hoàng', kind: 'bird', color: 0x6fb8e6, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.0, reward: 1, boss: true },

  u_hon: { element: 'thuy', name: 'U Hồn', kind: 'ghost', color: 0x9b6dff, hp: 0.58, atk: 0.68, def: 0.5, speed: 1.0, reward: 1 },
  xuong_giap: { element: 'kim', name: 'Xương Giáp Binh', kind: 'skeleton', color: 0xd6d2c4, hp: 0.68, atk: 0.64, def: 0.6, speed: 0.85, reward: 1 },
  ma_vien: { element: 'hoa', name: 'Ma Viên', kind: 'ape', color: 0x7a2fa0, hp: 0.6, atk: 0.68, def: 0.52, speed: 1.0, reward: 1 },
  ma_thi: { element: 'tho', name: 'Ma Thi', kind: 'zombie', color: 0x4a3a66, hp: 0.68, atk: 0.64, def: 0.6, speed: 0.88, reward: 1 },
  thai_co_ma_than: { element: 'hoa', name: 'Thái Cổ Ma Thần', kind: 'demon', color: 0xb02a4a, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.0, reward: 1, boss: true },

  hu_anh: { element: 'thuy', name: 'Hư Ảnh', kind: 'bat', color: 0x6fa0ff, hp: 0.58, atk: 0.7, def: 0.5, speed: 1.02, reward: 1 },
  hu_xa: { element: 'kim', name: 'Hư Không Xà', kind: 'serpent', color: 0x9aa8ff, hp: 0.55, atk: 0.72, def: 0.5, speed: 1.0, reward: 1 },
  hu_khong_thu: { element: 'thuy', name: 'Hư Không Thú Vương', kind: 'dragon', color: 0x3a4a9a, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.05, reward: 1, boss: true },

  hon_don_thu: { element: 'moc', name: 'Hỗn Độn Thú', kind: 'beast', color: 0xcfc080, hp: 0.62, atk: 0.7, def: 0.52, speed: 1.02, reward: 1 },
  hon_don_linh: { element: 'kim', name: 'Hỗn Độn Linh', kind: 'spirit', color: 0xf0e090, hp: 0.6, atk: 0.72, def: 0.52, speed: 1.05, reward: 1 },
  hon_don_de_quan: { element: 'tho', name: 'Hỗn Độn Đế Quân', kind: 'golem', color: 0xc8a840, hp: 1.8, atk: 0.58, def: 0.72, speed: 1.05, reward: 1, boss: true },

  hoang_tuyen_quy: { element: 'tho', name: 'Hoàng Tuyền Quỷ Vương', kind: 'ghost', color: 0x5d2f9e, hp: 1.7, atk: 0.55, def: 0.7, speed: 1.05, reward: 1, boss: true },
}

/**
 * Bí cảnh. `power` = cảnh giới chuẩn của yêu thú (stageIdx), `floors` tầng,
 * tầng cuối là boss. loot: chance là tỉ lệ rơi mỗi lần hạ yêu thú thường,
 * bossChance (mặc định gấp đôi) áp dụng cho boss.
 */
export const DUNGEONS = [
  {
    id: 'hac_phong', name: 'Hắc Phong Cốc', desc: 'Thung lũng gió đen, yêu thú hoành hành.',
    difficulty: 1, // hệ số cân bằng hp/atk yêu thú
    minStage: 0, power: 0, floors: 6, monsters: ['soi_yeu', 'xa_yeu'], boss: 'lang_vuong',
    loot: [
      { item: 'qk_doc_chu', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_ngu_kiem', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_thanh_moc', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'linh_thao', chance: 0.5, min: 1, max: 2 },
      { item: 'thiet_tinh', chance: 0.28, min: 1, max: 2 },
      { item: 'huyet_sam', chance: 0.08, bossChance: 0.6, min: 1, max: 1 },
      { item: 'kiem_quyet', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
    ],
  },
  {
    id: 'linh_duoc', name: 'Linh Dược Sơn', desc: 'Núi linh dược, thảo mộc thành tinh.',
    difficulty: 1, // hệ số cân bằng hp/atk yêu thú
    minStage: 4, power: 4, floors: 6, monsters: ['hau_yeu', 'moc_yeu'], boss: 'moc_linh',
    loot: [
      { item: 'qk_van_kiem', chance: 0.04, bossChance: 0.4, min: 1, max: 1 },
      { item: 'qk_loi_dinh', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_thanh_moc', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_phong_loi', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'linh_thao', chance: 0.5, min: 1, max: 3 },
      { item: 'huyet_sam', chance: 0.4, min: 1, max: 2 },
      { item: 'thiet_tinh', chance: 0.2, min: 1, max: 2 },
      { item: 'duong_khi_quyet', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'ho_the_quyet', chance: 0.02, bossChance: 0.2, min: 1, max: 1 },
    ],
  },
  {
    id: 'huyet_sat', name: 'Huyết Sát Động', desc: 'Hang động âm khí nồng đậm.',
    difficulty: 0.92, // hệ số cân bằng hp/atk yêu thú
    minStage: 9, power: 9, floors: 6, monsters: ['huyet_lang', 'hac_thi'], boss: 'huyet_ma',
    loot: [
      { item: 'qk_kim_than', chance: 0.04, bossChance: 0.4, min: 1, max: 1 },
      { item: 'qk_huyet_thuc', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_liet_hoa', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_hau_tho', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'huyet_sam', chance: 0.45, min: 1, max: 3 },
      { item: 'tu_van_thao', chance: 0.35, min: 1, max: 2 },
      { item: 'huyen_thiet', chance: 0.3, min: 1, max: 2 },
      { item: 'than_hanh_quyet', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'kiem_quyet', chance: 0.02, bossChance: 0.2, min: 1, max: 1 },
    ],
  },
  {
    id: 'bang_phong', name: 'Băng Phong Cực Địa', desc: 'Vùng cực bắc băng giá vạn năm.',
    difficulty: 0.84, // hệ số cân bằng hp/atk yêu thú
    minStage: 12, power: 12, floors: 6, monsters: ['bang_yeu', 'bang_xa'], boss: 'bang_hoang',
    loot: [
      { item: 'qk_ngu_loi', chance: 0.04, bossChance: 0.4, min: 1, max: 1 },
      { item: 'qk_tuyet_sat', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_huyen_bang', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_hau_tho', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'bang_lien', chance: 0.3, min: 1, max: 2 },
      { item: 'tu_van_thao', chance: 0.35, min: 1, max: 3 },
      { item: 'huyen_thiet', chance: 0.3, min: 1, max: 2 },
      { item: 'tinh_kim', chance: 0.06, bossChance: 0.5, min: 1, max: 1 },
      { item: 'ho_the_quyet', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'duong_khi_quyet', chance: 0.02, bossChance: 0.25, min: 1, max: 1 },
    ],
  },
  {
    id: 'cuu_u', name: 'Cửu U Hoàng Tuyền', desc: 'Cõi u minh, vong hồn tụ họp.',
    difficulty: 0.84, // hệ số cân bằng hp/atk yêu thú
    minStage: 15, power: 15, floors: 6, monsters: ['u_hon', 'xuong_giap'], boss: 'hoang_tuyen_quy',
    loot: [
      { item: 'qk_dan_hoa', chance: 0.04, bossChance: 0.4, min: 1, max: 1 },
      { item: 'qk_bao_nhan', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_phan_chan', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_phong_loi', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_liet_hoa', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_huyen_bang', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_ngu_kiem', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'bang_lien', chance: 0.3, min: 1, max: 2 },
      { item: 'thien_nien_chi', chance: 0.08, bossChance: 0.6, min: 1, max: 1 },
      { item: 'tinh_kim', chance: 0.1, bossChance: 0.6, min: 1, max: 2 },
      { item: 'huyen_thiet', chance: 0.3, min: 1, max: 3 },
      { item: 'than_hanh_quyet', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'kiem_quyet', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
    ],
  },
  {
    id: 'ma_uyen', name: 'Thái Cổ Ma Uyên', desc: 'Vực sâu phong ấn ma thần thượng cổ.',
    difficulty: 0.82, minStage: 18, power: 18, floors: 6, monsters: ['ma_vien', 'ma_thi'], boss: 'thai_co_ma_than',
    loot: [
      { item: 'qk_tran_dia', chance: 0.04, bossChance: 0.4, min: 1, max: 1 },
      { item: 'qk_phan_chan', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_liet_hoa', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_hau_tho', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'hoa_than_qua', chance: 0.3, min: 1, max: 2 },
      { item: 'hu_khong_thach', chance: 0.25, bossChance: 0.7, min: 1, max: 2 },
      { item: 'tinh_kim', chance: 0.12, bossChance: 0.6, min: 1, max: 2 },
      { item: 'thien_nien_chi', chance: 0.08, bossChance: 0.5, min: 1, max: 1 },
    ],
  },
  {
    id: 'hu_khong', name: 'Hư Không Giới', desc: 'Khe nứt giữa các thế giới, không gian vặn vẹo.',
    difficulty: 0.78, minStage: 21, power: 21, floors: 6, monsters: ['hu_anh', 'hu_xa'], boss: 'hu_khong_thu',
    loot: [
      { item: 'qk_thien_ha', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_huyen_bang', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_phong_loi', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'hoa_than_qua', chance: 0.3, min: 1, max: 3 },
      { item: 'hu_khong_thach', chance: 0.35, bossChance: 0.8, min: 1, max: 3 },
      { item: 'hon_don_tinh', chance: 0.06, bossChance: 0.5, min: 1, max: 1 },
    ],
  },
  {
    id: 'hon_don', name: 'Hỗn Độn Sơ Khai', desc: 'Nơi trời đất chưa phân, vạn vật hỗn mang.',
    difficulty: 0.68, minStage: 24, power: 24, floors: 6, monsters: ['hon_don_thu', 'hon_don_linh'], boss: 'hon_don_de_quan',
    loot: [
      { item: 'qk_thien_ha', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_tuyet_sat', chance: 0.03, bossChance: 0.3, min: 1, max: 1 },
      { item: 'qk_ngu_kiem', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'qk_liet_hoa', chance: 0.04, bossChance: 0.35, min: 1, max: 1 },
      { item: 'hoa_than_qua', chance: 0.3, min: 2, max: 3 },
      { item: 'hu_khong_thach', chance: 0.3, bossChance: 0.8, min: 2, max: 4 },
      { item: 'hon_don_tinh', chance: 0.12, bossChance: 0.7, min: 1, max: 2 },
    ],
  },
]

export const dungeonById = (id) => DUNGEONS.find((d) => d.id === id)
