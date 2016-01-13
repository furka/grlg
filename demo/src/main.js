define([
  'jquery',
  'grlg'
], function (
  $,
  GRLG
) {
  'use strict';

  window.maps = [];

  //loads a preset
  function preset (scale, size, min, max, density, linearity, speed) {
    $('[name=block-size]').val(scale);
    $('[name=grid-width], [name=grid-height]').val(size);
    $('[name=min]').val(min);
    $('[name=max]').val(max);
    $('[name=density]').val(density).trigger('change');
    $('[name=linearity]').val(linearity).trigger('change');
    $('[name=speed]').val(speed);
  }

  //bind events
  $('button[preset]').on('click', function (event) {
    preset.apply(null, $(event.target).attr('preset').split(','));
  });
  $('button').on('click', createMap);

  //update slider label
  $('[type=range]').on('input change', function (event) {
    var name = $(event.target).attr('name');
    $('label[for=' + name + ']').text(Number($('[name=' + name + ']').val()) / 100);
  });

  //map generation function
  function createMap () {
    var canvas = document.createElement('canvas');

    $('.levels').prepend(canvas);
    $(canvas).addClass('generating');

    var width = Number($('[name=grid-width]').val());
    var height = Number($('[name=grid-height]').val());
    var min = Number($('[name=min]').val());
    var max = Number($('[name=max]').val());
    var density = Number($('[name=density]').val()) / 100;
    var linearity = Number($('[name=linearity]').val()) / 100;
    var speed = Number($('[name=speed]').val());
    var size = Number($('[name=block-size]').val());

    //create a new instance of our map
    var map = new GRLG(width, height);

    //generate map
    map.generate(
    {
      min: min,
      max: max,
      density: density,
      speed: speed,
      linearity: linearity
    },
    //done
    function () {
      $(canvas).removeClass('generating');
    },
    //update
    function () {
      map.print(size, canvas);
    });

    window.maps.push(map);
  }

  createMap();

  return ;
});