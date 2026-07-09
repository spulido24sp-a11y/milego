export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export const createEl = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v);
  }
  children.forEach(c => el.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return el;
};

export const on = (el, evt, fn) => el.addEventListener(evt, fn);
export const delegate = (parent, sel, evt, fn) => {
  on(parent, evt, e => {
    const target = e.target.closest(sel);
    if (target) fn(e, target);
  });
};
