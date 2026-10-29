<script setup>
// Portrait.vue - Chân dung nhân vật cốt truyện (SVG vẽ tay bằng code, khung tròn viền vàng).
// name: tên người nói trong story.js; không khớp thì hiện biểu tượng sen (lời dẫn).
defineProps({
  name: { type: String, default: '' },
  size: { type: Number, default: 56 },
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" class="shrink-0 rounded-full" style="box-shadow: 0 0 0 1.5px rgb(217 165 58 / 0.7), 0 2px 8px rgb(0 0 0 / 0.5)">
    <defs>
      <clipPath id="pc"><circle cx="32" cy="32" r="32" /></clipPath>
    </defs>
    <g clip-path="url(#pc)">
      <!-- Thanh Hư: lão nhân tóc bạc, râu dài, áo xanh -->
      <template v-if="name === 'Thanh Hư'">
        <rect width="64" height="64" fill="#1c4a52" />
        <path d="M6 64c2-14 12-20 26-20s24 6 26 20z" fill="#3a8f9a" />
        <path d="M24 46l8 10 8-10" fill="none" stroke="#bfe9ee" stroke-width="2" />
        <path d="M22 30c0 12 5 20 10 20s10-8 10-20z" fill="#f4f1ea" />
        <ellipse cx="32" cy="26" rx="10.5" ry="11.5" fill="#f2d2b6" />
        <path d="M21 24c0-9 5-14 11-14s11 5 11 14c-3-5-7-7-11-7s-8 2-11 7z" fill="#f4f1ea" />
        <circle cx="32" cy="9" r="4" fill="#f4f1ea" />
        <rect x="30.8" y="4" width="2.4" height="6" fill="#c8a050" />
        <path d="M24.5 25q2.2-1.4 4.4 0M35.1 25q2.2-1.4 4.4 0" stroke="#3a2a22" stroke-width="1.4" fill="none" stroke-linecap="round" />
        <path d="M23 21l5-1.5M41 21l-5-1.5" stroke="#f4f1ea" stroke-width="1.8" stroke-linecap="round" />
        <path d="M28 33q4 3 8 0" stroke="#d8a79a" stroke-width="1.2" fill="none" />
      </template>

      <!-- Mặc Vô Ngân: thiếu niên áo trắng, tóc đen buộc cao, ánh mắt sắc -->
      <template v-else-if="name === 'Mặc Vô Ngân'">
        <rect width="64" height="64" fill="#5a2430" />
        <path d="M6 64c2-14 12-20 26-20s24 6 26 20z" fill="#f4f6fb" />
        <path d="M24 46l8 9 8-9" fill="none" stroke="#c43a4a" stroke-width="2.2" />
        <path d="M44 14q14 4 10 30-6-16-14-20z" fill="#16181f" />
        <ellipse cx="32" cy="27" rx="10" ry="11.5" fill="#f2d2b6" />
        <path d="M20 26c-1-10 5-17 12-17s13 7 12 17c-2-5-5-8-12-8s-10 3-12 8z" fill="#16181f" />
        <path d="M21 22q11-7 22 0" stroke="#c43a4a" stroke-width="2.4" fill="none" />
        <path d="M24 27l5 1.2M40 27l-5 1.2" stroke="#16181f" stroke-width="1.8" stroke-linecap="round" />
        <circle cx="27.5" cy="29.5" r="1.4" fill="#16181f" />
        <circle cx="36.5" cy="29.5" r="1.4" fill="#16181f" />
        <path d="M29 35h6" stroke="#b86f5a" stroke-width="1.3" stroke-linecap="round" />
      </template>

      <!-- Bạch Linh: hồ ly trắng, tai hồng, ấn trên trán -->
      <template v-else-if="name === 'Bạch Linh'">
        <rect width="64" height="64" fill="#7a3a5a" />
        <path d="M10 26L16 4l14 12zM54 26L48 4 34 16z" fill="#fdfdff" />
        <path d="M15 22l3-12 8 7zM49 22l-3-12-8 7z" fill="#ffb4c8" />
        <path d="M8 38c0-14 10-22 24-22s24 8 24 22c0 12-10 22-24 22S8 50 8 38z" fill="#fdfdff" />
        <path d="M6 42l8-4-2 8zM58 42l-8-4 2 8z" fill="#f0f2fa" />
        <ellipse cx="22" cy="38" rx="4" ry="5" fill="#2a2a38" />
        <ellipse cx="42" cy="38" rx="4" ry="5" fill="#2a2a38" />
        <circle cx="23.2" cy="36.2" r="1.4" fill="#fff" />
        <circle cx="43.2" cy="36.2" r="1.4" fill="#fff" />
        <ellipse cx="32" cy="47" rx="3" ry="2.2" fill="#2a2a38" />
        <path d="M32 49v3M28 52q4 2 8 0" stroke="#2a2a38" stroke-width="1.2" fill="none" stroke-linecap="round" />
        <ellipse cx="17" cy="46" rx="4" ry="2.2" fill="#ffb4c8" opacity=".6" />
        <ellipse cx="47" cy="46" rx="4" ry="2.2" fill="#ffb4c8" opacity=".6" />
        <path d="M32 20l3 5-3-1-3 1z" fill="#7fe3ff" />
      </template>

      <!-- A Tử: đứa trẻ áo đen rách, ấn đỏ nơi cổ -->
      <template v-else-if="name === 'A Tử'">
        <rect width="64" height="64" fill="#3a2a5a" />
        <path d="M8 64c2-12 11-18 24-18s22 6 24 18z" fill="#1c1a26" />
        <path d="M14 56l5 5M44 54l6 6" stroke="#3a3a4c" stroke-width="2" />
        <circle cx="32" cy="47" r="5.5" fill="none" stroke="#e5493a" stroke-width="1.6" />
        <path d="M30 44l4 6M34 44l-4 6" stroke="#e5493a" stroke-width="1" />
        <ellipse cx="32" cy="29" rx="11" ry="12" fill="#f2d2b6" />
        <path d="M19 28c-2-12 6-19 14-19s15 6 12 19c-1-6-4-9-8-9l-4 4-4-4c-6 0-9 3-10 9z" fill="#2a1f2c" />
        <path d="M21 14l-3-5M44 13l4-4M32 10v-5" stroke="#2a1f2c" stroke-width="2.4" stroke-linecap="round" />
        <circle cx="27" cy="30" r="2.4" fill="#2a2a38" />
        <circle cx="37" cy="30" r="2.4" fill="#2a2a38" />
        <circle cx="27.8" cy="29.2" r="0.9" fill="#fff" />
        <circle cx="37.8" cy="29.2" r="0.9" fill="#fff" />
        <path d="M28.5 37q3.5 2 7 0" stroke="#b86f5a" stroke-width="1.3" fill="none" stroke-linecap="round" />
        <ellipse cx="24" cy="35" rx="2.6" ry="1.5" fill="#f08a8a" opacity=".45" />
        <ellipse cx="40" cy="35" rx="2.6" ry="1.5" fill="#f08a8a" opacity=".45" />
      </template>

      <!-- Hồn Cũ: bóng hồn trùm mũ, mắt sáng -->
      <template v-else-if="name === 'Hồn Cũ'">
        <rect width="64" height="64" fill="#1c2250" />
        <path d="M32 4c-14 0-22 12-22 26v34h44V30C54 16 46 4 32 4z" fill="#6a78d8" opacity=".75" />
        <ellipse cx="32" cy="30" rx="13" ry="16" fill="#0c1030" />
        <ellipse cx="26" cy="28" rx="3.2" ry="4.2" fill="#bfe4ff" />
        <ellipse cx="38" cy="28" rx="3.2" ry="4.2" fill="#bfe4ff" />
        <ellipse cx="26" cy="28" rx="1.4" ry="2" fill="#fff" />
        <ellipse cx="38" cy="28" rx="1.4" ry="2" fill="#fff" />
        <path d="M27 40q5 3 10 0" stroke="#bfe4ff" stroke-width="1.2" fill="none" opacity=".6" />
        <circle cx="12" cy="18" r="2" fill="#bfe4ff" opacity=".7" /><circle cx="53" cy="22" r="1.6" fill="#bfe4ff" opacity=".7" /><circle cx="48" cy="52" r="2" fill="#bfe4ff" opacity=".5" />
      </template>

      <!-- Thái Cổ Ma Thần: bóng tối có sừng, mắt đỏ -->
      <template v-else-if="name === 'Thái Cổ Ma Thần'">
        <rect width="64" height="64" fill="#2a0a12" />
        <circle cx="32" cy="34" r="30" fill="#5a0f1c" opacity=".55" />
        <path d="M18 24C12 14 10 8 14 2c4 8 10 14 14 16zM46 24c6-10 8-16 4-22-4 8-10 14-14 16z" fill="#d8c8a8" />
        <path d="M8 64c0-22 8-38 24-38s24 16 24 38z" fill="#0c0508" />
        <ellipse cx="32" cy="32" rx="14" ry="12" fill="#0c0508" />
        <path d="M20 30l9 3-9 1zM44 30l-9 3 9 1z" fill="#ff3b4a" />
        <circle cx="25" cy="32" r="1.6" fill="#fff" opacity=".8" /><circle cx="39" cy="32" r="1.6" fill="#fff" opacity=".8" />
        <path d="M24 42q8 6 16 0" stroke="#ff3b4a" stroke-width="1.6" fill="none" />
        <path d="M27 42l1 4 2-3 2 3 2-3 1 3" stroke="#e8e0d0" stroke-width="1" fill="none" />
      </template>

      <!-- Lời dẫn: biểu tượng sen -->
      <template v-else>
        <rect width="64" height="64" fill="#1b2335" />
        <circle cx="32" cy="32" r="22" fill="none" stroke="#d9a53a" stroke-width="1" opacity=".5" />
        <path d="M32 46c-9 0-17-4-19-12 6 0 10 2 12 6 0-9 2-17 7-24 5 7 7 15 7 24 2-4 6-6 12-6-2 8-10 12-19 12z" fill="#e9b6d6" opacity=".9" />
        <path d="M32 46c-4 0-8-2-9-6 3 0 5 1 6 3 0-4 1-8 3-12 2 4 3 8 3 12 1-2 3-3 6-3-1 4-5 6-9 6z" fill="#ffd8ea" />
      </template>
    </g>
  </svg>
</template>
