const ASSETS = "https://raw.githubusercontent.com/kisentattoo-k/icons386/main/tattoo-models/";
const sexes = ["male", "female"];
const copy = {
  zh: ["紋身模特展示", "男模特", "女模特", "上一張", "下一張", "關閉"],
  en: ["Tattoo Model Gallery", "Male model", "Female model", "Previous", "Next", "Close"]
};
let inventory;

class TattooModelGallery extends HTMLElement {
  static observedAttributes = ["code", "lang", "photo-width", "photo-height"];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }

  async render() {
    const revision = this.revision = (this.revision || 0) + 1;
    this.hidden = true;
    this.shadowRoot.replaceChildren();
    const code = this.getAttribute("code");
    if (!/^[0-9]{3}$/.test(code || "")) return;
    const labels = copy[this.getAttribute("lang")] || copy.en;
    inventory ||= fetch(this.getAttribute("asset-base") ? this.getAttribute("asset-base") + "manifest.json" : ASSETS + "manifest.json")
      .then(response => {
        if (!response.ok) throw new Error("Model inventory unavailable");
        return response.json();
      }).catch(() => { inventory = undefined; return {}; });
    const list = (await inventory)[code];
    const images = await Promise.all(sexes.filter(sex => list?.includes(sex)).map(async sex => {
      const img = new Image();
      img.alt = labels[sexes.indexOf(sex) + 1];
      img.src = (this.getAttribute("asset-base") || ASSETS) + sex + "/" + code + ".jpg";
      try { await img.decode(); return img; } catch { return null; }
    }));
    const ready = images.filter(Boolean);
    if (revision !== this.revision || !this.isConnected) return;
    if (!ready.length) {
      this.dispatchEvent(new CustomEvent("tattoo-model-empty"));
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host([hidden]){display:none!important}
        :host{display:block;color:white;background:#000}
        section{text-align:center}
        h2{margin:0 0 12px}
        .track{display:flex;overflow-x:auto;overflow-y:hidden;touch-action:pan-x pan-y;scroll-snap-type:x mandatory;scrollbar-width:none}
        .slide{border:0;padding:0;background:#000;flex:0 0 100%;scroll-snap-align:start;display:grid;place-items:center;cursor:zoom-in}
        .slide img{display:block;width:min(100%,var(--photo-width));aspect-ratio:var(--ratio);object-fit:contain}
        .controls{display:flex;justify-content:center;align-items:center;gap:4px}
        button{font:inherit;color:inherit}
        .controls button,dialog button{min-width:44px;min-height:44px;background:#000;border:0;cursor:pointer}
        [aria-current=true]{text-decoration:underline}
        .single .controls{display:none}
        dialog{border:0;background:#000;color:white;padding:0;max-width:96vw;max-height:96dvh}
        dialog::backdrop{background:#000e}
        dialog img{display:block;max-width:96vw;max-height:calc(96dvh - 44px);object-fit:contain;margin:auto}
      </style>
      <section aria-labelledby="title">
        <h2 id="title"></h2>
        <div class="track"></div>
        <div class="controls"></div>
        <dialog><button type="button"></button><img></dialog>
      </section>`;
    const $ = selector => this.shadowRoot.querySelector(selector);
    const section = $("section");
    const photoWidth = Number(this.getAttribute("photo-width")) || 400;
    const photoHeight = Number(this.getAttribute("photo-height")) || 600;
    section.style.setProperty("--photo-width", photoWidth + "px");
    section.style.setProperty("--ratio", photoWidth + " / " + photoHeight);
    section.classList.toggle("single", ready.length === 1);
    $("h2").textContent = labels[0];
    const dialog = $("dialog");
    const close = $("dialog button");
    close.textContent = labels[5];
    close.onclick = () => dialog.close();
    const track = $(".track");
    const controls = $(".controls");
    const makeButton = (content, label, action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = content;
      button.setAttribute("aria-label", label);
      button.onclick = action;
      return button;
    };
    const position = () => Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
    const go = index => track.scrollTo({ left: Math.max(0, Math.min(index, 1)) * track.clientWidth });
    const dots = [];
    controls.append(makeButton("‹", labels[3], () => go(position() - 1)));
    ready.forEach((image, index) => {
      const slide = makeButton("", image.alt, () => {
        const full = $("dialog img");
        full.src = image.src;
        full.alt = image.alt;
        dialog.showModal();
      });
      slide.className = "slide";
      slide.append(image);
      track.append(slide);
      const dot = makeButton("●", image.alt, () => go(index));
      dots.push(dot);
      controls.append(dot);
    });
    controls.append(makeButton("›", labels[4], () => go(position() + 1)));
    const update = () => dots.forEach((dot, index) => dot.setAttribute("aria-current", index === position()));
    track.addEventListener("scroll", update, { passive: true });
    update();
    this.hidden = false;
    this.dispatchEvent(new CustomEvent("tattoo-model-ready"));
  }
}
customElements.define("tattoo-model-gallery", TattooModelGallery);

