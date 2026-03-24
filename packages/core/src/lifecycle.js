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

  // 获取容器 DOM 节点，传给子应用，让子应用自行渲染
  const container = document.querySelector(app.container)
  if (!container) {
    throw new Error(`[MicroFE] 找不到子应用 "${app.name}" 的容器: ${app.container}`)
  }

  try {
    // 挂载前激活沙箱：后续子应用代码中的 window 读写都走 proxy
    app.sandbox.activate()
    // props 是传给子应用的上下文，container 是最关键的
    await app.lifecycle.mount({ container, name: app.name })
    app.status = 'MOUNTED'
    console.log(`[MicroFE] ${app.name} 已挂载`)
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

  const container = document.querySelector(app.container)

  try {
    await app.lifecycle.unmount({ container, name: app.name })
    // 卸载后停用沙箱：fakeWindow 中的变量被保留，下次 mount 时恢复
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
