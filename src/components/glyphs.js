// glyphs.js - Bộ biểu tượng bổ sung (nét vàng mảnh, khung 24x24) và bảng id -> biểu tượng.
// Icon.vue gộp GLYPHS vào PATHS nên dùng chung một thẻ <Icon name="..." />.

export const GLYPHS = {
  robe: '<path d="M8 3l-4 4 2.500 3L8 9v12h8V9l1.500 1L20 7l-4-4-2 2h-4z"/><path d="M12 5v16"/>',
  dagger: '<path d="M5 19l9-9"/><path d="M13 7l4-4 4 4-4 4z"/><path d="M4 20.500l2.500-.5L5 17.500z"/>',
  cloudbolt: '<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.500 1.500A3.500 3.500 0 0 1 17 15z"/><path d="M12.500 12l-2 3.500h3l-2 3.500"/>',
  cracks: '<path d="M3 8h6l2 4 2-3 3 5 5-1"/><path d="M11 12l-1 7M16 14l1 5"/>',
  fireball: '<circle cx="14" cy="10" r="5.500"/><path d="M3 21l6-6M3 15l4-4M9 21l4-4"/>',
  claw: '<path d="M6 4c1 6 1 11 0 16M12 3c1.500 6 1.500 12 0 18M18 4c1 6 1 11 0 16"/>',
  flame: '<path d="M12 3c1 3.500 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3.500 2.500-4.500.2 1.500 1 2.200 1.800 2.500C11 8 11 5.500 12 3z"/>',
  snow: '<path d="M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9"/><path d="M9.500 4.500L12 6.500l2.500-2M9.500 19.500l2.500-2 2.500 2"/>',
  leaf: '<path d="M5 19c0-8 5-13.500 14.500-14.500C19 14 14 19.500 5 19z"/><path d="M5 19c3-4.500 6-7.500 10-9.500"/>',
  mountain: '<path d="M2.500 20L9 8l4 7 3-5 5.500 10z"/><path d="M7 12l2-4 2 3"/>',
  wave: '<path d="M2.500 9c3-3 6 3 9 0s6 3 9 0"/><path d="M2.500 15c3-3 6 3 9 0s6 3 9 0"/>',
  drop: '<path d="M12 3c3.500 4.500 6 7.500 6 11a6 6 0 0 1-12 0c0-3.500 2.500-6.500 6-11z"/>',
  skull: '<path d="M5 12a7 7 0 0 1 14 0c0 2-1 3-2 3.500V19H7v-3.500C6 15 5 14 5 12z"/><circle cx="9.500" cy="12" r="1.200"/><circle cx="14.500" cy="12" r="1.200"/><path d="M10 19v-2M14 19v-2"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
  burst: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.500"/><path d="M12 1.500v3M12 19.500v3M1.500 12h3M19.500 12h3"/>',
  fist: '<path d="M7 11V7a1.500 1.500 0 0 1 3 0v3M10 9.500V6a1.500 1.500 0 0 1 3 0v4M13 9.500V7a1.500 1.500 0 0 1 3 0v4"/><path d="M7 11a1.500 1.500 0 0 0-3 0v2.500C4 17.500 7 21 12 21c4 0 6-3 6-7v-3a1.500 1.500 0 0 0-3 0"/>',
  wind: '<path d="M3 8h11a2.500 2.500 0 1 0-2.500-2.500M3 12h15a2.500 2.500 0 1 1-2.500 2.500M3 16h8a2.500 2.500 0 1 1-2.500 2.500"/>',
  paw: '<circle cx="7" cy="10" r="1.700"/><circle cx="12" cy="6.500" r="1.700"/><circle cx="17" cy="10" r="1.700"/><path d="M12 12.500c-3 0-5 3-5 5 0 1.700 2 2 5 .8 3 1.200 5 .9 5-.8 0-2-2-5-5-5z"/>',
  wing: '<path d="M3 6c5 0 9 3 10 8M3 6c1 5 4 8 9 9M3 6c3 3 5 6 6 10"/><path d="M13 14c2-1 5-1 8 1-3 3-6 3-8 1"/>',
  shell: '<path d="M3.500 14a8.500 8 0 0 1 17 0z"/><path d="M12 6v8M7.500 8.500L9 14M16.500 8.500L15 14M2.500 17.500h19"/>',
  crown: '<path d="M3.500 18L2.500 7l5 4L12 4l4.500 7 5-4-1 11z"/><path d="M4 21h16"/>',
  ring: '<circle cx="12" cy="14" r="6"/><path d="M9.500 4.500h5l1.500 3H8z"/>',
  boots: '<path d="M8 3h6v8l6 3v5H5v-4l3-1z"/><path d="M5 19h15"/>',
  helm: '<path d="M4 14a8 8 0 0 1 16 0v3H4z"/><path d="M12 6v6M8 17v3M16 17v3"/>',
  gem: '<path d="M6.500 4h11l3.500 5-9 11.500L3 9z"/><path d="M3 9h18M9 4l3 5 3-5M12 9v11.500"/>',
  coin: '<circle cx="12" cy="12" r="8.500"/><rect x="9" y="9" width="6" height="6" rx="0.800"/>',
  hourglass: '<path d="M6.500 3h11M6.500 21h11"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  lock: '<rect x="5" y="11" width="14" height="9.500" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500"/><circle cx="12" cy="7.800" r="0.600"/>',
  check: '<path d="M4.500 12.500l5 5 10-11"/>',
  mask: '<path d="M4 6h16v6c0 4-3.500 7-8 8-4.500-1-8-4-8-8z"/><path d="M8 10.500h2.500M13.500 10.500H16M9.500 15c1.500 1 3.500 1 5 0"/>',
  tower: '<path d="M7 21V8l-1.500-1V3h3v2h2V3h3v2h2V3h3v4L17 8v13z"/><path d="M10.500 21v-5h3v5"/>',
  tree: '<path d="M12 21V12"/><path d="M12 12c-5 0-7-3-7-6.500 3.500 0 6 1.500 7 4 1-2.500 3.500-4 7-4 0 3.500-2 6.500-7 6.500z"/>',
  fish: '<path d="M3 12c3-5 9-6 13-3l5-2.500v11L16 15c-4 3-10 2-13-3z"/><circle cx="8" cy="11" r="0.700"/>',
  bag2: '<path d="M6 8h12l1 12H5z"/><path d="M9 8V6.500a3 3 0 0 1 6 0V8"/>',
  hammer: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M12.500 11.500L4 20"/>',
  refine: '<path d="M7 20h10M12 20v-6"/><path d="M8 4h8l-1 6a3 3 0 0 1-6 0z"/>',
  swords: '<path d="M4 20L15 9M14 5h5v5"/><path d="M20 20L9 9M10 5H5v5"/>',
  rest: '<path d="M5 17a7 7 0 0 1 12-5c0 4-3 6-7 5.500"/><path d="M14 4h5l-5 5h5"/>',
  alert: '<path d="M12 3.500l9 16H3z"/><path d="M12 10v4.500"/><circle cx="12" cy="17.300" r="0.600"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.500"/><path d="M3 9h18M12 9v11M12 9c-3 0-4.500-4-1.500-4C12 5 12 7 12 9zm0 0c3 0 4.500-4 1.500-4C12 5 12 7 12 9z"/>',
  calendar: '<rect x="4" y="5.500" width="16" height="14.500" rx="2"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/>',
  target: '<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="4.500"/><circle cx="12" cy="12" r="0.800"/>',
  dots: '<circle cx="6" cy="12" r="1.200"/><circle cx="12" cy="12" r="1.200"/><circle cx="18" cy="12" r="1.200"/>',
  arts: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/><path d="M12 7.500l1.200 2.500 2.800.4-2 2 .5 2.800-2.500-1.400-2.500 1.400.5-2.800-2-2 2.800-.4z"/>',
  pet: '<circle cx="7" cy="10" r="1.700"/><circle cx="12" cy="6.500" r="1.700"/><circle cx="17" cy="10" r="1.700"/><path d="M12 12.500c-3 0-5 3-5 5 0 1.700 2 2 5 .8 3 1.200 5 .9 5-.8 0-2-2-5-5-5z"/>',
  sparkles: '<path d="M10 3l1.500 4.500L16 9l-4.500 1.500L10 15l-1.500-4.500L4 9l4.500-1.500z"/><path d="M18 14l.8 2.200L21 17l-2.200.8L18 20l-.8-2.200L15 17l2.200-.8z"/>',
}

