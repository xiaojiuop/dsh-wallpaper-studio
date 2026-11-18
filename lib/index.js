/**
 * dsh-wallpaper-studio — Host half.
 *
 * All of the plugin's value lives in the browser half (`lib/client.js`): the
 * wallpaper layer, the theme-token overrides and the settings card are client
 * side. The Host half exists because a bundle row must resolve to a real module
 * exporting `apply`; it deliberately does nothing else (no tools, no routes,
 * no config namespace) so the plugin cannot break a boot.
 */

export const name = 'dsh-wallpaper-studio'

export function apply(ctx) {
  const log = ctx?.logger?.info
  if (typeof log === 'function') {
    log.call(ctx.logger, '[dsh-wallpaper-studio] client half registered — 设置 → 插件 → 壁纸工作室')
  }
}
