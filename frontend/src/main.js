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

createApp(App)
  .use(createPinia())
  .use(router)
  .use(Quasar, {
    plugins: { Notify, Dialog, Loading },
    config: {
      brand: {
        primary: '#2d6a4f',
        secondary: '#1b4332',
        accent: '#52b788',
        dark: '#212529',
        positive: '#2d6a4f',
        negative: '#b42318',
        info: '#245b73',
        warning: '#8a5700'
      },
      notify: { position: 'top-right', timeout: 2800 }
    }
  })
  .mount('#app')
