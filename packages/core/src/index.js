/**
 * index.js — 微前端框架入口
 *
 * 对外暴露两个核心 API：
 *   - registerMicroApp(config)  注册子应用
 *   - start()                   启动框架，开始监听路由
 *
 * 使用方式（主应用中）：
 *   import { registerMicroApp, start } from './core/src/index.js'
 *
 *   registerMicroApp({ name: 'app-vue', entry: '/app-vue/index.js', container: '#app', activeRule: '/vue' })
 *   start()
 */

import { registerMicroApp } from '/core/src/registry.js'
import { startRouter } from '/core/src/router.js'

export { registerMicroApp }

/**
 * 启动微前端框架
 * 调用后框架开始监听路由变化，并按规则调度子应用
 */
export function start() {
  console.log('[MicroFE] 框架启动')
  startRouter()
}
