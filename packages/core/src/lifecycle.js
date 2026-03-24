/**
 * lifecycle.js — 生命周期调度
 *
 * 负责按正确顺序调用子应用暴露的三个生命周期函数：
 *   1. bootstrap — 初始化，整个子应用生命周期内只执行一次
 *   2. mount     — 挂载到 DOM，每次激活时执行
 *   3. unmount   — 从 DOM 卸载，每次切走时执行
 *
 * 每次调用都会更新 app.status，方便调试和状态判断。
 */

import { loadApp } from '/core/src/loader.js'

/**
 * 执行 bootstrap 生命周期
 * 在首次 mount 之前调用一次，用于子应用的全局初始化工作
 */
export async function bootstrapApp(app) {
  app.status = 'BOOTSTRAPPING'
  console.log(`[MicroFE] ${app.name} → bootstrap`)

  try {
    await app.lifecycle.bootstrap()
    app.status = 'NOT_MOUNTED'
  } catch (e) {
    app.status = 'BOOTSTRAP_ERROR'
    throw e
  }
}

/**
 * 执行 mount 生命周期
 * 将子应用渲染到指定容器中
 */
export async function mountApp(app) {
  app.status = 'MOUNTING'
  console.log(`[MicroFE] ${app.name} → mount`)

  // 获取宿主容器 DOM 节点（主应用 HTML 中的 #app-container 等）
  const hostEl = document.querySelector(app.container)
  if (!hostEl) {
    throw new Error(`[MicroFE] 找不到子应用 "${app.name}" 的容器: ${app.container}`)
  }

  // CSS 隔离：根据模式决定子应用实际挂载的目标节点
  //   - shadow-dom 模式：挂载到 shadowRoot（浏览器原生隔离）
  //   - scoped 模式：挂载到 hostEl，但样式规则会自动加作用域前缀
  //   - 无隔离（false）：直接挂载到 hostEl
  const mountTarget = app.cssSandbox ? app.cssSandbox.createContainer(hostEl) : hostEl

  try {
    // 挂载前激活 JS 沙箱：后续子应用代码中的 window 读写都走 proxy
    app.sandbox.activate()
    // 将实际挂载目标传给子应用（shadow-dom 模式下为 shadowRoot）
    await app.lifecycle.mount({ container: mountTarget, name: app.name })
    app.status = 'MOUNTED'
    console.log(`[MicroFE] ${app.name} 已挂载${app.cssIsolation ? `（CSS 隔离：${app.cssIsolation}）` : ''}`)
  } catch (e) {
    app.status = 'MOUNT_ERROR'
    throw e
  }
}

/**
 * 执行 unmount 生命周期
 * 子应用负责清理自己创建的 DOM 和事件监听
 */
export async function unmountApp(app) {
  app.status = 'UNMOUNTING'
  console.log(`[MicroFE] ${app.name} → unmount`)

  const hostEl = document.querySelector(app.container)

  // 子应用卸载时，需要知道当初挂载到哪个节点，才能正确清理
  // shadow-dom 模式：子应用渲染在 shadowRoot 里，要传 shadowRoot 给 unmount
  // 其他模式：直接传 hostEl
  const mountTarget = app.cssSandbox && hostEl?.shadowRoot ? hostEl.shadowRoot : hostEl

  try {
    await app.lifecycle.unmount({ container: mountTarget, name: app.name })
    // 卸载后：先清理 CSS 沙箱（移除 shadow 内容或 scoped 样式），再停用 JS 沙箱
    app.cssSandbox?.destroy()
    app.sandbox.deactivate()
    app.status = 'NOT_MOUNTED'
    console.log(`[MicroFE] ${app.name} 已卸载`)
  } catch (e) {
    app.status = 'UNMOUNT_ERROR'
    throw e
  }
}

/**
 * 完整的激活流程：加载（如需）→ bootstrap（如需）→ mount
 */
export async function activateApp(app) {
  // 首次激活：需要先加载脚本，再 bootstrap
  if (app.status === 'NOT_LOADED') {
    app.status = 'LOADING'
    await loadApp(app)
    await bootstrapApp(app)
  }

  // 已 bootstrap 但未挂载（包括首次和后续切回来的情况）
  if (app.status === 'NOT_MOUNTED') {
    await mountApp(app)
  }
}
