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

