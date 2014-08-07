(function(exports) {

  function ease(time, val, change, duration) {
    time /= duration/2;
    if (time < 1) {
      return change/2*time*time + val;
    }
    time--;
    return -change/2 * (time*(time-2) - 1) + val;
  }

  function clamp(lbound, ubound, value) {
    return Math.min(ubound, Math.max(value, lbound));
  }

  const GUTTER_WIDTH = 16;

  TaskSwitcher = function(){
    this._showing = false;
    this.stack = null;
  };

  TaskSwitcher.prototype._registerEvents = function() {
    this.overlay.addEventListener('click', this);
    window.addEventListener('appterminated', this);
  };
  TaskSwitcher.prototype._fetchElements = function() {
    this.element = document.querySelector('#windows');
    this.overlay = document.querySelector('#cards-view');
    this.stretcher = document.querySelector('#stretcher');
  };
  TaskSwitcher.prototype.init = function() {
    this._fetchElements();
    this._registerEvents();

    this.previousCard = new TaskCard({ id: 'card-previous'});
    this.currentCard = new TaskCard({ id: 'card-current'});
    this.nextCard = new TaskCard({ id: 'card-next'});

    this._scrollListener = {
      element: this.element,
      parent: this,
      start: function() {
        this.element.addEventListener('scroll', this.parent, false);
      },
      stop: function() {
        this.element.removeEventListener('scroll', this.parent);
      }
    };
  };
  TaskSwitcher.prototype.isShown = function() {
    return this._showing;
  };
  TaskSwitcher.prototype.show = function() {
    if (this.isShown()) {
      return;
    }
    this._showing = true;
    this._windowWidth = 320;
    this._cardWidth = Math.min(320, this._windowWidth);
    var stack = this.stack = StackManager.snapshot();
    var appsById = this.appsById = {};

    stack.forEach(function(app) {
      appsById[app.instanceID] = app;
      app.enterTaskManager();
    });

    this.stretcher.style.display = 'block';
    this.overlay.style.display = 'block';

    this._positionAppPreviews();
    this.currentPosition = 1; // get from stackmanager, but will normally be 1;
    this.moveToPosition(this.currentPosition);
    setTimeout(this._scrollListener.start.bind(this._scrollListener), 0);
  };
  TaskSwitcher.prototype.hide = function() {
    if (!this.isShown()) {
      return;
    }
    this._showing = false;
    this._scrollListener.stop();

    var app;
    while((app = this.stack.shift())) {
      app.leaveTaskManager();
    }
    this.overlay.style.display = 'none';
    this.stretcher.style.display = 'none';
  };
  /**
   * Is the view currently showing
   * @memberOf TaskManager.prototype
   */
  TaskSwitcher.prototype.isShown = function() {
    return this._showing;
  };

  /**
   * Toggle to activate/deactivate (mostly adding classes to elements)
   * @param {Boolean} true to activate, false to deactivate
   * @memberOf TaskManager.prototype
   */
  TaskSwitcher.prototype.setActive = function(toActive) {
    var cardsView = this.element;
    if (toActive == cardsView.classList.contains('active')) {
      // no change
      return;
    }
    if (toActive) {
      cardsView.classList.add('active');
      this._showing = true;
      this.fireCardViewShown();
    } else {
      cardsView.classList.remove('active');
      this._showing = false;
      // Let everyone know we're about to close the cards view
      this.fireCardViewBeforeClose();
    }
  };

  TaskSwitcher.prototype._positionAppPreviews = function() {
    var stack = this.stack;
    var count = stack.length;
    var totalWidth = 0;

    Array.forEach(stack, function(appWindow, idx, coln) {
      var leftValue = this._calculateCardPosition(idx, coln);
      var isLast = (idx === count - 1);
      var isFirst = (idx === 0);
      var style = {
        left: leftValue + 'px'
      };
      totalWidth += leftValue;
      appWindow.applyStyle(style);
    }, this);
    var container = document.querySelector('#windows');
    var cardWidth = (this._cardWidth / 2) + GUTTER_WIDTH; // 50% width + GUTTER_WIDTHpx gutter

    this.stretcher.style.width = this._windowWidth + ((count -1) * cardWidth) + 'px';

    container.classList.add('scrollable');
  };
  TaskSwitcher.prototype.moveToPosition = function(position) {
    if (!position || position < 0 || position >= this.stack.length) {
      // out of bounds position, default to 0
      position = 0;
    }
    this.currentPosition = position;
    var scaledCardWidth = (this._cardWidth / 2);
    this.scrollToPosition(position);
    // this.overlay.style.left = this._getAppAtPosition(position).element.style.left;
    // console.log('overlay left:: ', this._getAppAtPosition(position).element.style.left);
    console.log('moveToPosition: ', position);
    this.previousCard.update(this.stack[position - 1], position - 1);
    this.currentCard.update(this.stack[position], position);
    this.nextCard.update(this.stack[position + 1], position + 1);
  };
  TaskSwitcher.prototype.cardAction = function (card, actionName) {
    console.log('cardAction: ', actionName);
    switch (actionName) {
      case 'close' :
        console.info('cardAction: TODO: close ' + card.app.name);
        return;
      case 'favorite' :
        console.info('cardAction: TODO: favorite ' + card.app.name);
        return;
      case 'select' :
        this.newStackPosition = card.position;
        console.info('cardAction: switch to app: ' + card.app.name);
        // Card switcher will get hidden when 'appopen' is fired.
        return;
    }
  };

  TaskSwitcher.prototype.closeApp = function(app, removeImmediately) {
    // removal should be in reponse to appterminated
    // just set state on the button until then?
    app.kill(); // will result in appterminated event
  };

  TaskSwitcher.prototype._scrollInProgress = function() {
    if (!this._scrolling) {
      console.log('start scrolling');
      this.overlay.classList.add('scrolling');
      this._scrolling = true;
    }
    // reset timer
    if (this._scrollingTimerId) {
      clearTimeout(this._scrollingTimerId);
    }
    this._scrollingTimerId = setTimeout(this._notScrolling.bind(this), 120);
  };
  TaskSwitcher.prototype._notScrolling = function() {
    console.log('stop scrolling');
    if (this._scrollingTimerId) {
      clearTimeout(this._scrollingTimerId);
      this._scrollingTimerId = null;
    }
    this._scrolling = false;
    this.overlay.classList.remove('scrolling');

    var nearestPosition = this.currentPosition =
        this._getNearestPositionFromScrollOffset(this.element.scrollLeft);
    this.scrollToPosition(nearestPosition);
  };
  TaskSwitcher.prototype._getAppAtPosition = function(position) {
    return this.stack[position];
  };
  TaskSwitcher.prototype._getNearestPositionFromScrollOffset = function(offset) {
    if (isNaN(offset)) {
      offset = this.element.scrollLeft;
    }
    var scaledCardWidth = this._cardWidth / 2;
    var columnWidth = scaledCardWidth + GUTTER_WIDTH; // 50% width + GUTTER_WIDTHpx gutter
    var lastIndex = this.stack.length - 1;
    var zeroLeft = (this._windowWidth / 2) - scaledCardWidth
    offset -= zeroLeft;
    var position = lastIndex - Math.min(lastIndex, Math.round(offset / columnWidth));
    console.log('nearest position for offset: ', offset, position);
    return position;
  };
  TaskSwitcher.prototype._calculateCardPosition = function(position) {
    var scaledCardWidth = this._cardWidth / 2;
    // scale transform-origin is center,
    // so left edge is at center minus full scaled-width
    var zeroLeft = (this._windowWidth / 2) - scaledCardWidth
    var columnWidth = scaledCardWidth + GUTTER_WIDTH; // 50% width + GUTTER_WIDTHpx gutter
    var count = this.stack.length;
    var totalWidth = count * columnWidth;
    var left = zeroLeft + ((count - (position + 1)) * columnWidth);
    // console.log('calculated zeroLeft: ' + zeroLeft, ' calculated ' + left + ' for position: ' + position);
    return left;
  };
  TaskSwitcher.prototype.applyStyle = function(elm, props) {
    var style = elm.style;
    for (var name in props) {
      style[name] = props[name];
    }
  };
  TaskSwitcher.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'scroll' :
        this._scrollInProgress();
        break;
      case 'click' :
        console.log('handle click:', evt);
        this.handleTap(evt);
        break;
      case 'appterminated':
        this.onAppTerminated(evt);
        break;
    }
  };
  TaskSwitcher.prototype.handleTap = function(evt) {
    // Handle close events
    var targetNode = evt.target;
    var containerNode = targetNode.parentNode;

    var tmpNode;
    var cardElem;
    var card = this.getCardForElement(targetNode);

    if (card && ('buttonAction' in targetNode.dataset)) {
      evt.stopPropagation();
      this.cardAction(card, targetNode.dataset.buttonAction);
      return;
    }

    if (card) {
      // fallback action is to select the app under the tap
      this.cardAction(card, 'select');
      return;
    } else {
      console.log('handleTap: no card match for click:', evt);
    }
  };
  TaskSwitcher.prototype.onAppTerminated = function(evt) {
    var app = evt.detail;
    var position = this.stack.indexOf(app);
    var lastIndex = this.stack.length - 1;
    if (position > -1) {
      // TODO: check spec for how to animate?
      // positioning after removing an app /should/ be cheap,
      this._positionAppPreviews();
      this.moveToPosition(Math.min(position, lastIndex));
    }
  };

  TaskSwitcher.prototype.getCardForElement = function(elem) {
    var cardElem;
    var tmpNode = elem;
    do {
      if (tmpNode.classList && tmpNode.classList.contains('card')) {
        cardElem = tmpNode;
        break;
      }
      if (tmpNode == this.element) {
        break;
      }
    } while((tmpNode = tmpNode.parentNode));

    if (!cardElem) {
      console.log('no card found for node: ', elem);
      return;
    }
    switch (cardElem) {
      case this.previousCard.element:
        return this.previousCard;
      case this.currentCard.element:
        return this.currentCard;
      case this.nextCard.element:
        return this.nextCard;
    }
  };

  TaskSwitcher.prototype.scrollToPosition = function(position) {
    console.log('scrollToPosition: ', position);
    this._scrollListener.stop();
    var app = this._getAppAtPosition(position);
    var elem = app.element;
    var centerOffset = this._windowWidth / 2;
    var leftOffset = parseInt(elem.style.left) + (this._cardWidth/2);
    var scrollOffset = Math.max(0, leftOffset - centerOffset);
    document.querySelector('#windows').scrollLeft = scrollOffset;
    console.log('scrollToPosition: leftOffset: %s, scrollOffset: %', centerOffset, scrollOffset);
    setTimeout(this._scrollListener.start.bind(this._scrollListener), 0);
  };
  TaskSwitcher.prototype.scrollBy = function(change, velocity, callback) {
    velocity = Math.abs(velocity);
    var elm = this.element;
    var start = elm.scrollLeft;
    var scrollLeft = start;
    var targetLeft = this.clampScrollLeft(scrollLeft + change);
    if (targetLeft == scrollLeft) {
      return;
    } else {
      change = targetLeft - scrollLeft;
    }
    // from  to
    // | --- |  // pan to left by to-from, i.e. scrollLeft += from-to

    // to    from
    // | --- |  // pan to right by from-to, i.e. scrollLeft += from-to
    console.log("scrollBy: ", change);
    var currentTime = 0,
        increment = 20;
    // FIXME, should be calculated from velocity and distance to travel
    var duration = 500;
    var animateThreshold = 0.3;
    var animateScroll = function(){
      // increment the time
      currentTime += increment;
      // find the value with the quadratic in-out easing function
      var val = ease(currentTime, start, change, duration);
      // move the document.body
      elm.scrollLeft = val;
      // do the animation unless its over
      if(currentTime < duration) {
        window.requestAnimationFrame(animateScroll);
      } else {
        if (callback && typeof(callback) === 'function') {
          // the animation is done so lets callback
          callback();
        }
      }
    };
    if (velocity >= animateThreshold) {
      animateScroll();
    } else {
      this.element.scrollLeft += change;
      if (callback && typeof(callback) === 'function') {
        callback();
      }
    }
  }

  StackManager.init();
  var taskSwitcher = new TaskSwitcher();
  taskSwitcher.init();
  taskSwitcher.show();

  exports.taskSwitcher = taskSwitcher;
})(window);


