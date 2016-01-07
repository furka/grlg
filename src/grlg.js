(function () {
  'use strict';

  /**
   * Helper function to shuffle an array, courtesy of https://stackoverflow.com/a/6274381
   * @private
   * @param {Array} o - The array that will be shuffled
   * @return {Array} The shuffled array
   **/
  function shuffle (o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  /**
   * A map will be composed out of cells
   * @constructs Map
   * @param {number} width  - The width of the map
   * @param {number} height - The height of the map
   */
  var Map = function (width, height) {
    width = Math.floor(width || 0);
    height = Math.floor(height || 0);

    this.width = width;
    this.height = height;

    /** @private Keeps track of cell instances */
    this._cells = [];

    /** @private Keeps track of which cells are open */
    this._openCells = [];

    /** @private Array of indexes of active cells */
    this._activeIndexes = [];
  };

  /**
   * Get the object stored at x*y coordinates
   * @param {number} x - The x coordinate
   * @param {number} y - The x coordinate
   * @return The object stored at these coordinates. By default these will return an object like `{x: 0, y: 0}`. If the `open` or `close` function of a Map instance have been overwritten, then it this will return whatever type of object was created by them.
   */
  Map.prototype.get = function (x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    return this._cells[x + y * this.width];
  };

  /**
   * Determines whether an x*y coordinate has an open cell
   * @param {number} x - The x coordinate
   * @param {number} y - The x coordinate
   * @return {boolean} returns true if these coordinate hold an open cell
   */
  Map.prototype.isOpen = function (x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    return !!this._openCells[x + y * this.width];
  };

  var CARDINAL_DIRECTIONS = [
    {x: 0 + 1, y: 0},
    {x: 0, y: 0 + 1},
    {x: 0 - 1, y: 0},
    {x: 0, y: 0 - 1}
  ];
  Map.prototype._getOpenDirections = function (x, y) {
    var output = [];

    for (var i = 0; i < CARDINAL_DIRECTIONS.length; i += 1) {
      if (!this.get(x + CARDINAL_DIRECTIONS[i].x, y + CARDINAL_DIRECTIONS[i].y)) {
        output.push({
          x: x + CARDINAL_DIRECTIONS[i].x,
          y: y + CARDINAL_DIRECTIONS[i].y
        });
      }
    }

    return output;
  };

  Map.prototype._grabActiveIndex = function () {
    return this._activeIndexes.splice(Math.floor(Math.random() * this._activeIndexes.length), 1)[0];
  };

  Map.prototype.open = function (x, y) {
    return {x: x, y: y};
  };

  Map.prototype.close = Map.prototype.open;

  Map.prototype._open = function (x, y) {
    this.openCount += 1;

    var index = x + y * this.width;

    this._cells[index] = this.open(x, y);
    this._openCells[index] = true;
    this._activeIndexes.push(index);
    this.last = index;

    return index;
  };

  Map.prototype._close = function (x, y) {
    var index = x + y * this.width;

    this._cells[index] = this.close(x, y);

    return index;
  };

  Map.prototype.generate = function (options, callback, update) {
    options = options || {};

    //determines the density of open cells
    //value between 0 and 1
    //a lower value means more tunnels, a higher value means more open space
    options.density = Number(options.density) || 0;
    options.density = Math.max(0, options.density);
    options.density = Math.min(1, options.density);

    //determines how many cells will be placed on each iteration
    //a higher value goes more quickly but could cause the browser to hang
    options.speed = parseInt(options.speed, 10)|| 1;

    options.min = parseInt(options.min, 10) || 20;
    options.max = parseInt(options.max, 10);
    options.max = Math.max(options.min, options.max);

    //reset all arrays
    this._activeIndexes.length = this._openCells.length = this._cells.length = 0;
    this.openCount = 0;

    //create start cell
    this.first = this._open(this.width / 2, this.height / 2);

    //kick off generator
    this._generateStep(options, callback, update);
  };

  Map.prototype._generateStep = function (options, callback, update) {
    for (var i = 0; i < options.speed; i += 1) {
      this._propagate(options.min, options.max, options.density);
    }

    if (this._activeIndexes.length) {
      setTimeout(this._generateStep.bind(this, options, callback, update, true), 10);
    } else if (typeof callback === 'function') {
      callback(this);
    }

    if (typeof update === 'function') {
      update(this);
    }
  };
  Map.prototype._propagate = function (minimum, maximum, density) {
    if (!this._activeIndexes.length) {
      return;
    }

    var i;

    //determine whether we are expanding or closing off
    var expanding = this.openCount < minimum;
    var closing = maximum && this.openCount >= maximum;

    //pick a random cell from our set of active cells
    var index = this._grabActiveIndex();
    var x = index % this.width;
    var y = Math.floor(index / this.height);

    //get available directions
    var directions = this._getOpenDirections(x, y);

    //close cell against borders
    for (i = directions.length - 1; i >= 0; i -= 1) {
      if (
        directions[i].x === 0 ||
        directions[i].x === this.width - 1 ||
        directions[i].y === 0 ||
        directions[i].y === this.height - 1
      ) {
        this._close(directions[i].x, directions[i].y);
        directions.splice(i, 1);
      }
    }

    if (!directions.length) {
      return;
    }

    //shuffle remaining
    directions = shuffle(directions);

    //ensure at least one is open when expanding
    if (expanding) {
      this._open(directions[0].x, directions[0].y);
      directions.splice(0, 1);
    }

    //handle remaining directions normally
    for (i = directions.length - 1; i >= 0; i -= 1) {
      if (!closing && Math.random() <= density) {
        this._open(directions[i].x, directions[i].y);
      } else {
        this._close(directions[i].x, directions[i].y);
      }
    }
  };

  /** @function print
   * returns a canvas element with visual representation of the map
   *
   * @param {Number} [size=5] - Pixel size of each cell
   * @param {Object} [canvas] - Canvas element to draw into, a new element will be created if omitted
   * @returns {Object} The canvas on which the map was printed
   */
  Map.prototype.print = function (size, canvas) {
    canvas = canvas || document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var x;
    var y;

    size = size || 5;

    canvas.width = this.width * size;
    canvas.height = this.height * size;

    ctx.strokeStyle = 'rgba(200,200,200,1)';

    for (var i = 0; i < this._cells.length; i += 1) {
      if (!this._cells[i]) {
        continue;
      }

      x = i % this.width;
      y = Math.floor(i / this.height);

      if (i === this.first) {
        ctx.fillStyle = 'rgba(0,255,255,1)';
      } else if (i === this.last) {
        ctx.fillStyle = 'rgba(255,0,255,1)';
      } else if (this.isOpen(x, y)) {
        ctx.fillStyle = 'rgba(255,255,255,1)';
      } else {
        ctx.fillStyle = 'rgba(50,50,50,1)';
      }

      ctx.fillRect(x * size, y * size, size, size);

      if (size > 3) {
        ctx.strokeRect(x * size+0.5, y * size+0.5, size, size);
      }
    }

    return canvas;
  };

  define([], function () { return Map; });

}());