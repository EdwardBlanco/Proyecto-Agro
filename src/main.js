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
        primary: '#267744',
        secondary: '#153d2a',
        accent: '#9abf78'
      },
      notify: { position: 'top-right', timeout: 2800 }
    }
  })
  .mount('#app')
