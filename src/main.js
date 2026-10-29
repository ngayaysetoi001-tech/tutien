import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// Điểm khởi chạy: Vue + Pinia (store toàn cục của game).
createApp(App).use(createPinia()).mount('#app')
