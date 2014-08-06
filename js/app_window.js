// Mock AppWindow for the purposes of this prototype
function AppWindow(configuration) {
  this.instanceID = 'appwindow_' + (AppWindow._idCounter++);
  for(var key in configuration) {
    this[key] = configuration[key];
  }
};
AppWindow._idCounter = 0;
AppWindow.prototype.CLASS_LIST = 'appWindow';

AppWindow.prototype.view = function() {
  return '<div class=" ' + this.CLASS_LIST +
          ' " id="' + this.instanceID +
          '" transition-state="closed">' +
            '<div class="titlebar">' + this.title + '</div>' +
            '<div class="screenshot-overlay"></div>' +
            '<div class="identification-overlay">' +
              '<div>' +
                '<div class="icon"></div>' +
                '<span class="title"></span>' +
              '</div>' +
            '</div>' +
            '<div class="fade-overlay"></div>' +
            '<div class="touch-blocker"></div>' +
            '<div class="browser-container"><iframe src="'+this.src+'"></iframe></div>' +
         '</div>';
}
AppWindow.prototype.render = function() {
  this.containerElement = document.getElementById('windows');
  this.containerElement.insertAdjacentHTML('beforeend', this.view());
  this.element = document.getElementById(this.instanceID);

  var overlay = '.identification-overlay';
  this.identificationOverlay = this.element.querySelector(overlay);
  var icon = '.identification-overlay .icon';
  this.identificationIcon = this.element.querySelector(icon);
  var title = '.identification-overlay .title';
  this.identificationTitle = this.element.querySelector(title);

  this.identificationTitle.textContent = this.name;

  if (this.identificationIcon) {
    this.identificationIcon.style.backgroundImage =
      'url("' + this.iconUrl + '")';
  }
};
AppWindow.prototype.enterTaskManager = function aw_enterTaskManager() {
  this._dirtyStyleProperties = {};
  if (this.element) {
    this.element.classList.add('in-task-manager');
  }
};
AppWindow.prototype.leaveTaskManager = function aw_leaveTaskManager() {
  if (this.element) {
    this.element.classList.remove('in-task-manager');
    this.unapplyStyle(this._dirtyStyleProperties);
    this._dirtyStyleProperties = null;
  }
};
AppWindow.prototype.unapplyStyle = function(nameValues) {
  var style = this.element.style;
  for (var pname in nameValues) {
    style[pname] = '';
    delete style[pname];
  }
};

AppWindow.prototype.applyStyle = function(nameValues) {
  var dirty = this._dirtyStyleProperties || (this._dirtyStyleProperties = {});
  var style = this.element.style;
  for (var property in nameValues) {
    if (undefined === nameValues[property]) {
      delete style[[property]];
    } else {
      style[property] = nameValues[property];
    }
    dirty[property] = true;
  }
};

