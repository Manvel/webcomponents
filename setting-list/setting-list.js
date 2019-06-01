class SettingList extends HTMLElement {
  constructor() {
    super();
    this.text = "btn-txt";
    this.description = "btn-desc";
    this.checkboxElem = null;
    this.labelElem = null;
    this.textElem = null;
    this.connected = false;

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        span::after
        {
          content: "";
          border: none;
          display: inline-block;
          width: 12px;
          height: 12px;
          background: url(info.svg) center no-repeat transparent;
          margin: 0px 3px;
        }
      </style>
      <label>
        <span><slot>Some default</slot></span>
        <input type="checkbox" />
      </label>
    `;
  }

  connectedCallback() {
    this.connected = true;
    this.checkboxElem = this.shadowRoot.querySelector("input");
    this.labelElem = this.shadowRoot.querySelector("label");
    this.textElem = this.shadowRoot.querySelector("span");
    if (this.dataset.msg)
      this.text = this.dataset.msg;
    if (this.dataset.desc)
      this.description = this.dataset.desc;

    this.textElem.addEventListener("click", (e) =>
    {
      e.preventDefault();
    });

    this.checkboxElem.addEventListener("change", (e) =>
    {
      const changed = new CustomEvent("change");
      this.dispatchEvent(changed);
    });

    this._render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    if (name === "text") {
      this.text = newValue;
    }
    else if (name === "description") {
      this.description = newValue;
    }
    if (!this.connected)
      this._render();
  }

  static get observedAttributes() {
    return ["text", "description"];
  }

  _getMsg(id)
  {
    // Mock data
    const data = 
    {
      "btn-txt": "Label text",
      "btn-desc": "Longer, more informative description of the toggle button"
    };

    return data[id] || id;
  }

  isEnabled()
  {
    return this.checkboxElem.checked;
  }

  setEnabled(status)
  {
    this.checkboxElem.checked = status;
  }

  toggle()
  {
    this.checkboxElem.checked = !this.checkboxElem.checked;
  }

  _render() {
    this.textElem.textContent = this._getMsg(this.text);
    this.labelElem.setAttribute("title", this._getMsg(this.description));
    this.shadowRoot.appendChild(this.labelElem);
  }
}

customElements.define('setting-list', SettingList);
