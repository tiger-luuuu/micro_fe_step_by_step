/**
 * css-sandbox.js — CSS 隔离沙箱
 *
 * CSS 隔离是微前端的另一道屏障：JS 沙箱防止全局变量污染，
 * CSS 沙箱防止样式规则污染。
 *
 * 本文件提供两种 CSS 隔离模式：
 *
 * 一、Shadow DOM 模式（默认）
 * ─────────────────────────
 * 原理：利用浏览器原生 Shadow DOM 技术。
 * Shadow DOM 为 DOM 节点创建一个独立的"影子树"，
 * 影子树内外的样式完全隔离——外部样式不会穿透进来，内部样式不会泄漏出去。
 *
 *   主应用 DOM 树           Shadow Tree（子应用的世界）
 *  ┌─────────────┐         ┌────────────────────────┐
 *  │  #app-cont  │ ──────> │  shadow-root（隔离边界） │
 *  │   (host)    │         │   <style> h2{color:…}  │ ← 只作用于 shadow 内部
 *  └─────────────┘         │   <div class="app">…   │
 *                          └────────────────────────┘
 *  外部的 h2 { color: red }  ← 不会影响 shadow 内的 h2
 *
 * 优点：隔离彻底，浏览器原生支持，无需手动处理样式
 * 缺点：使用全局弹窗（挂载到 document.body）的子应用会丢失样式
 *
 *
 * 二、Scoped CSS 模式
 * ───────────────────
 * 原理：子应用 mount 时，拦截所有动态插入的 <style> 标签，
 * 给每条 CSS 规则加上子应用专属的属性选择器前缀，例如：
 *   原始规则：  h2 { color: green }
 *   处理后：    [data-micro-app="app-vue"] h2 { color: green }
 * 同时给子应用容器元素加上对应属性，unmount 时清理。
 *
 * 优点：对子应用侵入性小，全局弹窗样式正常工作
 * 缺点：需要手动解析 CSS，:root / html / body 选择器需要特殊处理
 *
 *
 * 本阶段主线实现 Shadow DOM 模式；Scoped CSS 作为备选实现，供对比理解。
 */


// ═══════════════════════════════════════════════════════
//  Shadow DOM CSS 沙箱
// ═══════════════════════════════════════════════════════

/**
 * 基于 Shadow DOM 的 CSS 隔离
 *
 * 使用方式：
 *   const cssSandbox = new ShadowDomCssSandbox(app.name)
 *   const mountTarget = cssSandbox.createContainer(hostEl)  // 返回 shadowRoot
 *   // 子应用渲染到 mountTarget
 *   cssSandbox.destroy()  // 卸载时调用，清空 shadow 内容
 */
export class ShadowDomCssSandbox {
  constructor(appName) {
    this.appName = appName
    this.shadowRoot = null
  }

  /**
   * 为宿主元素创建（或复用）Shadow Root，返回作为子应用挂载目标的 shadowRoot
   * @param {Element} hostEl - 主应用中的容器 DOM 节点（#app-container）
   * @returns {ShadowRoot}
   */
  createContainer(hostEl) {
    // attachShadow 对同一元素只能调用一次，若已有 shadowRoot 则直接复用
    // （子应用切出切入时，宿主元素保持不变，只需复用已有的 shadow root）
    if (hostEl.shadowRoot) {
      this.shadowRoot = hostEl.shadowRoot
    } else {
      // mode: 'open' 表示可以通过 element.shadowRoot 从外部访问，方便调试
      // mode: 'closed' 则外部无法访问，隔离更彻底，但调试困难
      this.shadowRoot = hostEl.attachShadow({ mode: 'open' })
    }
    console.log(`[CssSandbox] ${this.appName} Shadow DOM 容器已就绪`)
    return this.shadowRoot
  }

  /**
   * 卸载时清理：清空 shadowRoot 内的所有内容
   * 注意：shadowRoot 本身保留（宿主元素不变），只清空内部节点
   */
  destroy() {
    if (this.shadowRoot) {
      // 子应用的 unmount 钩子已经移除了自己的 DOM，
      // 这里做兜底清理，防止残留
      this.shadowRoot.innerHTML = ''
      console.log(`[CssSandbox] ${this.appName} Shadow DOM 内容已清空`)
    }
  }
}


// ═══════════════════════════════════════════════════════
//  Scoped CSS 沙箱（补充实现，供对比理解）
// ═══════════════════════════════════════════════════════

/**
 * 基于属性选择器前缀的 Scoped CSS 隔离
 *
 * 工作原理：
 * 1. mount 时，给子应用容器加上唯一属性：data-micro-app="app-vue"
 * 2. 子应用插入 <style> 时，拦截并改写规则：
 *      h2 { color: green }
 *    ↓ 变为
 *      [data-micro-app="app-vue"] h2 { color: green }
 * 3. unmount 时，移除属性和所有改写过的 <style> 标签
 *
 * 注意：本实现使用 MutationObserver 监听 DOM 插入，
 * 捕获子应用动态添加的 <style> 标签并进行改写。
 */
