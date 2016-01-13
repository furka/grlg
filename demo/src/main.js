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

    var size = Number($('[name=block-size]').val());

    //create a new instance of our map
    var map = new GRLG(
        Number($('[name=grid-width]').val()),
        Number($('[name=grid-height]').val())
      );

    //configure map
    map.configure({
      min: Number($('[name=min]').val()),
      max: Number($('[name=max]').val()),
      density: Number($('[name=density]').val()) / 100,
      speed: Number($('[name=speed]').val()),
      linearity: Number($('[name=linearity]').val()) / 100
    });

    //generate map
    map.generateAll(
      function () { //done
        $(canvas).removeClass('generating');
      },
      function () { //update
        map.print(size, canvas);
      });

    window.maps.push(map);
  }

  createMap();

  return ;
});