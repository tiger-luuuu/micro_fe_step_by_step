/**
 * registry.js — 子应用注册表
 *
 * 维护一个全局数组，存储所有已注册子应用的配置与运行状态。
 * 子应用的状态机：
 *   NOT_LOADED → LOADING → NOT_BOOTSTRAPPED → BOOTSTRAPPING → NOT_MOUNTED → MOUNTING → MOUNTED → UNMOUNTING → NOT_MOUNTED
 */

// 所有已注册子应用的列表
const apps = []

/**
 * 注册一个子应用
 * @param {Object} config
 * @param {string} config.name        - 子应用唯一名称，同时用于从 window 上取生命周期
 * @param {string} config.entry       - 子应用入口 JS 文件的 URL
 * @param {string} config.container   - 子应用挂载的 DOM 容器选择器，如 '#app-container'
 * @param {string|Function} config.activeRule - 路由激活规则：字符串前缀或自定义函数
 */
export function registerMicroApp(config) {
  // 防止重复注册
  if (apps.find(app => app.name === config.name)) {
    console.warn(`[MicroFE] 子应用 "${config.name}" 已注册，跳过重复注册`)
    return
  }

  apps.push({
    name: config.name,
    entry: config.entry,
    container: config.container,
    activeRule: config.activeRule,
    // 运行时状态，框架内部维护，外部不需要关心
    status: 'NOT_LOADED',
    // 加载完成后，子应用的生命周期函数会存在这里
    lifecycle: null,
  })

  console.log(`[MicroFE] 注册子应用: ${config.name}`)
}

/**
 * 获取所有已注册的子应用
 */
export function getApps() {
  return apps
}