// ---------- id -> biểu tượng ----------
export const SKILL_GLYPH = {
  ngu_kiem: 'sword', liet_hoa: 'flame', huyen_bang: 'snow', thanh_moc: 'leaf', hau_tho: 'mountain', phong_loi: 'wind',
  doc_chu: 'skull', loi_dinh: 'bolt', tuyet_sat: 'dagger', huyet_thuc: 'drop', bao_nhan: 'fist', phan_chan: 'burst',
  thien_ha: 'star', van_kiem: 'swords', kim_than: 'helm', ngu_loi: 'cloudbolt', dan_hoa: 'fireball', tran_dia: 'cracks',
}
export const ART_GLYPH = {
  thanh_tam: 'lotus', cuong_the: 'heart', pha_quan: 'fist', kim_cang: 'shield', truy_phong: 'wind',
  tu_bao: 'coin', ho_phap: 'eye', thien_nhan: 'star', ngu_hanh: 'burst', luan_hoi: 'reborn',
}
export const PET_GLYPH = {
  tieu_ho: 'paw', quy_giap: 'shell', linh_hac: 'wing', kim_thiem: 'claw', van_ho: 'mask', bang_ly: 'snow', thanh_long: 'wave', hoa_phuong: 'flame',
}
export const TREASURE_GLYPH = {
  can_khon_dinh: 'refine', that_tinh_kiem: 'sword', ho_than_phu: 'scroll', tu_linh_binh: 'drop',
  phong_loi_phien: 'wind', huyet_sat_chau: 'gem', hon_nguyen_chung: 'shield', thien_co_la_ban: 'target',
  van_loi_an: 'cloudbolt', tinh_ha_binh: 'star', huyen_vu_an: 'shell',
}
export const PATH_GLYPH = { kiem: 'sword', dao: 'flame', the: 'shield', phu: 'scroll' }

