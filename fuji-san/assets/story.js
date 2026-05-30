/* global mapConfig, mapboxgl, scrollama */

function showMapIssue(message) {
  var existing = document.getElementById("map-error");
  if (existing) {
    existing.textContent = message;
    return;
  }
  var banner = document.createElement("div");
  banner.id = "map-error";
  banner.textContent = message;
  document.body.appendChild(banner);
}

function alignClass(alignment) {
  if (alignment === "left") return "lefty";
  if (alignment === "right") return "righty";
  return "centered";
}

function formatModalTime(timeStr) {
  if (!timeStr) return "";
  var parts = timeStr.split(":");
  var h = parseInt(parts[0], 10);
  var m = parts[1] || "00";
  var ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return h + ":" + m + " " + ampm;
}

function formatModalDate(dateStr) {
  if (!dateStr) return "";
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var parts = dateStr.split("-");
  var day = parseInt(parts[2], 10);
  var month = months[parseInt(parts[1], 10) - 1];
  var year = parts[0];
  return day + " " + month + ", " + year;
}

function createImageModal() {
  var imageWidthCache = {};
  var modal = document.createElement("div");
  modal.id = "image-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Fullscreen image viewer");

  var card = document.createElement("div");
  card.id = "image-modal-card";

  var inner = document.createElement("div");
  inner.id = "image-modal-inner";
  card.appendChild(inner);

  var image = document.createElement("img");
  image.id = "image-modal-img";
  image.alt = "";
  inner.appendChild(image);

  var meta = document.createElement("div");
  meta.id = "image-modal-meta";
  inner.appendChild(meta);

  var note = document.createElement("p");
  note.id = "image-modal-note";
  inner.appendChild(note);

  modal.appendChild(card);

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    image.src = "";
    image.alt = "";
    meta.innerHTML = "";
    note.textContent = "";
    inner.style.maxWidth = "";
    card.style.removeProperty("--polaroid-tilt");
  }

  function openModal(src, alt, imageNote, imageMeta) {
    var tilt = (Math.random() * 10 - 5).toFixed(2) + "deg";
    card.style.setProperty("--polaroid-tilt", tilt);
    inner.style.maxWidth = "";
    image.src = src;
    image.alt = alt || "Fullscreen image";
    note.textContent = imageNote || "";
    meta.innerHTML = "";
    if (imageWidthCache[src]) {
      inner.style.maxWidth = imageWidthCache[src] + "px";
    } else {
      function clampToImageWidth() {
        if (image.offsetWidth > 0) {
          imageWidthCache[src] = image.offsetWidth;
          inner.style.maxWidth = image.offsetWidth + "px";
        }
      }
      image.onload = clampToImageWidth;
      requestAnimationFrame(clampToImageWidth);
    }
    if (imageMeta && imageMeta.location) {
      var locEl = document.createElement("em");
      locEl.textContent = imageMeta.location;
      meta.appendChild(locEl);
      var timeStr = formatModalTime(imageMeta.timeTaken);
      var dateStr = formatModalDate(imageMeta.dateTaken);
      if (timeStr || dateStr) {
        var sep = document.createTextNode(" · ");
        meta.appendChild(sep);
        var dt = [timeStr, dateStr].filter(Boolean).join(" · ");
        meta.appendChild(document.createTextNode(dt));
      }
    }
    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
  }

  modal.addEventListener("click", closeModal);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  document.body.appendChild(modal);

  return { openModal: openModal, closeModal: closeModal };
}

function enableGalleryDrag(gallery) {
  var isDown = false;
  var startX = 0;
  var scrollLeft = 0;
  var dragged = false;

  gallery.addEventListener("mousedown", function (event) {
    isDown = true;
    dragged = false;
    gallery.classList.add("is-dragging");
    startX = event.pageX - gallery.offsetLeft;
    scrollLeft = gallery.scrollLeft;
  });

  gallery.addEventListener("mouseleave", function () {
    isDown = false;
    gallery.classList.remove("is-dragging");
  });

  gallery.addEventListener("mouseup", function () {
    isDown = false;
    gallery.classList.remove("is-dragging");
  });

  gallery.addEventListener("mousemove", function (event) {
    if (!isDown) return;
    event.preventDefault();
    var x = event.pageX - gallery.offsetLeft;
    if (Math.abs(x - startX) > 6) dragged = true;
    var walk = (x - startX) * 1.2;
    gallery.scrollLeft = scrollLeft - walk;
  });

  gallery.addEventListener(
    "click",
    function (event) {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    },
    true
  );
}

