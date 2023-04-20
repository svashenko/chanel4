/**
 * подключить файл в теге <head></head> — <script src="js/custom-metrics.playerjs.js"></script>, после файла самого плеера
 * создать контейнер для плеера в нужном месте, например <div id="player"></div> 
 * задать необходимые параметры плеера в теге <script></script>, на той же странице 
 *  
 * <script>
    const metrics = new PlayerCustomMetrics('player', [
        { name: '1', button: true, player: 1, path: '../video/video.mp4', metrics: true, time: 1, text: '' },
        { name: '2', button: false, player: 2, path: '../video/video.mp4', metrics: true, autoplay: true }			
    ]);
  </script>
  *
  *'player' — id контейнера для плеера;
  * name — название видео;
  * button — true/false, добавляет кнопку скипа видео;
  * player — какой плеер playerjs нужен для данного видио;
  * path — путь к видео;
  * metrics — true/false, нужно ли выводить метрики данного видео;
  * time — врямя до скипа кнопки, если 0 — видео нельзя скипнуть;
  * text — текст внутри кнопки скипа после обратного отсчёта, если time = 0, по умолчанию "Episode will be played after the Ad"
    если time >0 — "Skip Ad";
  * autoplay — должно ли запускатся видео автоматом;
  */

class PlayerCustomMetrics {
  //? запускается единожды, создаёт свойства и запускает методы для самого плеера
  constructor(id, opt) {
    this.id = id;
    this.opt = opt;
    this.videoCounter = 0;

    this.player = document.getElementById(this.id);
    this.urlParams = new URLSearchParams(document.URL.split('?')[1]);

    this.date = new Date().toLocaleString('en-GB', { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", });

    this.defaultText = 'Skip Ad';
    this.unskipText = 'Episode will be played after the Ad';

    this.mainJson = {};
    this.typeJson = {};

    //? здесь можно явно указать поля Study_Number и Cell для метрик страницы
    //? если они не будут заданны вручную — значения будут взяты из url параметров utm_source и utm_medium соответсвенно
    //? если поля не указанны вручную и в url нет соответсвующих параметров — оба будут указаны как 0
    //? если в url отсутствует парметр utm_campaign, поле UserHash будет занят текущей датой
    // this.mainJson['Study_Number'] = ;
    // this.mainJson['Cell'] = ;
    //? здесь можно явно указать время окончания сбора метрик в секундах, иначе оно будет взято из url параметра time
    // this.time = ;

    this.visibilityPercentage = [];
    this.visibilityMetrics = setInterval(() => {
      if (document.hasFocus()) this.visibleArea(this.player, this.visibilityPercentage);
    }, 100);

    this.init();
    this.pushMetrics();
    this.leavePage('visibility share');
  }

  //? запускается при каждой итерации цикла, создаёт свойста и запускает методы для каждого нового видео в списке
  init() {
    this.isMetrics = this.opt[this.videoCounter].metrics;
    this.isButton = this.opt[this.videoCounter].button;
    this.isAutoplay = this.opt[this.videoCounter].autoplay;
    this.videoPath = this.opt[this.videoCounter].path;
    this.videoPlayer = this.opt[this.videoCounter].player;
    this.videoName = this.opt[this.videoCounter].name;
    this.secondsToSkip = this.opt[this.videoCounter].time;
    this.buttonText = this.opt[this.videoCounter].text;

    this.skipTime = 0;
    this.playbackShare = 0;
    this.clickCounter = 0;
    this.metrics = 0;

    this.audioCounter = [];
    this.wachedSecondsCounter = [];
    this.visibleplayPercentage = [];

    this.newPlayer(this.videoPath, this.videoPlayer);

    this.container = this.player.querySelector(`#oframe${this.id}`);
    this.video = this.player.querySelector('video');

    this.videoListeners();
  }

  //? события для видео, запускают отсчёт метрик
  videoListeners() {
    this.video.addEventListener('play', () => {
      this.visibleplayMetrics = setInterval(() => {
        if (document.hasFocus() && !this.video.paused) this.visibleArea(this.video, this.visibleplayPercentage);
      }, 100);

      this.playbackShare++;

      if (this.isButton) this.addButton();
    }, { once: true });
    this.video.addEventListener('timeupdate', () => {
      this.wachedSecondsCounter.push(this.video.currentTime.toFixed());

      if (this.isButton) this.updateButtonInner(this.secondsToSkip);

      this.updateAudio();
    });
    this.video.addEventListener('ended', this.endOfVideo.bind(this));

    this.container.querySelectorAll('pjsdiv').forEach(item => item.addEventListener('click', () => this.clickCounter++));
  }

  //? события для кнопки, ховер эффект и устанавливает skip time
  buttonListeners() {
    this.button.addEventListener('mouseenter', () => this.button.style.opacity = '0.9');
    this.button.addEventListener('mouseleave', () => this.button.style.opacity = '0.5');
    this.button.onclick = () => {
      this.skipTime = Number(this.video.currentTime.toFixed());
      this.clickCounter++;

      this.endOfVideo();
    }
  }

  //? метрики страницы
  mainMetrics() {
    if (this.mainJson['Study_Number']) this.mainJson['Study_Number'] = this.mainJson['Study_Number'];
    else if (this.urlParams.has('utm_source')) this.mainJson['Study_Number'] = this.urlParams.get('utm_source');
    else this.mainJson['Study_Number'] = 0;

    if (this.mainJson['Cell']) this.mainJson['Cell'] = this.mainJson['Cell'];
    else if (this.urlParams.has('utm_medium')) this.mainJson['Cell'] = this.urlParams.get('utm_medium');
    else this.mainJson['Cell'] = 0;

    if (this.urlParams.has('utm_campaign')) this.mainJson['UserHash'] = this.urlParams.get('utm_campaign');
    else this.mainJson['UserHash'] = 0;

    if (this.urlParams.has('time')) this.mainJson['Exposure_Duration'] = this.urlParams.get('time');
    this.mainJson['Page_Path'] = window.location.pathname;
    this.mainJson['Query_Parameters'] = window.location.search;
    this.mainJson['Ad_Type'] = 'Video';
    this.mainJson['Date'] = this.date;

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) this.mainJson['Ad_Device'] = 'mobile';
    else this.mainJson['Ad_Device'] = 'desktop';

    this.typeMetrics();
  }

  //? метрики типа рекламы
  typeMetrics() {
    clearInterval(this.visibilityMetrics);

    let averageVisibilityPercentage = this.findAverage(this.visibilityPercentage);
    let visibilitySeconds = this.above50Percentage(this.visibilityPercentage).length / 10;

    this.mainJson['visibility duration'] = Number(visibilitySeconds.toFixed(1));
    this.mainJson['visibility fraction'] = Number((averageVisibilityPercentage / 100).toFixed(2));

    if (visibilitySeconds > 0) this.mainJson['visibility share'] = 1;
    else this.mainJson['visibility share'] = 0;

    this.mainJson['Ad_Name'] = this.typeJson;

    if (this.isMetrics && !this.metrics) this.minorMetrics();

    const json = JSON.stringify(this.mainJson)
    console.log(this.mainJson)

  }

  //? метрики видео
  minorMetrics() {
    clearInterval(this.visibleplayMetrics);

    let minorJson = {};

    let allWatchedTime = this.trimArr(this.wachedSecondsCounter).length;
    let allVideoLenght = Number(this.video.duration.toFixed(1));
    let watchedPercentage = this.uniqueArr(this.wachedSecondsCounter).length / Number(this.video.duration.toFixed()) * 100;
    let visibleplaySeconds = this.above50Percentage(this.visibleplayPercentage).length / 10;
    let audibleplayDuration = this.uniqueArr(this.audioCounter).length

    minorJson['video_duration'] = allVideoLenght;
    minorJson['playback share'] = this.playbackShare;

    if (watchedPercentage.toFixed() >= 25) minorJson['playback 25% share'] = 1;
    else minorJson['playback 25% share'] = 0;

    if (watchedPercentage.toFixed() >= 50) minorJson['playback 50% share'] = 1;
    else minorJson['playback 50% share'] = 0;

    if (watchedPercentage.toFixed() >= 75) minorJson['playback 75% share'] = 1;
    else minorJson['playback 75% share'] = 0;

    if (watchedPercentage.toFixed() >= 99) minorJson['playback 100% share'] = 1;
    else minorJson['playback 100% share'] = 0;

    if (visibleplaySeconds) minorJson['visibleplay duration'] = Number(visibleplaySeconds.toFixed(1));
    else minorJson['visibleplay duration'] = 0;

    if ((visibleplaySeconds / allVideoLenght) >= 0.99 && minorJson['playback 100% share']) minorJson['visibleplay 100% share'] = 1;
    else minorJson['visibleplay 100% share'] = 0;

    if (audibleplayDuration > 0) minorJson['audibleplay share'] = 1;
    else minorJson['audibleplay share'] = 0;

    if (this.isButton && this.skipTime > 0) minorJson['skip_time'] = this.skipTime;
    else if (this.isButton && this.skipTime === 0) minorJson['skip_time'] = ' ';
    else if (!this.isButton) minorJson['skip_time'] = '—';

    if (this.clickCounter) minorJson['click share'] = 1;
    else minorJson['click share'] = 0;

    minorJson['All_Seconds'] = this.trimArr(this.wachedSecondsCounter);
    minorJson['Unique_Seconds'] = this.uniqueArr(this.wachedSecondsCounter);

    this.metrics++;

    this.typeJson[this.videoName] = minorJson;
  }

  //? конец цикла видео
  endOfVideo() {
    if (this.isMetrics && !this.metrics) this.minorMetrics();

    this.playerjs.api('mute');
    this.videoCounter++;

    if (this.videoCounter < this.opt.length) this.init();
  }

  //? создаёт новый и замещает старый плееры
  newPlayer(path, player) {
    if (this.isAutoplay) this.playerjs = new Playerjs({ id: this.id, file: path, player: player, autoplay: 1 });
    else this.playerjs = new Playerjs({ id: this.id, file: path, player: player, });
  }

  //? считает секунды, пока видео не замучено и не в паузе
  updateAudio() {
    let current = Number(this.video.currentTime.toFixed());

    if (!this.video.muted && !this.video.paused) this.audioCounter.push(current);
  }

  //? создаёт и добавляет кнопку скипа
  addButton() {
    this.button = document.createElement('button');

    this.styleButton();
    this.setButtonInner();
    setTimeout(() => this.container.appendChild(this.button), 300);
  }

  //? задаёт стили кнопки скипа
  styleButton() {
    this.button.style.cssText =
      'display:grid; place-content:center; position:absolute; font-size:1.125rem; padding: 10px 8px; background: #000; border: 1px solid #fff; border-right:0; bottom:10%; right:0; color:#fff; opacity:0.5; box-sizing:content-box; transition:opacity .5s cubic-bezier(0,0,0.2,1);';
    //? this.button.id = 'skip-button';
  }

  //? задаёт текст/отсчёт внутри кнопки скипа
  setButtonInner() {
    if (this.buttonText) this.buttonText = this.buttonText
    else this.buttonText = this.defaultText;

    if (this.secondsToSkip === 0) {
      this.button.innerHTML = this.unskipText;
    } else {
      this.button.innerHTML = this.secondsToSkip;
      this.button.style.padding = "10px 12px";
    }
  }

  //? обратный отсчёт кнопки скипа 
  updateButtonInner(secondsToSkip) {
    let current = Number(this.video.currentTime.toFixed());

    if (secondsToSkip === 0 && this.buttonText === this.defaultText) {
      this.button.innerHTML = this.unskipText;
    } else if (secondsToSkip === 0 && this.buttonText != this.defaultText) {
      this.button.innerHTML = this.buttonText;
    } else if (secondsToSkip <= current) {
      this.button.innerHTML = this.buttonText;
      this.button.style.cursor = 'pointer';
      this.button.style.padding = "10px 8px";
      this.buttonListeners();
    } else {
      this.button.innerHTML = secondsToSkip - current;
    }
  }

  //? стирает из массива повторяющиеся значения, которые идут подряд
  trimArr(arr) {
    let result = this.eraseZero(arr);

    for (var q = 1, i = 1; q < result.length; q++) {
      if (result[q] !== result[q - 1]) {
        result[i++] = result[q];
      }
    }

    result.length = i;
    return result;
  }

  //? стирает из массива все повторяющиеся значения 
  uniqueArr(arr) {
    let result = [];

    for (let item of arr) {
      if (!result.includes(item)) {
        result.push(item);
      }
    }

    return this.eraseZero(result);
  }

  //? стирает 0 в массивах
  eraseZero(arr) {
    return arr.filter(zero => zero != 0);
  }

  //? считает среднее арифметическое в массиве
  findAverage(arr) {
    let sum = 0;

    for (let i = 0; i < arr.length; i++) {
      sum += arr[i];
    }

    return sum / arr.length;
  }

  //? стирает из массива все числа < 50
  above50Percentage(arr) {
    let result = [];

    for (let i = 0; i < arr.length; i++) {
      if (arr[i] >= 50) result.push(arr[i])
    }

    return result;
  }

  //? записывает % видимой прощади элемента, по осям х и у, в массив
  visibleArea(el, arr) {
    let rect = el.getBoundingClientRect();
    let elementArea = (rect.width * rect.height);

    let visibleWidth = (window.innerWidth - rect.left < 0 ? 0 : window.innerWidth - rect.left)
    if (rect.left <= 0) visibleWidth = window.innerWidth;
    if (rect.right <= window.innerWidth) visibleWidth = rect.right;
    if (visibleWidth > rect.width) visibleWidth = rect.width;
    if (visibleWidth < 0) visibleWidth = 0;

    let visibleHeight = (window.innerHeight - rect.top < 0 ? 0 : window.innerHeight - rect.top)
    if (rect.top <= 0) visibleHeight = window.innerHeight;
    if (rect.bottom <= window.innerHeight) visibleHeight = rect.bottom;
    if (visibleHeight > rect.height) visibleHeight = rect.height;
    if (visibleHeight < 0) visibleHeight = 0;


    let visibleArea = visibleWidth * visibleHeight;
    let visiblePercentage = Number((visibleArea / elementArea * 100).toFixed(0));

    if (visiblePercentage >= 1) arr.push(visiblePercentage);
  }

  //? пушит json с метриками по таймеру
  pushMetrics() {
    if (this.time){
      setTimeout(() => {
        this.mainMetrics();
      }, (this.time * 1000) - 100);
    }
    else if (this.urlParams.has('time')) {
      setTimeout(() => {
        this.mainMetrics();
      }, (this.urlParams.get('time') * 1000) - 100);
    }
  }

  //? переходит по указанной в origin ссылке, по таймеру, если указанное поле не пустое
  leavePage(property) {
    let propsCounter = 0;

    if (this.urlParams.has('time') && this.urlParams.has('origin')) {
      setTimeout(() => {
        findProp(this.mainJson, property).forEach(item => {
          if (item) propsCounter++;
        });

        if (propsCounter) location = decodeURIComponent(this.urlParams.get('origin')) + '&success=1';
        else location = decodeURIComponent(this.urlParams.get('origin')) + '&success=0';
      }, this.urlParams.get('time') * 1000);
    }

    function findProp(obj, prop) {
      var result = [];
      function recursivelyFindProp(o, keyToBeFound) {
        Object.keys(o).forEach(function (key) {
          if (typeof o[key] === 'object') recursivelyFindProp(o[key], keyToBeFound);
          else if (key === keyToBeFound) result.push(o[key]);
        });
      }
      recursivelyFindProp(obj, prop);
      return result;
    }
  }
}

  // deepMerge(...sources) {
  //   let result = {}

  //   for (let source of sources) {
  //     if (source instanceof Array) {
  //       if (!(result instanceof Array)) {
  //         result = []
  //       }
  //       result = [...result, ...source]
  //     } else if (source instanceof Object) {
  //       for (let [key, value] of Object.entries(source)) {
  //         if (value instanceof Object && key in result) {
  //           value = this.deepMerge(result[key], value)
  //         }
  //         result = { ...result, [key]: value }
  //       }
  //     }
  //   }
  //   return result
  // }