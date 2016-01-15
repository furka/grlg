(function () {
  'use strict';

  //Shuffle an array, courtesy of https://stackoverflow.com/a/6274381
  function shuffle (o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  //ensures a value is a number between 0 and 1
  function percent (x) {
    x = parseFloat(x) || 0;
    x = Math.max(0, x);
    x = Math.min(1, x);
    return x;
  }

  var CARDINAL_DIRECTIONS = [
    {x: 0, y: 0 - 1}, //north
    {x: 0 + 1, y: 0}, //east
    {x: 0, y: 0 + 1}, //south
    {x: 0 - 1, y: 0}  //west
  ];
  //returns an array of open coordinates in the cardinal directions around a point
  function getOpenDirections (map, x, y, offset) {
    var output = [];
    var index;

    //offset determines which cardinal direction we will start with
    offset = parseInt(offset, 10) || Math.floor(Math.random() * 4);

    //loop through cardinal directions
    for (var i = 0, length = CARDINAL_DIRECTIONS.length; i < length; i += 1) {
      index = (i + offset) % length;

      if (typeof map.get(x + CARDINAL_DIRECTIONS[index].x, y + CARDINAL_DIRECTIONS[index].y) === 'undefined') {
        output.push(index);
      }
    }

    return output;
  }

  //returns the next index for propagation
  function grabActiveIndex (map) {
    return map._activeIndexes.splice(Math.floor(Math.random() * map._activeIndexes.length), 1)[0];
  }

  //finds a closed cell on the map that touches an empty cell and turns it into an open cell so that we can continue expanding
  function breakThrough (map) {
    var x;
    var y;
    var index;

    for (var i = map._history.length - 1; i >= 0; i -= 1) {
      index = map._history[i];
      x = index % map.width;
      y = Math.floor(index / map.height);

      if (
        x > 0 &&
        x < map.width - 1 &&
        y > 0 &&
        y < map.height - 1 &&
        getOpenDirections(map, x, y).length
      ) {
        map._cells[index] = true;
        map._activeIndexes.push(index);
        return index;
      } else {
        //remove cell from history - it won't be useful to us in the future
        map._history.splice(i, 0);
      }
    }
  }

  //propagates around a single cell
  // - picks an active cell
  // - generates its surrounding cells
  // - depending on minimum, maximum and density, the new cells will have a chance to be open or closed
  // returns false when propagation stops
  function propagate (map, minimum, maximum, density, linearity) {
    if (map.completed) {
      return false;
    }

    //determine whether we are expanding or closing off
    var expanding = map.openCount < minimum;
    var closing = maximum && map.openCount >= maximum;

    //determine whether it's safe to exit or if we need to break through a wall
    if (!map._activeIndexes.length) {
      if (expanding) {
        if (!breakThrough(map)) {
          return false; //unable to break through
        }
      } else {
        return false; //no active cells, and we have enough open ones
      }
    }

    var i;

    //pick a cell to expand
    var index = grabActiveIndex(map);
    var x = index % map.width;
    var y = Math.floor(index / map.height);

    //determine direction
    var propagationDirection = map._propagationDirections[index];
    if (Math.random() > linearity) {
      propagationDirection = undefined;
    }
    var directions = getOpenDirections(map, x, y, propagationDirection);
    var direction;

    //close cells against map borders
    closeEdges(directions, map, x, y);

    //ensure a minimum of 1 open cell when in expansion mode
    if (expanding) {
      //if our primary direction is closed, shuffle first
      if (directions[0] === undefined) {
        directions = shuffle(directions);
      }

      mandatoryCell(directions, map, x, y);
    }

    //shuffle remaining directions
    directions = shuffle(directions);

    //handle remaining cells based on density
    for (i = directions.length - 1; i >= 0; i -= 1) {
      if (directions[i] === undefined) {
        continue;
      }

      direction = CARDINAL_DIRECTIONS[directions[i]];
      if (!closing && Math.random() <= density) {
        openCell(map, direction.x + x, direction.y + y, directions[i]);
      } else {
        closeCell(map, direction.x + x, direction.y + y, directions[i]);
      }
    }

    return true;
  }

  //closes edge cells
  function closeEdges (directions, map, x, y) {
    var direction;
    for (var i = directions.length - 1; i >= 0; i -= 1) {
      direction = CARDINAL_DIRECTIONS[directions[i]];

      if (
        direction.x + x <= 0 ||
        direction.x + x >= map.width - 1 ||
        direction.y + y <= 0 ||
        direction.y + y >= map.height - 1
      ) {
        closeCell(map, direction.x + x, direction.y + y, directions[i]);
        directions[i] = undefined;
      }
    }
  }

  //attempts to open at least once cell
  function mandatoryCell (directions, map, x, y) {
    var direction;
    for (var i = 0; i < directions.length; i += 1) {
      if (directions[i] === undefined) {
        continue;
      }

      direction = CARDINAL_DIRECTIONS[directions[i]];
      openCell(map, direction.x + x, direction.y + y, directions[i]);
      directions[i] = undefined;
      return;
    }
  }

  //marks x*y coordinate as being open
  function openCell (map, x, y, offset) {
    map.openCount += 1;

    var index = x + y * map.width;

    map._cells[index] = true;
    map._propagationDirections[index] = offset;
    map._activeIndexes.push(index);
    map.last = index;

    return index;
  }

  //marks x*y coordinate as being closed
  function closeCell (map, x, y, offset) {
    var index = x + y * map.width;

    map._cells[index] = false;
    map._propagationDirections[index] = offset;
    map._history.push(index);

    return index;
  }



  //default settings for a map
  var DEFAULTS = {
    max: undefined,
    min: 20,
    speed: 1,
    linearity: 0,
    density: 0
  };

  /**
   * @param {number} width  - The width of the map
   * @param {number} height - The height of the map
   */
  var Map = function (width, height) {
    width = Math.floor(width || 0);
    height = Math.floor(height || 0);

    this.width = width;
    this.height = height;

    this._cells = [];

    //keeps a history of closed cells - used for break-through when needed
    this._history = [];

    //used during map generation
    this._activeIndexes = [];

    //used during map generation for linearity
    this._propagationDirections = [];

    //set defaults
    this.settings = {};
    for (var key in DEFAULTS) {
      this.settings[key] = DEFAULTS[key];
    }

    this.openCount = 0;

    //create start cell
    this.first = openCell(this, this.width / 2, this.height / 2);
  };

  /** @function get
   * Determines whether an x*y coordinate has an open cell
   * @param {number} x - The x coordinate
   * @param {number} y - The x coordinate
   * @return {boolean|undefined} returns true if for an open cell, false for a closed cell and undefined if no cell exists at these coordinates
   */
  Map.prototype.get = function (x, y) {
    x = Math.floor(x);
    y = Math.floor(y);

    return this._cells[x + y * this.width];
  };

  /** @function getStart
   * @return returns an object with x and y coordinates of start cell
   */
  Map.prototype.getStart = function () {
    return {
      x: this.first % this.width,
      y: Math.floor(this.first / this.height)
    };
  };

  /** @function getEnd
   * @return returns an object with x and y coordinates of end cell
   */
  Map.prototype.getEnd = function () {
    return {
      x: this.last % this.width,
      y: Math.floor(this.last / this.height)
    };
  };

  /** @function generate
   * generates X open cells based on `settings.speed`
   * Call this function in a loop until `map.completed` becomes true
   */
  Map.prototype.generate = function () {
    for (var i = 0; i < this.settings.speed && !this.completed; i += 1) {
      this.completed = !propagate(
        this,
        this.settings.min,
        this.settings.max,
        this.settings.density,
        this.settings.linearity
      );
    }

    if (this.completed) {
      this._history.length = this._propagationDirections.length = 0;
    }
  };

  /** @function generateAll
   * Asynchronously generates the entire map
   * @callback completed - Triggered when map generation is finished
   * @callback update - Triggered on every generation step
   */
  Map.prototype.generateAll = function (completed, update) {
    this.generate();

    if (typeof update === 'function') {
      update(this);
    }

    if (this.completed) {
      if (typeof completed === 'function') {
        completed(this);
      }
    } else {
      setTimeout(this.generateAll.bind(this, completed, update), 10);
    }
  };

  /** @function configure
   * Configures the map
   *
   * @param {object} [options] - Options for map generation
   * @param {number} [options.density=0] - Controls density of open cells. Value between 0 and 1. A lower value generates tunnels while a higher value generates more open space
   * @param {number} [options.linearity=0] - Controls linearity of open cells. Value between 0 and 1. The closer the value is to 1, the straighter tunnels will be
   * @param {number} [options.speed=1] - Amount of cells that will be generated each loop
   * @param {number} [options.min=20] - Minimum amount of open cells that will be generated
   * @param {number} [options.max] - Maximum amount of open cells that will be generated
   */
  Map.prototype.configure = function (options) {
    if (typeof options !== 'object') {
      return;
    }

    for (var key in this.settings) {
      this.settings[key] = options[key] || this.settings[key];
    }

    //validate settings
    this.settings.density = percent(this.settings.density);
    this.settings.linearity = percent(this.settings.linearity);
    this.settings.speed = Math.max(1, parseInt(this.settings.speed, 10) || 1);
    this.settings.min = Math.max(0, parseInt(this.settings.min, 10) || 0);
    this.settings.max = Math.max(this.settings.min, parseInt(this.settings.max, 10)) || undefined;
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
      if (typeof this._cells[i] === 'undefined') {
        continue;
      }

      x = i % this.width;
      y = Math.floor(i / this.height);

      if (i === this.first) {
        ctx.fillStyle = 'rgba(0,255,255,1)';
      } else if (i === this.last) {
        ctx.fillStyle = 'rgba(255,0,255,1)';
      } else if (this._cells[i]) {
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

  //for node.js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Map;

  //for require.js
  } else if (typeof define === 'function' && define.amd) {
    define('grlg', [], function () {
      return Map;
    });

  //for wild cowboys
  } else {
    var root = (typeof self == 'object' && self.self === self && self) ||
      (typeof global == 'object' && global.global === global && global);

    root.GRLG = Map;
  }

}());