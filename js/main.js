(function () {

  /* Game */

  function Game(options) {
    // Default initialization;
    options = options || {};
    var width = options.width || 6;
    var height = options.height || 4;
    var el = options.el || "#game-wrapper";

    this.board = new Board(width, height);
    this.el = document.querySelector(el);
    this.el.appendChild(this.board.render());
  }

  /* Board */

  function Board(width, height) {
    this.width = width;
    this.height = height;
    this.assembleTiles();
  }

  Board.prototype.createTiles = function () {
    var titlesNeeded = (this.width * this.height) / 2;
    var tiles = [];

    for (var i = 0; i < titlesNeeded; i++) {
      // Created two of each tile
      tiles.push(new Tile(i));
      tiles.push(new Tile(i));
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

  function Tile(id) {
    this.id = id;
  }

  Tile.prototype.render = function () {
    var id = this.id;
    this.el = document.createElement("span");
    this.el.textContent = id;
    this.el.onclick = function () {
      console.log(id);
    };
    return this.el;
  };

  /* Initializing game */

  new Game();

}());
