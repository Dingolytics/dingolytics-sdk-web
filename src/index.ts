import platform from "platform";

type Options = {
  app: string;
  dsn: string;
  debug?: boolean;
  autoTrackPageViews?: boolean;
  autoTrackLinks?: boolean;
  autoTrackDownloads?: boolean;
  autoTrackForms?: boolean;
  // autoTrackSPA: boolean;
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

const Helpers = {
  isExternalLink: (link: HTMLAnchorElement) => {
    return link && link.href && link.host && link.host !== location.host
  },

  isMobile: () => {
    const regex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    return regex.test(navigator.userAgent);
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
      autoTrackPageViews: true,
      autoTrackLinks: true,
      autoTrackDownloads: false,
      autoTrackForms: false,
      ...options
    }
    this._template = {
      app: this.options.app,
      name: "",
      path: location.href,
      props: {},
      user_id: null,
      user_props: {},
      browser_name: platform.name || "",
      browser_agent: platform.ua || "",
      browser_version: platform.version || "",
      is_mobile: Helpers.isMobile(),
      os_name: os.family || "",
      os_version: os.version || "",
      referrer: document.referrer || "",
    }
    this._log = this.options.debug ? console.log : () => {};
  }

  init() {
    this._log("DingolyticsSDK: init", this.options);

    if (this.options.autoTrackPageViews) {
      this.trackPageView(location.pathname);
    }
  }

  setUser(userId: string, userProps?: object) {
    this._template.user_id = userId ? userId : null;
    this._template.user_props = userProps ? userProps : {};
    this._log("DingolyticsSDK: setUser:", userId, userProps);
  }

  trackEvent(event: string, data: any) {
    this._log("DingolyticsSDK: trackEvent: event=", event, "data=", data);
  }

  trackPageView(path: string) {
    this._track({ name: "page_view", path });
  }

  _track(data: object) {
    var event = {...this._template, ...data};
    this._log("DingolyticsSDK: _track: event=", event);
  }
}

export { DingolyticsSDK };