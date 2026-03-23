/**
 * sandbox.js — 基于 Proxy 的 JS 沙箱
 *
 * 核心问题：子应用的脚本在浏览器里共享同一个 window 对象。
 * 如果 app-vue 在 window 上写了 window.utils = {...}，
 * app-react 也能读到，这会导致难以排查的 bug。
 *
 * 解决思路：给每个子应用一个"假的 window"（fakeWindow）。
 * 子应用读写全局变量时，实际操作的是这个 fakeWindow，
 * 而不是真实的 window，从而实现隔离。
 *
 * 实现方式：Proxy 代理
 * Proxy 可以拦截对象的 get/set 操作。
 * 我们创建一个以真实 window 为原型的空对象，用 Proxy 包裹它：
 *   - set：写操作只落到 fakeWindow，不污染真实 window
 *   - get：先查 fakeWindow，找不到再透传到真实 window（读取浏览器原生 API）
 *
 *
 *  ┌─────────────────────────────────┐
 *  │         真实 window              │  ← 浏览器原生 API（document、fetch 等）
 *  └────────────────┬────────────────┘
 *                   │ 原型链查找（只读透传）
 *  ┌────────────────▼────────────────┐
 *  │   fakeWindow（子应用专属空间）    │  ← 子应用的写操作落在这里
 *  │   { myVar: 1, utils: {...} }    │
 *  └────────────────┬────────────────┘
 *                   │ Proxy 拦截
 *  ┌────────────────▼────────────────┐
 *  │   子应用代码中的 window / this   │  ← 子应用感知到的 "window"
 *  └─────────────────────────────────┘
 */

export class Sandbox {
  constructor(appName) {
    this.appName = appName
    this.active = false

    // 子应用专属的全局变量存储空间
    // 用 Object.create(window) 让它继承 window，这样读取 document/fetch 等原生 API 时能正常找到
    this.fakeWindow = Object.create(window)

    // 记录子应用在沙箱内新增/修改的 key，unmount 时用于清理真实 window（针对不走 proxy 的情况）
    this.addedPropsMap = new Map()

    this._createProxy()
  }

  _createProxy() {
    const { fakeWindow, appName } = this

    this.proxy = new Proxy(fakeWindow, {
      /**
       * 拦截读操作：window.xxx
       * 优先读 fakeWindow，读不到再从真实 window 上取
       */
      get(target, key) {
        // 几个特殊 key 需要返回真实值，否则一些浏览器 API 会行为异常
        if (key === 'window' || key === 'self' || key === 'globalThis') {
          return target  // 返回 fakeWindow 本身，让子应用认为它就是 window
        }
        if (key === 'top' || key === 'parent') {
          return window[key]  // 安全相关，不劫持
        }

        const value = key in target ? target[key] : window[key]

        // 如果是函数（如 setTimeout、fetch），需要绑定到真实 window，
        // 否则会报 "Illegal invocation" 错误
        if (typeof value === 'function' && !value.prototype) {
          return value.bind(window)
        }
        return value
      },

      /**
       * 拦截写操作：window.xxx = value
       * 写操作只落到 fakeWindow，真实 window 不受影响
       */
      set(target, key, value) {
        if (!target.hasOwnProperty(key)) {
          // 记录新增的 key，方便 deactivate 时清理
          // （对于某些绕过 proxy 直接写 window 的情况，这是兜底）
        }
        target[key] = value
        return true
      },

      /**
       * 拦截 in 操作符：'xxx' in window
       */
      has(target, key) {
        return key in target || key in window
      },
    })
  }

  /**
   * 激活沙箱（子应用 mount 时调用）
   * 将沙箱 proxy 设置为子应用代码执行时的全局对象
   */
  activate() {
    this.active = true
    console.log(`[Sandbox] ${this.appName} 沙箱已激活`)
  }

  /**
   * 停用沙箱（子应用 unmount 时调用）
   * 子应用的全局变量留在 fakeWindow 里，不会影响其他应用
   */
  deactivate() {
    this.active = false
    console.log(`[Sandbox] ${this.appName} 沙箱已停用，隔离的全局变量:`, this._getOwnProps())
  }

  /**
   * 返回沙箱内子应用写入的所有 key（用于调试）
   */
  _getOwnProps() {
    const ownProps = {}
    for (const key of Object.getOwnPropertyNames(this.fakeWindow)) {
      // 过滤掉从 Object.create(window) 继承的原型属性
      if (this.fakeWindow.hasOwnProperty(key)) {
        ownProps[key] = this.fakeWindow[key]
      }
    }
    return ownProps
  }
}