/** Ảnh vẽ (public/skills/*.png) của kỹ năng: nút cây kỹ năng (kiem_1...) và 8 kỹ năng chung có tranh. */
const GENERIC_IMG = new Set(['ngu_kiem', 'liet_hoa', 'loi_dinh', 'hau_tho', 'phong_loi', 'huyen_bang', 'phan_chan', 'thanh_moc'])
export const skillImg = (id) => (/^(kiem|dao|the|phu)_[1-8]$/.test(id) || GENERIC_IMG.has(id) ? `${import.meta.env.BASE_URL}skills/${id}.png` : '')
export const GROUP_GLYPH = { herbs: 'herb', ores: 'stone', scrolls: 'scroll', pills: 'pill' }

/** Biểu tượng của một vật phẩm trong túi (tàn quyển theo võ kỹ / công pháp / linh thú tương ứng). */
export function itemGlyph(id, group) {
  if (id.startsWith('qk_')) return SKILL_GLYPH[id.slice(3)] ?? 'scroll'
  if (id.startsWith('cp_')) return ART_GLYPH[id.slice(3)] ?? 'scroll'
  if (id.startsWith('ln_')) return PET_GLYPH[id.slice(3)] ?? 'scroll'
  if (id.startsWith('pb_')) return TREASURE_GLYPH[id.slice(3)] ?? 'scroll'
  return GROUP_GLYPH[group] ?? 'gem'
}
export const GROUP_COLOR = { herbs: '#5fd36a', ores: '#9fb4d8', scrolls: '#e8d9a8', pills: '#f6c85f' }
export const SLOT_GLYPH = { weapon: 'sword', armor: 'robe', helm: 'helm', boots: 'boots', ring: 'ring', jade: 'gem' }
