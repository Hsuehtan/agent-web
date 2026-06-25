import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import { i18n } from './i18n'
import App from './App.vue'
import './styles/global.scss'
import 'katex/dist/katex.min.css'
import { oemConfig } from './config/oem'

// Apply theme classes before mount to prevent FOUC (Flash of Unstyled Content)
const savedBrightness = localStorage.getItem('hermes_brightness') || 'system'
const savedStyle = localStorage.getItem('hermes_style') || 'ink'

// Resolve dark mode
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDark = savedBrightness === 'dark' || (savedBrightness === 'system' && prefersDark)

// Resolve style
const isComic = savedStyle === 'comic'

// Apply classes to prevent FOUC
if (isDark) {
  document.documentElement.classList.add('dark')
}
document.documentElement.dataset.theme = isDark ? 'agent-command-dark' : 'enterprise-light'
if (isComic) {
  document.documentElement.classList.add('comic')
}

// Read token from URL BEFORE router initializes (hash router strips params)
const urlParams = new URLSearchParams(window.location.search)
const hashQuery = window.location.hash.split('?')[1]
const urlToken = urlParams.get('token') || (hashQuery ? new URLSearchParams(hashQuery).get('token') : null)
if (urlToken) {
  ;(window as any).__LOGIN_TOKEN__ = urlToken
}

// Apply OEM page title and favicon
document.title = oemConfig.brand.pageTitle
const faviconEl = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
if (faviconEl && oemConfig.brand.faviconPath) {
  faviconEl.href = oemConfig.brand.faviconPath
}

const app = createApp(App)
app.use(createPinia())
app.use(i18n)
app.use(router)
app.mount('#app')
