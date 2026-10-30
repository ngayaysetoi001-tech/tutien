import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
// Noto Serif: gói sẵn các bộ ký tự Latin, Latin mở rộng và tiếng Việt (chỉ tải bộ nào dùng tới)
import '@fontsource/noto-serif/latin-400.css'
import '@fontsource/noto-serif/latin-ext-400.css'
import '@fontsource/noto-serif/vietnamese-400.css'
import '@fontsource/noto-serif/latin-700.css'
import '@fontsource/noto-serif/latin-ext-700.css'
import '@fontsource/noto-serif/vietnamese-700.css'
import './style.css'

// Điểm khởi chạy: Vue + Pinia (store toàn cục của game).
createApp(App).use(createPinia()).mount('#app')
