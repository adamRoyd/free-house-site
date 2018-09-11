var c = document.getElementById('canv');
var $ = c.getContext('2d');
var w = c.width = window.innerWidth;
var h = c.height = window.innerHeight;
var u = 0;

var A = function(x, y, vx, vy) {
  this._x = this.x = x;
  this._y = this.y = y;
  this.vx = vx;
  this.vy = vy;
  this.rad = Math.random() * 3;
  this.fad = f(0.92, .99);
  this.g = $.createLinearGradient(this.x, this.y, this.rad, this.x, this.y, this.rad * 2);
  this.g.addColorStop(0, 'hsla(' + u + ', 85%, 50%, .3)');
  this.g.addColorStop(.5, 'hsla(' + u + ', 85%, 50%, .6)');
  this.g.addColorStop(1, 'hsla(255, 255%, 255%, 0)');
}

A.prototype.upd = function() {
  this.x += this.vx;
  this.y += this.vy;

  var spr = Math.random() > 0.50 ? 1.0 : -1.0;
  var vx = this.vx,
    vy = this.vy;
  var _c = Math.cos(Math.PI / 97),
    _s = spr * Math.sin(Math.PI / 97);
  this.vx = vx * _c - vy * _s;
  this.vy = vx * _s + vy * _c;
  this.rad *= this.fad;
  if (this.rad < 0.3) {
    this.x = this._x;
    this.y = this._y;
    this.rad = 3;
    this.col = this.g;
  }
};
A.prototype.draw = function($) {
  $.beginPath();
  $.arc(this.x, this.y, this.rad, 0, Math.PI * 2);
  $.closePath();
  $.fillStyle = this.col;
  $.fill();
};

var B = 1800;
var a;

var set = function() {
  $.fillStyle = 'hsla(0, 0%, 12%, 1)';
  $.fillRect(0, 0, w, h);
  a = new Array(B);
  for (var i = 0; i < B; i++) {
    u -= .5;
    var v = Math.random() * rnd(10 - 5.5, 15 - 5);
    var t = Math.random() * Math.PI * 2;
    a[i] = new A(w / 2, h / 2, v * Math.cos(t * 9), v * Math.sin(t * 9));
  }
}

var rnd = function(n) {
  return Math.floor(n * Math.random());
}

var f = function(min, max) {
  return min + (Math.random() * (max - min));
}

var run = function(t) {
  window.requestAnimationFrame(run);
   for (var i = 0; i < B; i++)
    a[i].upd();

  for (var i = 0; i < B; i++)
    a[i].draw($);
}

window.addEventListener('resize', function() {
  $.clearRect(0, 0, w, h);
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  set();
}, false);

set();
run();