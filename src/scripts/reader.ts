/**
 * Reading tools on the poem page: text size (A− / A+), copy, print, share.
 * The size is stored as pn-size and applied before paint by Base.astro.
 */
const SIZES = [0.8, 0.9, 1, 1.1, 1.2, 1.35, 1.5];
const KEY = 'pn-size';

export function initReader() {
  const tools = document.querySelector<HTMLElement>('[data-reader-tools]');
  const verses = document.querySelector<HTMLElement>('[data-verses]');
  if (!tools || !verses) return;
  tools.hidden = false;

  const root = document.documentElement;
  const status = tools.querySelector<HTMLElement>('.reader-tools__status')!;
  const smaller = tools.querySelector<HTMLButtonElement>('[data-size="-1"]')!;
  const larger = tools.querySelector<HTMLButtonElement>('[data-size="1"]')!;

  const currentSize = () => {
    const i = SIZES.indexOf(parseFloat(root.style.getPropertyValue('--reading-scale')) || 1);
    return i === -1 ? SIZES.indexOf(1) : i;
  };
  const syncSize = () => {
    const i = currentSize();
    smaller.disabled = i === 0;
    larger.disabled = i === SIZES.length - 1;
  };
  const setSize = (step: number) => {
    const i = Math.min(SIZES.length - 1, Math.max(0, currentSize() + step));
    root.style.setProperty('--reading-scale', String(SIZES[i]));
    try { localStorage.setItem(KEY, String(SIZES[i])); } catch { /* not stored */ }
    syncSize();
  };
  syncSize();

  let timer: number | undefined;
  const say = (msg: string | undefined) => {
    status.textContent = msg ?? '';
    clearTimeout(timer);
    timer = window.setTimeout(() => (status.textContent = ''), 2500);
  };

  const canonical = () => document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href;
  const poemText = () => {
    const stanzas = [...verses.querySelectorAll('.verse__text')].map((p) =>
      [...p.querySelectorAll('.line')].map((l) => l.textContent?.trim() ?? '').join('\n'),
    );
    return `${verses.dataset.title ?? ''}\n\n${stanzas.join('\n\n')}\n\n— ${verses.dataset.poet ?? ''}\n${canonical()}`;
  };

  tools.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!btn) return;
    if (btn.dataset.size) setSize(Number(btn.dataset.size));
    else if (btn.hasAttribute('data-copy')) { if (await copy(poemText())) say(status.dataset.copied); }
    else if (btn.hasAttribute('data-print')) window.print();
    else if (btn.hasAttribute('data-share')) {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url: canonical() }); } catch { /* cancelled */ }
      } else if (await copy(canonical())) say(status.dataset.linkCopied);
    }
  });
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
