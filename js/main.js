(function () {

  /* Game */

  function Game(options) {
    // Default initialization;
    options = options || {};
    var width = options.width || 6;
    var height = options.height || 4;

    this.score = 0;
    this.misses = 0;
    this.board = new Board(this, width, height);
  }

  Game.prototype.render = function () {
    this.el = document.querySelector("#game-screen");
    this.el.querySelector("#game-board").appendChild(this.board.render());
  };

  Game.prototype.increaseScore = function () {
    this.elScore = this.elScore || this.el.querySelector("#game-score");
    this.score += 1;
    this.elScore.textContent = this.score;
  };

  Game.prototype.increaseMiss = function () {
    this.elMisses = this.elMisses || this.el.querySelector("#game-misses");
    this.misses += 1;
    this.elMisses.textContent = this.misses;
  };

  /* Board */

  function Board(game, width, height) {
    this.game = game;
    this.width = width;
    this.height = height;
    this.assembleTiles();
    this.tilesGuessed = 0;
    this.tileSelected = null;
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

  Board.prototype.assembleTiles =  function () {
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

  Board.prototype.render = function () {
    var el = document.createDocumentFragment();
    this.tiles.forEach(function (row) {
      var column = document.createElement("div");
      row.forEach(function (tile) {
        column.appendChild(tile.render());
      });
      el.appendChild(column);
    });
    return el;
  };

  Board.prototype.selectTile = function (tile) {
    if (!this.tileSelected) return this.tileSelected = tile;
    if (this.tileSelected === tile) return;
    this.compareTiles(this.tileSelected, tile);
    this.tileSelected = null;
  };

  Board.prototype.compareTiles = function (a, b) {
    if (a.id === b.id) {
      this.game.increaseScore();
      a.freeze();
      b.freeze();
    } else {
      this.game.increaseMiss();
      a.hide();
      b.hide();
    }
  };

  function Tile(board, id) {
    this.board = board;
    this.id = id;
  }

  Tile.prototype.render = function () {
    this.el = document.createElement("span");
    this.el.onclick = this.show.bind(this);
    return this.el;
  };

  Tile.prototype.show = function () {
    this.el.textContent = this.id;
    this.el.className = "active";
    this.board.selectTile(this);
  };

  Tile.prototype.hide = function () {
    var el = this.el;
    setTimeout(function () {
      el.textContent = "";
      el.className = "";
    }, 500);
  };

  Tile.prototype.freeze = function () {
    this.el.className = "frozen";
    this.el.onclick = null;
  };

  /* Initializing game */

  var game = new Game();
  game.render();

}());