export class ScopedCssSandbox {
  constructor(appName) {
    this.appName = appName
    this.scopeAttr = `data-micro-app="${appName}"`
    this.scopeSelector = `[data-micro-app="${appName}"]`
    this.hostEl = null
    this.observer = null
    // 记录所有经过改写的 <style> 元素，卸载时统一移除
    this.injectedStyles = []
  }

  /**
   * 初始化 Scoped CSS 环境：给容器加作用域属性，开始监听样式注入
   * @param {Element} hostEl
   * @returns {Element} hostEl（Scoped 模式直接挂载到宿主元素）
   */
  createContainer(hostEl) {
    this.hostEl = hostEl
    // 给宿主容器打上作用域标记，CSS 规则改写后会以此为根选择器
    hostEl.setAttribute('data-micro-app', this.appName)

    // 使用 MutationObserver 监听子应用动态插入的 <style> 标签
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.tagName === 'STYLE' && !node.dataset.scoped) {
            this._scopeStyle(node)
          }
        }
      }
    })
    this.observer.observe(hostEl, { childList: true, subtree: true })

    console.log(`[CssSandbox] ${this.appName} Scoped CSS 环境已就绪（作用域：${this.scopeAttr}）`)
    return hostEl
  }

  /**
   * 改写单个 <style> 标签中的 CSS 规则，给每条规则加上作用域前缀
   * @param {HTMLStyleElement} styleEl
   */
  _scopeStyle(styleEl) {
    // 标记为已处理，避免重复改写
    styleEl.dataset.scoped = 'true'

    const originalText = styleEl.textContent
    const scopedText = this._addScopePrefix(originalText)
    styleEl.textContent = scopedText

    this.injectedStyles.push(styleEl)
    console.log(`[CssSandbox] ${this.appName} 样式已添加作用域前缀`)
  }

  /**
   * 给 CSS 文本中每条规则的选择器加上作用域前缀
   *
   * 处理规则示例：
   *   h2 { color: green }         → [data-micro-app="app-vue"] h2 { color: green }
   *   .btn, .icon { ... }         → [data-micro-app="app-vue"] .btn, [data-micro-app="app-vue"] .icon { ... }
   *   :root { --color: red }      → [data-micro-app="app-vue"] { --color: red }（特殊处理）
   *
   * @param {string} cssText
   * @returns {string}
   */
  _addScopePrefix(cssText) {
    // 用 CSSStyleSheet API 解析规则（比正则更准确）
    // 注意：此方法在某些浏览器中对 @import 等复杂规则支持有限
    const sheet = new CSSStyleSheet()
    try {
      sheet.replaceSync(cssText)
    } catch (e) {
      // 解析失败则直接返回原始文本，不做处理
      console.warn(`[CssSandbox] CSS 解析失败，跳过作用域处理:`, e.message)
      return cssText
    }

    return Array.from(sheet.cssRules).map(rule => {
      if (rule instanceof CSSStyleRule) {
        // 普通样式规则：给选择器加前缀
        const scopedSelector = rule.selectorText
          .split(',')
          .map(sel => {
            sel = sel.trim()
            // :root 和 html 选择器特殊处理：替换为作用域选择器
            if (sel === ':root' || sel === 'html') {
              return this.scopeSelector
            }
            // body 替换为容器本身（因为 body 在 shadow dom 外）
            if (sel === 'body') {
              return this.scopeSelector
            }
            return `${this.scopeSelector} ${sel}`
          })
          .join(', ')
        return `${scopedSelector} { ${rule.style.cssText} }`
      }
      // 其他规则（@media、@keyframes 等）暂时直接返回原始文本
      return rule.cssText
    }).join('\n')
  }

  /**
   * 卸载时清理：移除容器属性和所有注入的样式
   */
  destroy() {
    // 停止监听
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }

    // 移除作用域属性
    if (this.hostEl) {
      this.hostEl.removeAttribute('data-micro-app')
      this.hostEl = null
    }

    // 移除所有改写过的 <style> 标签
    for (const styleEl of this.injectedStyles) {
      styleEl.parentNode?.removeChild(styleEl)
    }
    this.injectedStyles = []

    console.log(`[CssSandbox] ${this.appName} Scoped CSS 已清理`)
  }
}


/**
 * 工厂函数：根据 mode 创建对应的 CSS 沙箱实例
 * @param {string} appName
 * @param {'shadow-dom'|'scoped'|false} mode
 * @returns {ShadowDomCssSandbox|ScopedCssSandbox|null}
 */
export function createCssSandbox(appName, mode) {
  if (mode === 'shadow-dom') {
    return new ShadowDomCssSandbox(appName)
  }
  if (mode === 'scoped') {
    return new ScopedCssSandbox(appName)
  }
  return null  // mode === false，不启用 CSS 隔离
}
