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
    snapshot: function() {
      var apps = Array.map(document.querySelectorAll('#windows .appWindow'), function(elm) {
        return {
          name: elm.dataset.position,
          position: parseInt(elm.dataset.position, 10),
          element: elm
        };
      });
      apps.sort(function(a, b) {
        return a.position >= b.position;
      });
      return apps;
    }
  };

  TaskSwitcher = {
    _registerEvents: function() {
      this.element.addEventListener('scroll', this);
    },
    _fetchElements: function() {
      var elm = this.element = document.querySelector('#windows');
      var overlay = this.overlay = document.querySelector('#cards-view');
    },
    init: function() {
      this._fetchElements();
      this._registerEvents();
      this._windowWidth = window.innerWidth;
      this._cardWidth = Math.min(320, this._windowWidth);
      var stack = this.stack = StackManager.snapshot();
      this._positionAppPreviews();
      this.selectAppAtIndex(1);
    },
    _positionAppPreviews: function() {
      var stack = this.stack;
      console.log('got stack: ', stack);
      var count = stack.length;
      // this._registerEvents();
      console.log('/init');
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
        appWindow.element.classList.add('in-taskmanager');
        appWindow.element.querySelector('span').textContent = appWindow.name;
        this.applyStyle(appWindow.element, style);
      }, this);
      var container = document.querySelector('#windows');
      var cardWidth = (this._cardWidth / 2) + 10; // 50% width + 10px gutter

      document.querySelector('#stretcher').style.width = this._windowWidth + ((count -1) * cardWidth) + 'px';

      container.classList.add('scrollable');
    },
    selectAppAtIndex: function(position) {
      var scaledCardWidth = (this._cardWidth / 2);
      this.scrollToCard(position);
      // this.overlay.style.left = this._getCardAtPosition(position).style.left;
      // console.log('overlay left:: ', this._getCardAtPosition(position).style.left);
      console.log('selectAppAtIndex: ', position);
    },
    _scrollInProgress: function() {
      if (!this._scrolling) {
        console.log('start scrolling');
        this.overlay.classList.add('scrolling');
        this._scrolling = true;
        this._scrollingTimerId = setTimeout(this._notScrolling.bind(this), 500);
      }
    },
    _notScrolling: function() {
      console.log('stop scrolling');
      this.overlay.classList.remove('scrolling');
      this._scrolling = false;
      if (this._scrollingTimerId) {
        clearTimeout(this._scrollingTimerId);
        this._scrollingTimerId = null;
      }
    },
    _getCardAtPosition: function(position) {
      var selector = '#windows .appWindow[data-position="' + position + '"]';
      var card = document.querySelector(selector);
      return card;
    },
    _calculateCardPosition: function(position) {
      var scaledCardWidth = this._cardWidth / 2;
      // scale transform-origin is center,
      // so left edge is at center minus full scaled-width
      var zeroLeft = (this._windowWidth / 2) - scaledCardWidth
      var columnWidth = scaledCardWidth + 10; // 50% width + 10px gutter
      var count = this.stack.length;
      var totalWidth = count * columnWidth;
      var left = zeroLeft + ((count - (position + 1)) * columnWidth);
      console.log('calculated zeroLeft: ' + zeroLeft, ' calculated ' + left + ' for position: ' + position);
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
    scrollToCard: function(position) {
      var card = this._getCardAtPosition(position);
      var centerOffset = this._windowWidth / 2;
      var leftOffset = parseInt(card.style.left) + (this._cardWidth/2);
      var scrollOffset = Math.max(0, leftOffset - centerOffset);
      document.querySelector('#windows').scrollLeft = scrollOffset;
      console.log('scrollToCard: leftOffset: %s, scrollOffset: %', centerOffset, scrollOffset);
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

  TaskSwitcher.init();

  exports.TaskSwitcher = TaskSwitcher;
})(window);


