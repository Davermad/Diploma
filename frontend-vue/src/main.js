import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import { router } from './router'
import { auth, AUTH_INJECTION_KEY } from './auth'
import { vClickOutside } from './directives/clickOutside'
import './assets/global.css'

async function bootstrap() {
  await auth.initAuth()

  const app = createApp(App)
  app.provide(AUTH_INJECTION_KEY, auth)
  app.directive('click-outside', vClickOutside)
  app.use(Antd)
  app.use(router)
  app.mount('#app')
}

bootstrap()
