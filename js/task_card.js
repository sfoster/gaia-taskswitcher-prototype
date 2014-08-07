function TaskCard(config) {
  for(var i in config) {
    this[i] = config[i];
  }
  if (this.app) {
    this.update(this.app);
  }
}

TaskCard.prototype.update = function(offset) {
  this.app.element.setAttribute('data-cardsview-offset', offset);
};
