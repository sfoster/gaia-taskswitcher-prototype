(function(exports) {

  function ease(time, val, change, duration) {
    time /= duration/2;
    if (time < 1) {
      return change/2*time*time + val
    }
    time--;
    return -change/2 * (time*(time-2) - 1) + val;
  }

  function clamp(lbound, ubound, value) {
    return Math.min(ubound, Math.max(value, lbound))
  }


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
      var apps = this.apps;
      apps.sort(function(a, b) {
        return a.position >= b.position;
      });
      return apps;
    }
  };

  const GUTTER_WIDTH = 16;

  TaskSwitcher = {
    _registerEvents: function() {
    },
    _listenForScroll: function() {
    },
    _fetchElements: function() {
      var elm = this.element = document.querySelector('#windows');
      var overlay = this.overlay = document.querySelector('#cards-view');
    },
    init: function() {
      this._fetchElements();
      this._registerEvents();
      this._windowWidth = 320;
      this._cardWidth = Math.min(320, this._windowWidth);
      var stack = this.stack = StackManager.snapshot();
      var appsById = this.appsById = {};
      stack.forEach(function(app) {
        appsById[app.instanceID] = app;
      })
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

      this.previousCard = new TaskCard({ id: 'card-previous'});
      this.currentCard = new TaskCard({ id: 'card-current'});
      this.nextCard = new TaskCard({ id: 'card-next'});

      this._positionAppPreviews();
      this.currentPosition = 1; // get from stackmanager, but will normally be 1;
      this.selectAppAtIndex(this.currentPosition);
      setTimeout(this._scrollListener.start.bind(this._scrollListener), 0);
    },
    _positionAppPreviews: function() {
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
        // console.log('move appWindow to task-manager: ', appWindow, appWindow.element);
        appWindow.enterTaskManager();
        appWindow.applyStyle(style);
      }, this);
      var container = document.querySelector('#windows');
      var cardWidth = (this._cardWidth / 2) + GUTTER_WIDTH; // 50% width + GUTTER_WIDTHpx gutter

      document.querySelector('#stretcher').style.width = this._windowWidth + ((count -1) * cardWidth) + 'px';

      container.classList.add('scrollable');
    },
    selectAppAtIndex: function(position) {
      if (!position || position < 0 || position >= this.stack.length) {
        // out of bounds position, default to 0
        position = 0;
      }
      this.currentPosition = position;
      var scaledCardWidth = (this._cardWidth / 2);
      this.scrollToPosition(position);
      // this.overlay.style.left = this._getAppAtPosition(position).element.style.left;
      // console.log('overlay left:: ', this._getAppAtPosition(position).element.style.left);
      console.log('selectAppAtIndex: ', position);
      this.previousCard.update(this.stack[position - 1], position - 1);
      this.currentCard.update(this.stack[position], position);
      this.nextCard.update(this.stack[position + 1], position + 1);
    },
    removeCard: function(card) {

    },
    closeApp: function(app, removeImmediately) {
      // not implemented yet
      return;
      app.killApp(); // will remove its appWindow and element
      var position = this.stack.indexOf(app);
      var lastIndex = this.stack.length - 1;
      if (position > -1) {
        // TODO: check spec for how to animate?
        // positioning after removing an app /should/ be cheap,
        this._positionAppPreviews();
        this.selectAppAtIndex(Math.min(position, lastIndex));
      }
    },

    _scrollInProgress: function() {
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
    },
    _notScrolling: function() {
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
    },
    _getAppAtPosition: function(position) {
      return this.stack[position];
    },
    _getNearestPositionFromScrollOffset: function(offset) {
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
    },
    _calculateCardPosition: function(position) {
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
    },
    applyStyle: function(elm, props) {
      var style = elm.style;
      for (var name in props) {
        style[name] = props[name];
      }
    },
    applyCardStyle: function(card, props) {
      var cardStyle = card.style;
      var appWindowElement = document.querySelector('.appWindow[data-position="' + card.dataset.position + '"]' );
      var appWindowStyle = appWindowElement.style;
      for (var name in props) {
        if (name == 'left' ) {
          appWindowStyle.left = props[name];
        }
        cardStyle[name] = props[name];
      }
    },
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'scroll' :
          this._scrollInProgress();
      }
    },
    scrollToPosition: function(position) {
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
    },
    scrollBy: function(change, velocity, callback) {
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
  };

  // WIP scroll controller for the strip of cards that is TaskSwitcher
  // hopefully not needed as we'll use native scrolling
  CardStripScrollController = {
    init: function() {
      this._registerEvents();
    },
    _registerEvents: function() {
      this.element.addEventListener('touchstart', this, false);
      this.element.addEventListener('mousedown', this, false);
    },
    handleEvent: function(evt) {
      switch (evt.type) {
        case 'mousedown':
        case 'touchstart':
          this.onTouchStart(evt);
          break;
        case 'mousemove':
        case 'touchmove':
          this.onTouchMove(evt);
          break;
        case 'mouseup':
        case 'touchend':
          this.onTouchEnd(evt);
          break;
      }
    },
    onTouchStart: function(evt) {
      // start panning
      if (this._gesture) {
        this._gesture.end();
      }
      this.clampScrollLeft = clamp.bind(null, 0, this.element.scrollLeftMax)

      var origin = this.element.scrollLeft;
      this._gesture = {
        origin: origin,
        from: evt.clientX,
        to: evt.clientX,
        lastTimestamp: evt.timeStamp,
        timeStamp: evt.timeStamp,
        vel: 0
      };
      this.element.addEventListener('touchend', this, false);
      this.element.addEventListener('touchmove', this, false);
      this.element.addEventListener('mousemove', this, false);
      this.element.addEventListener('mouseup', this, false);
      // in case we miss the touchend event
      this._gestureTimeout = setTimeout(this.onTouchEnd.bind(this), 500);
    },
    onTouchMove: function(evt) {
      var gesture = this._gesture;
      if (!this._gesture) {
        return;
      }
      var elapsed = evt.timeStamp - gesture.lastTimestamp;
      var change = gesture.to - evt.clientX;
      gesture.velocity = change/elapsed;
      gesture.lastTimestamp = gesture.timeStamp,
      gesture.to = evt.clientX
      gesture.timeStamp = evt.timeStamp
      // console.log('move: ', gesture);
      // in case we miss the touchend event
      clearTimeout(this._gestureTimeout);
      this._gestureTimeout = setTimeout(this.onTouchEnd.bind(this), 500);
      this.parent.scrollBy(change, gesture.velocity);
    },
    onTouchEnd: function(evt) {
      var gesture = this._gesture;
      if (!gesture) {
        return;
      }
      clearTimeout(this._gestureTimeout);
      console.log('end: ', evt, ' moved: ' + Math.abs(gesture.origin - gesture.to), gesture.velocity);
      this._gesture = null;
      this.element.removeEventListener('touchend', this, false);
      this.element.removeEventListener('touchmove', this, false);
      this.element.removeEventListener('mousemove', this, false);
      this.element.removeEventListener('mouseup', this, false);

      var momentumVelocityThreshold = 0.3;
      var x = this.element.scrollLeft;
      if(Math.abs(gesture.velocity) > momentumVelocityThreshold) {
        x += gesture.velocity * 0.25 * 250;
      }
      var nextSnapPoint = Math.round(x / 250) * 250;
      this.scrollBy(nextSnapPoint - this.element.scrollLeft, gesture.velocity);
      console.log('snapped to: ', nextSnapPoint);
    }
  };

  StackManager.init();
  TaskSwitcher.init();

  exports.TaskSwitcher = TaskSwitcher;
})(window);


