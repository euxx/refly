export const getPopupContainer = (e: HTMLElement): Element =>
  e?.parentElement?.parentElement?.parentElement!

export const calcPopupPosition = (
  rect: DOMRect,
  barDimesion: { barWidth: number; barHeight: number }
) => {
  const { barHeight, barWidth } = barDimesion
  let top = 0
  let left = 0

  const viewportWidth = window.visualViewport.width
  const viewportHeight = window.visualViewport.height

  if (rect.width <= barWidth) {
    left = rect.left - (barWidth - rect.width) / 2
  } else if (rect.width > barWidth) {
    left = rect.left + (rect.width - barWidth) / 2
  }

  if (left < 0) left = 0
  if (left + barWidth > viewportWidth) left = viewportHeight - barWidth

  if (rect.bottom + barHeight > viewportHeight) {
    top = rect.top - 12
  } else if (rect.bottom + barHeight <= viewportHeight) {
    top = rect.bottom + 12
  }

  return { top, left }
}

export const scrollToBottom = () => {
  setTimeout(() => {
    const chatWrapperElem = document
      .querySelector("plasmo-csui")
      ?.shadowRoot?.querySelector(".chat-wrapper")

    if (chatWrapperElem) {
      const { scrollHeight, clientHeight } = chatWrapperElem
      chatWrapperElem.scrollTop = scrollHeight - clientHeight
    }
  })
}

export function getCSSVar(varName: string) {
  return getComputedStyle(document.body).getPropertyValue(varName).trim()
}

export function isMobileScreen() {
  return window.innerWidth <= 600
}
