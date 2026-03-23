/**
 * loader.js — 子应用脚本加载器
 *
 * 通过动态创建 <script> 标签来加载子应用的入口 JS 文件。
 * 子应用脚本执行后，会把自己的生命周期函数挂载到 window[appName] 上。
 *
 * 这是最简单的加载方式，类似于 HTML 中直接写 <script src="...">，
 * 但改为在运行时按需动态插入，实现"懒加载"效果。
 */

/**
 * 加载子应用入口脚本
 * @param {Object} app - 子应用配置对象（来自注册表）
 * @returns {Promise} 加载完成后 resolve
 */
export function loadApp(app) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = app.entry
    // 标记来源，方便调试时在 DevTools 中识别
    script.dataset.appName = app.name

    script.onload = () => {
      // 脚本执行完毕后，子应用已把生命周期挂到 window[app.name]
      const lifecycle = window[app.name]

      if (!lifecycle) {
        reject(new Error(`[MicroFE] 子应用 "${app.name}" 加载后未在 window.${app.name} 上找到生命周期函数，请检查子应用入口文件`))
        return
      }

      // 将生命周期函数存入 app 对象，后续调度时直接使用
      app.lifecycle = lifecycle
      console.log(`[MicroFE] 子应用 "${app.name}" 脚本加载完成`)
      resolve()
    }

    script.onerror = () => {
      reject(new Error(`[MicroFE] 子应用 "${app.name}" 脚本加载失败，入口地址: ${app.entry}`))
    }

    document.head.appendChild(script)
  })
}
