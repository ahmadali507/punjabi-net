/**
 * Copy and Share buttons outside the poem reader (proverb pages).
 *   <div data-share-tools data-copy-text="…">
 *     <button data-copy>  <button data-share>  <span role="status" data-copied data-link-copied>
 */
export function initShare() {
  for (const box of document.querySelectorAll<HTMLElement>('[data-share-tools]')) {
    box.hidden = false;
    const status = box.querySelector<HTMLElement>('[role="status"]');
    const url = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href;
    let timer: number | undefined;
    const say = (msg?: string) => {
      if (!status) return;
      status.textContent = msg ?? '';
      clearTimeout(timer);
      timer = window.setTimeout(() => (status.textContent = ''), 2500);
    };
    const copy = async (text: string) => {
      try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
    };
    box.querySelector('[data-copy]')?.addEventListener('click', async () => {
      if (await copy(`${box.dataset.copyText ?? ''}\n${url}`)) say(status?.dataset.copied);
    });
    box.querySelector('[data-share]')?.addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url }); } catch { /* cancelled */ }
      } else if (await copy(url)) say(status?.dataset.linkCopied);
    });
  }
}
