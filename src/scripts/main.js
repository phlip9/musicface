var request = require('request');

jQuery.ajaxSettings.traditional = true;

window.onload = function () {
  console.log('main.js');

  var id = function(id_) {
    return document.getElementById(id_);
  };

  var toggleClass = function (toggleClass, el) {
    var current = el.className.split(/\s+/);
    var exist   = ~current.indexOf(toggleClass);
    el.className = (exist ?
      (current.splice(-exist >> 1, 1), current) :
      current.concat([toggleClass])).join(' ');
  };

  var resetState = function () {
    $('.container').hide().slideDown();
    $('#snap-a-pic').text('Oh Snap!').unbind('click').bind('click', onSnapClick).hide().fadeIn();
    $('#face-hole').hide().fadeIn();
    $('.spinner').hide();
    $('#reset').hide();
    $('#info-page').empty().hide();
    $('#spotify-container').empty().removeClass('full-opaque').hide();
    $('#black-cover').removeClass('opaque');
  };

  var canvas = id('canvas');
  var video = id('video');
  var snap = id('snap-a-pic');

  $('#reset').click(resetState);

  var faceplusplus = 'https://faceplusplus-faceplusplus.p.mashape.com/detection/detect?attribute=glass%2Cpose%2Cgender%2Cage%2Crace%2Csmiling&url=';
  var mashape_key = 'XbmNOSMyh1mshjifthNWAvBhco6np1Sn700jsn8yJcTaZwgSrv';

  var onVideo = function (stream) {
    console.log('Got video stream!');
    video.src = window.URL.createObjectURL(stream);
    video.play();
  };

  var videoError = function (err) {
    console.log('video error:', err);
  };

  var initVideo = function () {
    console.log('init video');
    navigator.getUserMedia = navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia ||
      navigator.oGetUserMedia;
    
    if (navigator.getUserMedia) {       
      console.log('have userMedia');
      navigator.getUserMedia({video: true}, onVideo, videoError);
    }
  };

  var resize = function () {
    console.log('resize W,H:', window.innerWidth, window.innerHeight);
    var vid = $('#video');
    canvas.width = vid.width();
    canvas.height = vid.height();
  };

  var faceSize = function (face) {
    var w = face.position.width;
    var h = face.position.height;
    return Math.sqrt(w*w + h*h);
  };

  var findLargestFace = function (faces) {
    if (faces === null || faces.length === 0) {
      return null;
    }
    var largest = faces[0];
    var size = faceSize(largest);
    var i;
    for (i = 1; i < faces.length; i++) {
      var size2 = faceSize(faces[i]);
      if (size2 > size) {
        largest = faces[i];
        size = size2;
      }
    }
    return largest;
  };

  var facialRecog = function (imgUrl) {
    $.ajax({
      url: faceplusplus + encodeURIComponent(imgUrl),
      method: 'GET',
      headers: {
        'X-Mashape-Key': mashape_key,
        Accept: 'application/json'
      },
      success: function (result) {
        console.log('received response from faceplusplus:', result);
        var largest = findLargestFace(result.face);
        if (largest !== null) {
          var face = largest.attribute;
          // TODO: show intermediary info page
          var options = convertFaceAttrsToEchoNest(face);
          showInfoPage(face, options);
        } else {
          console.error('no face!');
          resetState();
        }
      }
    });
  };

  var musicType = function (mood) {
    if (mood < 5) {
      return 'mellow';
    } else if (mood < 20) {
      return 'popular';
    } else if (mood < 40) {
      return 'danceable';
    } else {
      return 'high-energy';
    }
  };
  
  var showInfoPage = function (face, options) {
    $('.spinner').fadeOut();
    $('#face-hole').fadeOut();
    $('#snap-a-pic').unbind('click').bind('click', function () {
      $('#snap-a-pic').slideUp();
      $('#info-page').fadeOut();
      $('.spinner').fadeIn();
      fetchPlaylistFromFacialData(options);
    });
    $('#snap-a-pic').text('Playlist');
    var age = face.age.value - 5;
    var gender = face.gender.value;
    var race = face.race.value;
    var genres = options.genre.join(', ');
    var type = musicType(face.smiling.value);
    var html =  '<h3>~' + age + '-year-old, ' + race + ', ' + gender + '</h3>\n' +
      '<h3>Mood rating: ' + face.smiling.value + '/100</h3>\n' +
      '<h3>You might like some ' + type + ' ' + genres + ' music</h3>';
    $('#info-page').html(html).fadeIn();
  };

  var uploadImage = function (image) {
    console.log('uploading image');
    console.log(image.slice(0, 30) + '...');
    $.ajax({
      url: 'https://api.imgur.com/3/image',
      method: 'POST',
      headers: {
        Authorization: 'Client-ID 6a5400948b3b376',
        Accept: 'application/json'
      },
      data: {
        image: image,
        type: 'base64'
      },
      success: function(result) {
        console.log('received response from imgur api:', result);
        var link = result.data.link;
        console.log('imgur link:', link);
        facialRecog(link);
      }
    });
  };

  var onSnapClick = function () {
    console.log('snap a pic');
    console.log('get playlist');
    //$('#snap-a-pic').slideUp();
    $('#canvas').hide();
    $('#black-cover').addClass('opaque');
    $('.spinner').fadeIn();
    resize();
    var context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    var data = canvas.toDataURL();
    data = data.slice(data.indexOf(',') + 1);
    uploadImage(data);
  };

  var rnd = Math.random;

  var choose = function (lst) {
    var size = lst.length;
    var r = rnd();
    for (var i = 0; i < size; i++) {
      if (r <= (i + 1) / size) {
        return lst[i];
      }
    }
    return lst[size - 1];
  };

  var convertFaceAttrsToEchoNest = function (attrs) {
    var age = attrs.age.value - 5;
    var race = attrs.race.value;
    var gender = attrs.gender.value;
    var mood = attrs.smiling.value;

    var options = {};
    options.genre = [];

    options.distribution = 'focused';
    options.variety = 0.2;

    var push = function (lst) {
      options.genre.push(choose(lst));
    };

    if (race === 'Black') {
      if (gender === 'Male') {
        if (age < 30) {
          push(['hip hop', 'rap', 'electronic', 'downbeat']);
        } else {
          push(['rock \'n roll', 'jazz', 'classical']);
        }
      } else {
        if (age < 30) {
          push(['r&b', 'rap', 'pop', 'electronic']);
        } else {
          push(['classical', 'jazz', 'classical pop']);
        }
      }
    }

    if (race === 'White') {
      if (gender === 'Female') {
        if (age < 30) {
          push(['Pop', 'indie Rock', 'indie Pop', 'alternative pop rock', 'electronic']);
        } else {
          push(['disco', 'classical pop', 'classical']);
        }
      } else {
        if (age < 30) {
          push(['electronic', 'indie rock', 'house', 'rock', 'rap']);
        } else {
          push(['classical', 'jazz']);
        }
      }
    }

    if (race === 'Asian') {
      if (gender === 'Female') {
        if (age < 30) {
          push(['pop', 'indie rock', 'hip hop', 'singer-songwriter', 'r&b', 'electronic', 'k-pop']);
        } else {
          push(['classical', 'chinese classical']);
        }
      } else {
        if (age < 30) {
          push(['electronic', 'indie rock', 'rap', 'hip hop', 'alternative pop rock']);
        } else {
          push(['classical', 'chinese classical']);
        }
      }
    }

    if (mood < 5) {
      options.song_selection = 'tempo-bottom';
    } else if (mood < 20) {
      options.song_selection = 'song_hotttnesss-top';
    } else if (mood < 40) {
      options.song_selection = 'danceability-top';
    } else {
      options.song_selection = 'energy-top';
    }

    return options;
  };

  var fetchPlaylistFromFacialData = function (options) {
    options.results = 15;
    options.bucket = ['id:spotify', 'tracks'];
    options.api_key = 'AB9MQME2G5NBQPEC0';
    options.type = 'genre-radio';
    options.format = 'jsonp';
    options.limit = true;

    var url = 'http://developer.echonest.com/api/v4/playlist/static';

    console.log('Requesting playlist from echonest with options:', options);

    $.ajax({
      url: url,
      data: options,
      dataType: 'jsonp',
      success: function (data) {
        console.log('received data from echonest:', data);
        if (data.response.status.code !== 0) {
          console.error('Error:', data.response.status.message);
        } else {
          var songs = data.response.songs;
          if (!songs) {
            console.error('Could not find any songs :(');
          } else {
            var frame = getSpotifyPlayButtonForPlaylist('MusicFace', songs);
            $('#spotify-container').append(frame);
            $('#spotify-container').show().addClass('full-opaque');
            $('.spinner').fadeOut();
            $('#face-hole').fadeOut();
            $('#reset').removeClass('hidden').slideDown();
          }
        }
      }, error: function(jqXHR, textStatus, errorThrown) {
        console.error('Uncaught error:', textStatus, ';', errorThrown);
      }
    });
  };

  /* Tools for making working with the Spotify and Echo Nest APIs easier */
  function getSpotifyPlayButtonForPlaylist(title, playlist) {
    var embed = '<iframe src="https://embed.spotify.com/?uri=spotify:trackset:PREFEREDTITLE:TRACKS&theme=white" style="width:50rem; height:55rem;" frameborder="0" allowtransparency="true"></iframe>';
    var tids = [];
    playlist.forEach(function(song) {
      var tid = fidToSpid(song.tracks[0].foreign_id);
      tids.push(tid);
    });
    var tracks = tids.join(',');
    var tembed = embed.replace('TRACKS', tracks);
    tembed = tembed.replace('PREFEREDTITLE', title);
    var li = $("<span>").html(tembed);
    return $("<span>").html(tembed);
  }

  /* converts full URI to just the simple spotify id */

  function fidToSpid(fid) {
    var fields = fid.split(':');
    return fields[fields.length - 1];
  }

  function getSpotifyPlayer(inPlaylist, callback) {
    var curSong = 0;
    var audio = null;
    var player = createPlayer();
    var playlist = null;

    function addSpotifyInfoToPlaylist() {
      var tids = [];
      inPlaylist.forEach(function(song) {
        var tid = fidToSpid(song.tracks[0].foreign_id);
        tids.push(tid);
      });

      $.getJSON("https://api.spotify.com/v1/tracks/", {
        'ids': tids.join(',')
      })
      .done(function(data) {
        console.log('sptracks', tids, data);
        data.tracks.forEach(function(track, i) {
          inPlaylist[i].spotifyTrackInfo = track;
        });

        console.log('inPlaylist', inPlaylist);
        playlist = filterSongs(inPlaylist);
        showCurSong(false);
        callback(player);
      })
      .error(function() {
        info("Whoops, had some trouble getting that playlist");
      });
    }

    function filterSongs(songs) {
      var out = [];

      function isGoodSong(song) {
        return song.spotifyTrackInfo.preview_url !== null;
      }

      songs.forEach(function(song) {
        if (isGoodSong(song)) {
          out.push(song);
        }
      });

      return out;
    }

    function showSong(song, autoplay) {
      $(player).find(".sp-album-art").attr('src', getBestImage(song.spotifyTrackInfo.album.images, 300).url);
      $(player).find(".sp-title").text(song.title);
      $(player).find(".sp-artist").text(song.artist_name);
      audio.attr('src', song.spotifyTrackInfo.preview_url);
      if (autoplay) {
        audio.get(0).play();
      }
    }


    function getBestImage(images, maxWidth) {
      var best = images[0];
      images.reverse().forEach(

        function(image) {
          if (image.width <= maxWidth) {
            best = image;
          }
        });
        return best;
    }

    function showCurSong(autoplay) {
      showSong(playlist[curSong], autoplay);
    }

    function nextSong() {
      if (curSong < playlist.length - 1) {
        curSong++;
        showCurSong(true);
      } else {}
    }

    function prevSong() {
      if (curSong > 0) {
        curSong--;
        showCurSong(true);
      }
    }

    function togglePausePlay() {
      console.log('tpp', audio.get(0).paused);
      if (audio.get(0).paused) {
        audio.get(0).play();
      } else {
        audio.get(0).pause();
      }
    }

    function createPlayer() {
      var main = $("<div class='sp-player'>");
      var img = $("<img class='sp-album-art'>");
      var info = $("<div class='sp-info'>");
      var title = $("<div class='sp-title'>");
      var artist = $("<div class='sp-artist'>");
      var controls = $("<div class='btn-group sp-controls'>");

      var next = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-forward"></span></button>');
      var prev = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-backward"></span></button>');
      var pausePlay = $('<button class="btn btn-primary btn-sm" type="button"><span class="glyphicon glyphicon-play"></span></button>');


      audio = $("<audio>");
      audio.on('pause', function() {
        var pp = pausePlay.find("span");
        pp.removeClass('glyphicon-pause');
        pp.addClass('glyphicon-play');
      });

      audio.on('play', function() {
        var pp = pausePlay.find("span");
        pp.addClass('glyphicon-pause');
        pp.removeClass('glyphicon-play');
      });

      audio.on('ended', function() {
        console.log('ended');
        nextSong();
      });

      next.on('click', function() {
        nextSong();
      });

      pausePlay.on('click', function() {
        togglePausePlay();
      });

      prev.on('click', function() {
        prevSong();
      });


      info.append(title);
      info.append(artist);

      controls.append(prev);
      controls.append(pausePlay);
      controls.append(next);

      main.append(img);
      main.append(info);
      main.append(controls);

      main.bind('destroyed', function() {
        console.log('player destroyed');
        audio.pause();
      });
      return main;
    }

    addSpotifyInfoToPlaylist();
    return player;
  }

  resetState();
  resize();
  initVideo();

  window.onresize = resize;
};

