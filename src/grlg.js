(function () {
  'use strict';

  //Shuffle an array, courtesy of https://stackoverflow.com/a/6274381
  function shuffle (o) {
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  }

  //ensures a value is a number between 0 and 1
  function percent (x) {
    x = Number(x) || 0;
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

    offset = parseInt(offset, 10) || Math.floor(Math.random() * 4);

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

  //triggers propagation X times based on speed and schedules next step
  function generateStep (map, options, callback, update) {
    var propagating = true;

    for (var i = 0; i < options.speed; i += 1) {
      propagating = propagating && propagate(
        map,
        options.min,
        options.max,
        options.density,
        options.linearity
      );
    }

    if (propagating) {
      setTimeout(generateStep.bind(null, map, options, callback, update, true), 10);
    } else if (typeof callback === 'function') {
      callback(map);
    }

    if (typeof update === 'function') {
      update(map);
    }
  }

  //finds a closed cell on the map that touches an empty cell and turn it into an open cell so that we can continue expanding
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
      }
    }
  }

  //propagates around a single cell
  // - picks an active cell
  // - generates its surrounding cells
  // - depending on minimum, maximum and density, the new cells will have a chance to be open or closed
  // returns false when propagation stops
  function propagate (map, minimum, maximum, density, linearity) {

    //determine whether we are expanding or closing off
    var expanding = map.openCount < minimum;
    var closing = maximum && map.openCount >= maximum;

    //determine whether it's safe to exit or if we need to break through a wall
    if (!map._activeIndexes.length) {
      if (expanding) {
        breakThrough(map);
      } else {
        return false;
      }
    }

    var i;

    //pick a cell to expand
    var index = grabActiveIndex(map);
    var x = index % map.width;
    var y = Math.floor(index / map.height);

    var propagationDirection = map._propagationDirections[index];
    if (Math.random() > linearity) {
      propagationDirection = undefined;
    }
    var d = getOpenDirections(map, x, y, propagationDirection);
    var direction;

    //close cells against map borders
    for (i = d.length - 1; i >= 0; i -= 1) {
      direction = CARDINAL_DIRECTIONS[d[i]];
      if (
        direction.x + x <= 0 ||
        direction.x + x >= map.width - 1 ||
        direction.y + y <= 0 ||
        direction.y + y >= map.height - 1
      ) {
        closeCell(map, direction.x + x, direction.y + y, d[i]);
        d.splice(i, 1);
      }
    }

    if (!d.length) {
      return true;
    }

    //ensure a minimum of 1 open cell when in expansion mode
    if (expanding) {
      direction = CARDINAL_DIRECTIONS[d[0]];
      openCell(map, direction.x + x, direction.y + y, d[0]);
      d.splice(0, 1);
    }

    //shuffle remaining
    d = shuffle(d);

    //handle remaining cells based on density
    for (i = d.length - 1; i >= 0; i -= 1) {
      direction = CARDINAL_DIRECTIONS[d[i]];
      if (!closing && Math.random() <= density) {
        openCell(map, direction.x + x, direction.y + y, d[i]);
      } else {
        closeCell(map, direction.x + x, direction.y + y, d[i]);
      }
    }

    return true;
  }

  //marks x*y coordinate as being open
  function openCell (map, x, y, offset) {
    map.openCount += 1;

    var index = x + y * map.width;

    map._cells[index] = true;
    map._propagationDirections[index] = offset;
    map._activeIndexes.push(index);
    map._history.push(index);
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

    //stores the order in which cells have been generated
    this._history = [];

    //used during map generation
    this._activeIndexes = [];

    //used during map generation for linearity
    this._propagationDirections = [];
  };

  /**
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

  /** @function generate
   * This function starts the map generation process
   *
   * @param {object} [options] - Options for map generation
   * @param {number} [options.density=0] - Controls density of open cells. Value between 0 and 1. A lower value generates tunnels while a higher value generates more open space
   * @param {number} [options.linearity=0] - Controls linearity of open cells. Value between 0 and 1. The closer the value is to 1, the straighter tunnels will be
   * @param {number} [options.speed=1] - Amount of cells that will be generated each loop
   * @param {number} [options.min=20] - Minimum amount of open cells that will be generated
   * @param {number} [options.max] - Maximum amount of open cells that will be generated
   *
   * @callback done - Called wen map is done generating
   * @callback update - Called on each iteration step
   */
  Map.prototype.generate = function (options, done, update) {
    options = options || {};

    options.density = percent(options.density);
    options.linearity = percent(options.linearity);

    //determines how many cells will be placed on each iteration
    //a higher value goes more quickly but could cause the browser to hang
    options.speed = parseInt(options.speed, 10)|| 1;

    options.min = parseInt(options.min, 10) || 20;
    options.max = parseInt(options.max, 10);
    options.max = Math.max(options.min, options.max);

    //reset all arrays
    this._activeIndexes.length = this._cells.length = 0;
    this.openCount = 0;

    //create start cell
    this.first = openCell(this, this.width / 2, this.height / 2);

    //kick off generator
    generateStep(this, options, done, update);
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

  define([], function () { return Map; });

}());