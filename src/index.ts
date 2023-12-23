type Options = {
  dsn: string;
};

class DingolyticsTracker {
  options: Options;

  constructor(options: Options) {
    this.options = options;
    console.log('DingolyticsTracker: options=', options);
  }
}

export { DingolyticsTracker };