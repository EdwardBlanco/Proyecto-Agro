import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'
import '@/css/app.css'
import App from '@/App.vue'
import router from '@/router'
import { initializeStorage } from '@/services/storage'

document.title = import.meta.env.VITE_APP_NAME || 'SENAgro'

initializeStorage()

const pinia = createPinia()
pinia.use(createPersistedState())

createApp(App)
  .use(pinia)
  .use(router)
  .use(Quasar, {
    plugins: { Notify, Dialog, Loading },
    config: {
      brand: {
        primary: '#2E7D32',
        secondary: '#185B2B',
        accent: '#66BB6A',
        dark: '#123D29',
        positive: '#2E7D32',
        negative: '#b42318',
        info: '#245b73',
        warning: '#8a5700'
      },
      notify: { position: 'top-right', timeout: 2800 }
    }
  })
  .mount('#app')
