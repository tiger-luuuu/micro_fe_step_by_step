/**
 * router.js — 路由监听与调度入口
 *
 * 核心思路：
 * 1. 监听所有可能导致 URL 变化的事件
 * 2. 每次变化后调用 reroute()，根据新的 URL 决定挂载/卸载哪些子应用
 *
 * 需要处理的路由变化来源：
 *   - hash 路由: window.location.hash 变化，会触发 hashchange 事件
 *   - history 路由: pushState/replaceState 调用，不会触发任何原生事件，
 *     需要通过"猴子补丁"（monkey patch）劫持这两个方法
 */

import { getApps } from '/core/src/registry.js'
import { activateApp, unmountApp } from '/core/src/lifecycle.js'

/**
 * 判断一个子应用的激活规则是否匹配当前路由
 * @param {string|Function} activeRule
 */
function isActive(activeRule) {
  if (typeof activeRule === 'function') {
    // 支持自定义函数，接收 location 对象，返回 boolean
    return activeRule(window.location)
  }
  // 字符串规则：检查 hash 路由（#/vue）或 pathname（/vue）是否以此开头
  const path = window.location.hash
    ? window.location.hash.slice(1)   // '#/vue' → '/vue'
    : window.location.pathname
  return path.startsWith(activeRule)
}

/**
 * 核心调度函数：根据当前 URL 决定挂载/卸载哪些子应用
 * 每次路由变化都会调用此函数
 */
async function reroute() {
  const apps = getApps()

  // 将所有子应用按当前路由分成两组
  const appsToActivate = apps.filter(app => isActive(app.activeRule))
  const appsToUnmount = apps.filter(
    app => !isActive(app.activeRule) && app.status === 'MOUNTED'
  )

  console.log(`[MicroFE] 路由变化 → 激活: [${appsToActivate.map(a => a.name)}]，卸载: [${appsToUnmount.map(a => a.name)}]`)

  // 先并行卸载所有需要卸载的应用，避免 DOM 残留
  await Promise.all(appsToUnmount.map(app => unmountApp(app)))

  // 再依次激活需要挂载的应用
  // 用 for...of 而非 Promise.all 是为了保证顺序，避免多应用抢占同一容器
  for (const app of appsToActivate) {
    await activateApp(app)
  }
}

/**
 * 劫持 history.pushState 和 history.replaceState
 * 原因：这两个方法改变 URL 但不触发任何事件，需要手动通知框架
 */
function patchHistoryMethods() {
  const originalPushState = window.history.pushState
  const originalReplaceState = window.history.replaceState

  window.history.pushState = function (...args) {
    originalPushState.apply(this, args)
    reroute()
  }

  window.history.replaceState = function (...args) {
    originalReplaceState.apply(this, args)
    reroute()
  }
}

/**
 * 启动路由监听
 * 由框架的 start() 函数调用
 */
export function startRouter() {
  // 监听 hash 变化（适用于 hash 路由模式）
  window.addEventListener('hashchange', reroute)

  // 监听浏览器前进/后退（popstate）
  window.addEventListener('popstate', reroute)

  // 劫持 pushState/replaceState（适用于 history 路由模式）
  patchHistoryMethods()

  // 立即执行一次，处理页面初次加载时的路由
  reroute()
}
