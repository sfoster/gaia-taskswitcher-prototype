function TaskCard(config) {
  for(var i in config) {
    this[i] = config[i];
  }
  this._fetchElements();
}

TaskCard.prototype._fetchElements = function tc__fetchElements() {
  if (!this.element) {
    this.element = document.getElementById(this.id);
  }
  this.footerMenu = this.element.querySelector('.buttonbar');
};

TaskCard.prototype.update = function(app, position) {
  var wasVisible = !!this.app;
  var isVisible = !!app;
  this.position = position;
  this.app = app;
  console.log('card'+this.id+' update with app: ' + app.name + ', position: ' + position);

  if (this.footerMenu && wasVisible !== isVisible) {
    // immediately set pointerevents to avoid catching clicks
    // during an opacity transition
    this.footerMenu.style.pointerEvents = isVisible ? 'auto' : 'none';
    this.footerMenu.style.opacity = isVisible ? 1 : 0;
  }
};
