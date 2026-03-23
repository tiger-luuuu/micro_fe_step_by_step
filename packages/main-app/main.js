/**
 * main.js — 主应用入口
 *
 * 主应用（也叫"基座"）负责：
 * 1. 注册所有子应用
 * 2. 启动微前端框架
 * 3. 提供子应用挂载的 DOM 容器
 *
 * 注意：主应用本身不需要关心子应用何时加载、如何渲染，
 * 这些都交给框架处理。
 */

import { registerMicroApp, start } from '/core/src/index.js'

// 注册子应用
// activeRule: 当 URL hash 以 '/vue' 开头时，激活 app-vue
registerMicroApp({
  name: 'app-vue',
  entry: '/app-vue/index.js',
  container: '#app-container',
  activeRule: '/vue',
})

// 当 URL hash 以 '/react' 开头时，激活 app-react
registerMicroApp({
  name: 'app-react',
  entry: '/app-react/index.js',
  container: '#app-container',
  activeRule: '/react',
})

// 启动框架！调用后框架开始监听路由，并根据当前 URL 立即调度
start()