function parseCsvLine(line) {
  var result = [];
  var inQuote = false;
  var current = "";
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function makeArrowEl() {
  var el = document.createElement("div");
  el.className = "arrow-marker";
  el.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30">' +
    '<polygon points="11,1 21,29 11,22 1,29" fill="#00449E" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>' +
    "</svg>";
  return el;
}

function getChapterFilenames(chapter) {
  return (chapter.images || []).map(function (imageItem) {
    return typeof imageItem === "string" ? imageItem : imageItem.src;
  });
}

async function init() {
  if (window.location.protocol === "file:") {
    showMapIssue(
      "Map disabled on file://. Run a local server (e.g., python3 -m http.server 8000) and open http://localhost:8000."
    );
    return;
  }

  if (typeof mapboxgl === "undefined") {
    showMapIssue("Mapbox GL JS failed to load. Check internet access and script URL.");
    return;
  }
  if (typeof scrollama === "undefined") {
    showMapIssue("Scrollama failed to load. Check internet access and script URL.");
    return;
  }

  var chaptersData, metadataCsv;
  try {
    [chaptersData, metadataCsv] = await Promise.all([
      fetch("assets/chapters.json").then(function (r) { return r.json(); }),
      fetch("assets/metadata.csv").then(function (r) { return r.text(); })
    ]);
  } catch (err) {
    showMapIssue("Failed to load data: " + err.message);
    return;
  }

  // Build filename → { description, lat, lon, bearingToFuji, location, dateTaken, timeTaken } lookup
  var metaLookup = {};
  var csvLines = metadataCsv.trim().split("\n");
  if (csvLines.length > 1) {
    var headers = parseCsvLine(csvLines[0]);
    var latIdx = headers.indexOf("lat");
    var lonIdx = headers.indexOf("lon");
    var bearingIdx = headers.indexOf("bearing_to_fuji_deg");
    var descIdx = headers.indexOf("description");
    var locationIdx = headers.indexOf("location");
    var dateIdx = headers.indexOf("date_taken");
    var timeIdx = headers.indexOf("time_taken");
    csvLines.slice(1).forEach(function (line) {
      var parts = parseCsvLine(line);
      var filename = parts[0] ? parts[0].trim() : "";
      if (!filename) return;
      metaLookup[filename] = {
        description: descIdx >= 0 ? (parts[descIdx] || "").trim() : "",
        lat: latIdx >= 0 ? parseFloat(parts[latIdx]) : NaN,
        lon: lonIdx >= 0 ? parseFloat(parts[lonIdx]) : NaN,
        bearingToFuji: bearingIdx >= 0 ? parseFloat(parts[bearingIdx]) : NaN,
        location: locationIdx >= 0 ? (parts[locationIdx] || "").trim() : "",
        dateTaken: dateIdx >= 0 ? (parts[dateIdx] || "").trim() : "",
        timeTaken: timeIdx >= 0 ? (parts[timeIdx] || "").trim() : ""
      };
    });
  }

  var config = Object.assign({}, mapConfig, chaptersData);

  var features = document.getElementById("features");
  var header = document.getElementById("header");
  var footer = document.getElementById("footer");

  if (config.title) {
    var titleEl = document.createElement("h1");
    titleEl.textContent = config.title;
    header.appendChild(titleEl);
  }
  if (config.subtitle) {
    var subtitleEl = document.createElement("h2");
    subtitleEl.textContent = config.subtitle;
    header.appendChild(subtitleEl);
  }
  if (!header.textContent.trim()) {
    header.style.display = "none";
  }

  config.chapters.forEach(function (record, idx) {
    var container = document.createElement("section");
    container.setAttribute("id", record.id);
    container.className = "step " + alignClass(record.alignment);
    if (idx === 0) container.classList.add("active");

    if (record.title) {
      var chapterTitle = document.createElement("h3");
      chapterTitle.textContent = record.title;
      container.appendChild(chapterTitle);
    }

    if (Array.isArray(record.images) && record.images.length) {
      var gallery = document.createElement("div");
      gallery.className = "chapter-gallery";
      record.images.forEach(function (imageItem, imageIndex) {
        var filename = typeof imageItem === "string" ? imageItem : imageItem.src;
        var meta = metaLookup[filename] || {};
        var note =
          typeof imageItem === "object" && imageItem.note
            ? imageItem.note
            : meta.description || "";
        var src = "assets/jpg/" + filename;

        var figure = document.createElement("figure");
        figure.className = "chapter-gallery-item";
        figure.dataset.filename = filename;
        var tiltDeg = (Math.random() * 6 - 3).toFixed(1);
        figure.style.setProperty("--thumb-tilt", tiltDeg + "deg");

        var galleryImage = document.createElement("img");
        galleryImage.src = src;
        galleryImage.alt = (record.title || record.id) + " photo " + (imageIndex + 1);
        galleryImage.loading = "lazy";
        galleryImage.dataset.note = note;
        galleryImage.dataset.location = meta.location || "";
        galleryImage.dataset.dateTaken = meta.dateTaken || "";
        galleryImage.dataset.timeTaken = meta.timeTaken || "";
        figure.appendChild(galleryImage);
        gallery.appendChild(figure);
      });
      enableGalleryDrag(gallery);
      container.appendChild(gallery);
    } else if (record.image) {
      var filename = typeof record.image === "string" ? record.image : record.image.src;
      var meta = metaLookup[filename] || {};
      var singleImage = document.createElement("img");
      singleImage.src = "assets/jpg/" + filename;
      singleImage.alt = record.title || record.id;
      singleImage.dataset.note = meta.description || record.imageNote || "";
      singleImage.dataset.location = meta.location || "";
      singleImage.dataset.dateTaken = meta.dateTaken || "";
      singleImage.dataset.timeTaken = meta.timeTaken || "";
      container.appendChild(singleImage);
    }

    if (record.description) {
      var chapterDescription = document.createElement("p");
      chapterDescription.textContent = record.description;
      container.appendChild(chapterDescription);
    }

    if (record.hidden) container.style.visibility = "hidden";
    features.appendChild(container);
  });

  var imageModal = createImageModal();
  Array.prototype.forEach.call(features.querySelectorAll("img"), function (img) {
    img.classList.add("zoomable-image");
    img.addEventListener("click", function () {
      var imageMeta = {
        location: img.dataset.location || "",
        dateTaken: img.dataset.dateTaken || "",
        timeTaken: img.dataset.timeTaken || ""
      };
      imageModal.openModal(img.src, img.alt, img.dataset.note || "", imageMeta);
    });
  });

  if (config.byline) {
    var bylineEl = document.createElement("p");
    bylineEl.textContent = config.byline;
    footer.appendChild(bylineEl);
  }
  var backLink = document.createElement("a");
  backLink.className = "back-link";
  backLink.href = "../";
  backLink.textContent = "View more photo-graphs";
  footer.appendChild(backLink);
  if (config.footer) {
    var footerText = document.createElement("p");
    footerText.innerHTML = config.footer;
    footer.appendChild(footerText);
  }
  if (!footer.textContent.trim()) {
    footer.style.display = "none";
  }

  mapboxgl.accessToken = config.accessToken;

  var map = window._map = new mapboxgl.Map({
    container: "map",
    style: config.style,
    center: config.chapters[0].location.center,
    zoom: config.chapters[0].location.zoom,
    bearing: config.chapters[0].location.bearing,
    pitch: config.chapters[0].location.pitch,
    interactive: false
  });

  function setLayerOpacity(opacityConfig) {
    var paintProps = {
      fill: "fill-opacity",
      "fill-extrusion": "fill-extrusion-opacity",
      line: "line-opacity",
      circle: "circle-opacity",
      symbol: "icon-opacity",
      raster: "raster-opacity"
    };
    var layer = map.getLayer(opacityConfig.layer);
    if (!layer || !paintProps[layer.type]) return;
    map.setPaintProperty(opacityConfig.layer, paintProps[layer.type], opacityConfig.opacity);
  }

  map.on("error", function (event) {
    if (event && event.error && event.error.message) {
      showMapIssue("Map error: " + event.error.message);
    } else {
      showMapIssue("Map failed to load. Check access token, style URL, and network.");
    }
  });

  var scroller = scrollama();

  map.on("load", function () {
    if (config.use3dTerrain) {
      if (!map.getSource("mapbox-dem")) {
        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14
        });
      }
      map.setTerrain({ source: "mapbox-dem", exaggeration: config.terrainExaggeration || 1.5 });
    }

    // Fuji summit marker — always visible
    var fujiEl = document.createElement("div");
    fujiEl.className = "fuji-summit-marker";
    fujiEl.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 512 512">' +
      '<path fill="#00449E" stroke="white" stroke-width="24" stroke-linejoin="round" d="M431.793,340.539c-22.579-24.188-46.288-56.09-65.735-96.994c-2.253-4.748-4.498-9.567-6.592-14.55' +
      "c-13.578-31.659-24.589-68.388-30.937-110.658l-1.53-10.289H184.994l-1.522,10.289c-6.35,42.348-17.36,79.077-30.945,110.736" +
      "c-2.166,4.984-4.34,9.81-6.584,14.472c-19.769,41.548-43.879,73.693-66.709,98.038c-21.049,22.343-41.061,38.094-55.769,48.14" +
      "c-7.314,4.984-13.341,8.601-17.438,10.932c-2.009,1.201-3.618,2.009-4.662,2.566l-1.122,0.565L0,403.952h31.502h13.586h421.826" +
      'h8.036H512C511.757,403.787,473.584,385.305,431.793,340.539z M328.528,263.471l-36.329-44.279l-36.242,44.2l-36.242-44.2' +
      'l-36.243,44.2l-12.863-15.672c15.108-33.033,27.57-71.441,35.042-115.563h100.777c7.393,44.122,19.848,82.53,34.955,115.563' +
      'L328.528,263.471z"/>' +
      "</svg>";
    new mapboxgl.Marker({ element: fujiEl, anchor: "bottom" })
      .setLngLat([138.7274, 35.3606])
      .addTo(map);

    // Create one arrow marker per photo, hidden until its chapter is active
    var photoMarkers = {};
    config.chapters.forEach(function (chapter) {
      getChapterFilenames(chapter).forEach(function (filename) {
        if (photoMarkers[filename]) return;
        var meta = metaLookup[filename];
        if (!meta || isNaN(meta.lat) || isNaN(meta.lon)) return;
        var bearing = isNaN(meta.bearingToFuji) ? 0 : meta.bearingToFuji;
        var el = makeArrowEl();
        el.style.display = "none";
        el.addEventListener("mouseenter", function () {
          document.querySelectorAll('.chapter-gallery-item[data-filename="' + filename + '"]')
            .forEach(function (fig) { fig.classList.add("thumb-active"); });
        });
        el.addEventListener("mouseleave", function () {
          document.querySelectorAll('.chapter-gallery-item[data-filename="' + filename + '"]')
            .forEach(function (fig) { fig.classList.remove("thumb-active"); });
        });
        photoMarkers[filename] = new mapboxgl.Marker({
          element: el,
          anchor: "center",
          rotation: bearing,
          rotationAlignment: "map"
        })
          .setLngLat([meta.lon, meta.lat])
          .addTo(map);
      });
    });

    function showChapterMarkers(chapter) {
      getChapterFilenames(chapter).forEach(function (filename) {
        if (photoMarkers[filename]) photoMarkers[filename].getElement().style.display = "";
      });
    }

    function hideChapterMarkers(chapter) {
      getChapterFilenames(chapter).forEach(function (filename) {
        if (photoMarkers[filename]) photoMarkers[filename].getElement().style.display = "none";
      });
    }

    scroller
      .setup({
        step: ".step",
        offset: 0.55,
        progress: true
      })
      .onStepEnter(function (response) {
        var chapter = config.chapters.find(function (chap) {
          return chap.id === response.element.id;
        });
        response.element.classList.add("active");
        if (!chapter) return;

        map.flyTo(chapter.location);
        showChapterMarkers(chapter);

        if (Array.isArray(chapter.onChapterEnter) && chapter.onChapterEnter.length) {
          chapter.onChapterEnter.forEach(setLayerOpacity);
        }

        if (chapter.rotateAnimation) {
          map.once("moveend", function () {
            var currentBearing = map.getBearing();
            map.rotateTo(currentBearing + 180, {
              duration: 12000,
              easing: function (t) { return t; }
            });
          });
        }

        if (chapter.callback && typeof window[chapter.callback] === "function") {
          window[chapter.callback]();
        }
      })
      .onStepExit(function (response) {
        var chapter = config.chapters.find(function (chap) {
          return chap.id === response.element.id;
        });
        response.element.classList.remove("active");
        if (!chapter) return;
        hideChapterMarkers(chapter);
        if (Array.isArray(chapter.onChapterExit) && chapter.onChapterExit.length) {
          chapter.onChapterExit.forEach(setLayerOpacity);
        }
      });
  });

  window.addEventListener("resize", function () {
    scroller.resize();
  });
}

init().catch(function (err) {
  showMapIssue("Failed to initialize: " + err.message);
  console.error(err);
});
