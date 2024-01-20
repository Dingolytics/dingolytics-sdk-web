import platform from "platform";

type Storage = {
  getItem: Function;
  setItem: Function;
};

type Options = {
  app: string;
  dsn: string;
  debug?: boolean;
  callback?: Function;
  autoTrackEvents?: Array<string>;
  storage?: Storage;
  storageClientIdKey?: string;
};

type Event = {
  // Application specific fields:
  app: string;
  event: string;
  path: string;
  host: string | null;
  attrs?: object | null;
  attrs_raw?: string | null;
  user_id?: string | null;

  // Automatically detected client-side details:
  client_id: string;
  client_user_agent: string;
  client_name: string;
  client_version: string;
  is_mobile: boolean;
  os_name: string;
  os_version: string;
  referrer: string;
};

const Utils = {
  isExternalLink: (link: HTMLAnchorElement) => {
    return link && link.href && link.host && link.host !== location.host
  },

  isDocumentUrl: (url: string) => {
    const regex = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|rar|gz|zip|pkg|7z|mp4|mp3|mov)$/i;
    return regex.test(url);
  },

  isMobile: () => {
    const regex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
  },

  getCurrentPath: () => {
    return location.pathname + location.search + location.hash;
  },

  getCurrentHost: () => {
    return location.host;
  },

  generateUUIDv4: () => {
    return "10000000-1000-4000-8000-100000000000".replace(
      /[018]/g, (c) => (
        parseInt(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4
      ).toString(16)
    );
  },

  getOrCreateClientId: (storage: Storage, key: string) => {
    key = key || "dingolytics:client_id";
    let id: string | null = storage.getItem(key);
    if (!id) {
      id = Utils.generateUUIDv4();
      storage.setItem(key, id);
    }
    return id;
  }
}

class DingolyticsSDK {
  options: Options;
  _builtInEvents: { [key: string]: Function };
  _log: Function;
  _storage: Storage;
  _template: Event;

  constructor(options: Options) {
    const os = platform.os || {};
    this.options = {
      debug: false,
      autoTrackEvents: ["page_view"],
      storageClientIdKey: "dingolytics:client_id",
      ...options
    }
    this._builtInEvents = {
      "_history": this._handleHistory.bind(this),
      "page_view": this.trackPageView.bind(this),
      "document_download": this._handleDocumentDownloads.bind(this),
      "external_link": this._handleExternalLinks.bind(this),
      "form_submit": this._handleFormSubmit.bind(this),
    }
    this._storage = options.storage ? options.storage : sessionStorage;
    this._template = {
      app: this.options.app,
      event: "",
      path: Utils.getCurrentPath(),
      host: Utils.getCurrentHost(),
      attrs: null,
      attrs_raw: null,
      user_id: null,
      client_id: Utils.getOrCreateClientId(this._storage, this.options.storageClientIdKey!),
      client_name: platform.name || "",
      client_user_agent: platform.ua || "",
      client_version: platform.version || "",
      is_mobile: Utils.isMobile(),
      os_name: os.family || "",
      os_version: os.version || "",
      referrer: document.referrer || "",
    }
    this._log = this.options.debug ? console.log : () => {};
  }

  init() {
    this._log("DingolyticsSDK: init:", this.options);
    // this._log("DingolyticsSDK: client_id:", this._template.client_id);
    if (this.options.autoTrackEvents) {
      for (const eventName of this.options.autoTrackEvents) {
        if (!this._builtInEvents[eventName]) {
          this._log("DingolyticsSDK: init: unknown event name:", eventName);
        } else {
          this._builtInEvents[eventName]();
        }
      }
    }
  }

  _handleDocumentDownloads() {
    document.addEventListener("click", (event) => {
      const link = (event.target as HTMLAnchorElement);
      const noQueryUrl = link.href.split('?')[0];
      if (Utils.isDocumentUrl(noQueryUrl)) {
        this.trackDocumentDownload(noQueryUrl);
      }
    });
  }

  _handleExternalLinks() {
    document.addEventListener("click", (event) => {
      const link = (event.target as HTMLAnchorElement);
      if (Utils.isExternalLink(link)) {
        this.trackExternalLink(link.href);
      }
    });
  }

  _handleHistory() {
    window.addEventListener("popstate", () => {
      this.trackPageView();
    });
  }

  _handleFormSubmit() {
    document.addEventListener("submit", (event) => {
      const form = (event.target as HTMLFormElement);
      this.trackFormSubmit(form);
    });
  }

  _track(data: object) {
    var event = {...this._template, ...data};
    event.attrs_raw = event.attrs ? JSON.stringify(event.attrs) : null;
    delete event.attrs;
    this._log("DingolyticsSDK: _track: event=", event);
    const request = new XMLHttpRequest();
    const callback = this.options.callback;
    request.addEventListener('readystatechange', () => {
      if (callback && (request.readyState === 4)) {
        callback({ event })
      }
    });
    request.addEventListener('error', (error) => {
      if (callback) {
        callback({ error })
      }
    });
    try {
      request.open('POST', this.options.dsn, true);
      request.setRequestHeader('content-type', 'application/json');
      request.send(JSON.stringify(event));
    } catch (error) {
      this._log("DingolyticsSDK: _track: error=", error);
    }
  }

  setUser(userId: string /*, userProps?: object*/) {
    this._template.user_id = userId ? userId : null;
    // this._template.user_props = userProps ? userProps : {};
    this._log("DingolyticsSDK: setUser:", userId /*, userProps*/);
  }

  trackEvent(name: string, data: object) {
    this._track({ name, ...(data || {}) });
  }

  trackPageView(path?: string) {
    path = path || Utils.getCurrentPath()
    this._track({ name: "page_view", path });
  }

  trackDocumentDownload(path: string) {
    this._track({ name: "document_download", path });
  }

  trackExternalLink(path: string) {
    this._track({ name: "external_link", path });
  }

  trackFormSubmit(form: HTMLFormElement) {
    this._track({ name: "form_submit", path: form.action });
  }
}

export { DingolyticsSDK };