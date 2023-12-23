import platform from "platform";

type Options = {
  app: string;
  dsn: string;
  debug?: boolean;
  callback?: Function;
  autoPageViews?: boolean;
  autoLinks?: boolean;
  autoDownloads?: boolean;
  autoForms?: boolean;
  autoHistory?: boolean;
};

type Event = {
  // Application specific fields:
  app: string;
  name: string;
  path: string;
  props?: object;
  user_id?: string | null;
  user_props?: object;

  // Automatically detected device information:
  browser_agent: string;
  browser_name: string;
  browser_version: string;
  is_mobile: boolean;
  os_name: string;
  os_version: string;
  referrer: string;
};

const Utils = {
  isExternalLink: (link: HTMLAnchorElement) => {
    return link && link.href && link.host && link.host !== location.host
  },

  isMobile: () => {
    const regex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
  },

  getCurrentPath: () => {
    return location.pathname + location.search + location.hash;
  }
}

class DingolyticsSDK {
  options: Options;
  _log: Function;
  _template: Event;

  constructor(options: Options) {
    const os = platform.os || {};
    this.options = {
      // app: "",
      // dsn: "",
      debug: false,
      autoPageViews: true,
      autoLinks: true,
      autoDownloads: false,
      autoForms: false,
      autoHistory: false,
      ...options
    }
    this._template = {
      app: this.options.app,
      name: "",
      path: location.href + location.hash,
      props: {},
      user_id: null,
      user_props: {},
      browser_name: platform.name || "",
      browser_agent: platform.ua || "",
      browser_version: platform.version || "",
      is_mobile: Utils.isMobile(),
      os_name: os.family || "",
      os_version: os.version || "",
      referrer: document.referrer || "",
    }
    this._log = this.options.debug ? console.log : () => {};
  }

  init() {
    this._log("DingolyticsSDK: init:", this.options);

    if (this.options.autoPageViews) {
      this.trackPageView();
    }

    if (this.options.autoHistory) {
      window.addEventListener("popstate", () => {
        this.trackPageView();
      });
    }
  }

  setUser(userId: string, userProps?: object) {
    this._template.user_id = userId ? userId : null;
    this._template.user_props = userProps ? userProps : {};
    this._log("DingolyticsSDK: setUser:", userId, userProps);
  }

  trackEvent(name: string, data: object) {
    this._track({ name, ...(data || {}) });
  }

  trackPageView(path?: string) {
    path = path || Utils.getCurrentPath()
    this._track({ name: "page_view", path });
  }

  _track(data: object) {
    var event = {...this._template, ...data};
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
}

export { DingolyticsSDK };