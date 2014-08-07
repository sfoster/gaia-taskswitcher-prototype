// Mock StackController for the purposes of this prototype
StackManager = {
  init: function() {
    this.apps = [
    'baidu.com', 'Camera',  'Clock',  'Dialer',  'google.com',  'Settings',
    'Blackjack'
    ].map(function(hostname, position) {
      var url = './screenshots/' + hostname.toLowerCase() + '.png';
      var app = new AppWindow({
        src: url,
        name: hostname,
        position: position,
        iconUrl: './style/icons/Default.png'
      });
      app.render();
      return app;
    });
  },
  snapshot: function() {
    var apps = Array.slice(this.apps);
    apps.sort(function(a, b) {
      return a.position >= b.position;
    });
    return apps;
  }
};
