/**
 * loader.js — 子应用脚本加载器
 *
 * 阶段一：通过动态 <script> 标签加载，脚本直接在真实 window 下执行。
 * 阶段二：改用 fetch 拉取脚本文本，再用 with(proxy) { eval(code) } 在沙箱环境中执行。
 *
 * 为什么必须用 fetch + eval，而不能继续用 <script src>？
 *
 *   <script src="app.js"> 加载的脚本，浏览器会把 window 作为其全局对象，
 *   我们没有任何办法把这个执行上下文替换成 Proxy。
 *
 *   fetch("app.js") 拿到的是脚本的字符串，我们可以手动控制执行方式：
 *   用 new Function 包裹，再配合 with(proxy)，让脚本里所有的全局变量读写
 *   都被 Proxy 拦截，从而落到 fakeWindow，而不是真实 window。
 *
 * 执行上下文示意：
 *
 *   const execScript = new Function('window', `with(window){ ${code} }`)
 *   execScript.call(sandbox.proxy, sandbox.proxy)
 *
 *   ↑ 两个作用：
 *     1. with(window)：让脚本内的裸变量访问（如 document、setTimeout）走 proxy 的 has/get
 *     2. .call(proxy)：让脚本内的 this 也指向 proxy
 */

/**
 * 加载子应用入口脚本（沙箱版）
 * @param {Object} app - 子应用配置对象（来自注册表），必须已有 app.sandbox
 * @returns {Promise} 加载完成后 resolve
 */
export async function loadApp(app) {
  // 1. 用 fetch 拉取脚本文本，而非插入 <script> 标签
  let code
  try {
    const res = await fetch(app.entry)
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    code = await res.text()
  } catch (e) {
    throw new Error(`[MicroFE] 子应用 "${app.name}" 脚本获取失败，入口地址: ${app.entry}。原因: ${e.message}`)
  }

  // 2. 将脚本包裹在 with(window) 中，使脚本内所有全局访问都经过 proxy 拦截
  //    new Function('window', ...) 把 proxy 作为名为 'window' 的参数传入，
  //    脚本里写 window.xxx 时，'window' 这个标识符就是我们传入的 proxy。
  let execScript
  try {
    execScript = new Function('window', `with(window){\n${code}\n}`)
  } catch (e) {
    throw new Error(`[MicroFE] 子应用 "${app.name}" 脚本解析失败: ${e.message}`)
  }

  // 3. 在沙箱 proxy 环境中执行脚本
  //    .call(proxy)  → 脚本内 this 指向 proxy
  //    传入 proxy    → with(window) 里的 'window' 是 proxy
  execScript.call(app.sandbox.proxy, app.sandbox.proxy)

  // 4. 从沙箱的 fakeWindow 读取生命周期（子应用把 window['app-vue'] = {...} 写到了 fakeWindow）
  const lifecycle = app.sandbox.fakeWindow[app.name]

  if (!lifecycle) {
    throw new Error(`[MicroFE] 子应用 "${app.name}" 加载后未在 window.${app.name} 上找到生命周期函数，请检查子应用入口文件`)
  }

  app.lifecycle = lifecycle
  console.log(`[MicroFE] 子应用 "${app.name}" 脚本加载完成（沙箱模式）`)
}
