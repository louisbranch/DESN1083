(function () {

  /* Mixin */

  function mixin(giver, receiver) {
    for (var method in giver.prototype) {
      if (receiver.prototype[method]) return;
      receiver.prototype[method] = giver.prototype[method];
    }
  }

  /* Observer */

  function Observer() { }

  Observer.prototype.listeners = function (event) {
    this._listeners = this._listeners || {};
    this._listeners[event] = this._listeners[event] || [];
    return this._listeners[event];
  };

  Observer.prototype.on = function (event, callback, context) {
    this.listeners(event).push({callback: callback, context: context});
  };

  Observer.prototype.trigger = function (event) {
    var args = [].slice.call(arguments, 1);
    var listeners = this.listeners(event);
    setTimeout(function () {
      listeners.forEach(function (listener) {
        listener.callback.apply(listener.context, args);
      });
    }, 0);
  };

  /* Match */

  function Match(options) {
    // Default initialization;
    options = options || {};
    var width = options.width || 6;
    var height = options.height || 4;

    this.guessed = 0;
    this.points = 0;
    this.misses = 0;

    this.board = new Board(this, width, height);
  }
  mixin(Observer, Match);

  Match.prototype.start = function () {
    this.trigger("start");
  };

  Match.prototype.score = function () {
    this.points += 1;
    this.trigger("score", this.points);
  };

  Match.prototype.miss = function () {
    this.misses += 1;
    this.trigger("miss", this.misses);
  };

  function MatchView(model) {
    this.model = model;
    this.model.on("start", this.render, this);
    this.model.on("score", this.renderScore, this);
    this.model.on("miss", this.renderMisses, this);
  }

  MatchView.prototype.render = function () {
    this.board = new BoardView(this.model.board);
    this.el = this.el || document.querySelector("#match-screen");
    this.el.querySelector("#match-board").appendChild(this.board.render());
  };

  MatchView.prototype.renderScore = function (score) {
    this.score = this.score || this.el.querySelector("#match-score");
    this.score.textContent = score;
  };

  MatchView.prototype.renderMisses = function (misses) {
    this.misses = this.misses || this.el.querySelector("#match-misses");
    this.misses.textContent = misses;
  };

  /* Board */

  function Board(match, width, height) {
    this.match = match;
    this.width = width;
    this.height = height;
    this.assemble();
    this.selected = null;
  }

  Board.prototype.createTiles = function () {
    var tilesNeeded = (this.width * this.height) / 2;
    var tiles = [];

    for (var i = 0; i < tilesNeeded; i++) {
      // Created two of each tile
      tiles.push(new Tile(this, i));
      tiles.push(new Tile(this, i));
    }
    return tiles;
  };

  Board.prototype.assemble =  function () {
    var tiles = this.createTiles();
    var rows = [];
    for (var i = 0; i < this.height; i++) {
      var columns = [];
      for (var j = 0; j < this.width; j++) {
        var rnd = Math.floor(Math.random() * tiles.length);
        var tile = tiles.splice(rnd, 1);
        columns.push(tile[0]);
      }
      rows.push(columns);
    }
    this.tiles = rows;
  };

  Board.prototype.select = function (tile) {
    if (!this.selected) {
      this.selected = tile;
      return;
    }
    if (this.selected === tile) return;
    this.compare(this.selected, tile);
    this.selected = null;
  };

  Board.prototype.compare = function (tileA, tileB) {
    if (tileA.id === tileB.id) {
      this.match.score();
      tileA.lock();
      tileB.lock();
    } else {
      this.match.miss();
      tileA.hide();
      tileB.hide();
    }
  };

  function BoardView(model) {
    this.model = model;
  }

  BoardView.prototype.render = function () {
    var el = document.createDocumentFragment();
    this.model.tiles.forEach(function (row) {
      var column = document.createElement("div");
      row.forEach(function (tile) {
        var view = new TileView(tile);
        column.appendChild(view.render());
      });
      el.appendChild(column);
    });
    return el;
  };

  function Tile(board, id) {
    this.board = board;
    this.id = id;
  }
  mixin(Observer, Tile);

  Tile.prototype.select = function () {
    this.board.select(this);
  };

  Tile.prototype.lock = function () {
    this.trigger("lock");
  };

  Tile.prototype.hide = function () {
    this.trigger("hide");
  };

  function TileView(model) {
    this.model = model;
    this.model.on("lock", this.freeze, this);
    this.model.on("hide", this.flipDown, this);
  }

  TileView.prototype.render = function () {
    this.el = document.createElement("span");
    this.el.onclick = this.flipUp.bind(this);
    return this.el;
  };

  TileView.prototype.flipUp = function () {
    this.el.textContent = this.model.id;
    this.el.className = "active";
    this.model.select();
  };

  TileView.prototype.flipDown = function () {
    var el = this.el;
    setTimeout(function () {
      el.textContent = "";
      el.className = "";
    }, 500);
  };

  TileView.prototype.freeze = function () {
    this.el.className = "frozen";
    this.el.onclick = null;
  };

  /* Initializing match */

  var match = new Match();
  var view = new MatchView(match);
  match.start();

}());
